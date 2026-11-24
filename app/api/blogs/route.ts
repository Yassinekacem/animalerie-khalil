import { connection } from "next/server";
import { z } from "zod";
import { Animal, Prisma } from "@/app/generated/prisma/client";
import { AuthError, authError, authJson, readAuthBody, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().regex(/^[1-9]\d{0,9}$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().max(2147483647));
const listSchema = z.strictObject({
  page: idSchema.default(1),
  category: z.enum(Animal).optional(),
  q: z.string().trim().max(200).optional(),
});
const blogSchema = z.strictObject({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(180),
  category: z.enum(Animal, "Sélectionnez un animal."),
  image: z.string().trim().max(2048).refine(value => {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloud || !URL.canParse(value)) return false;
    const url = new URL(value);
    const prefix = "/" + cloud + "/image/upload/";
    return url.origin === "https://res.cloudinary.com" && !url.username && !url.password &&
      url.pathname.startsWith(prefix) && url.pathname.length > prefix.length;
  }, "Ajoutez une image depuis le compte Cloudinary configuré."),
  content: z.string().trim().min(1, "Le contenu est obligatoire.").max(20000),
});

const pageSize = 12;

function blogId(request: Request) {
  const ids = new URL(request.url).searchParams.getAll("id");
  if (ids.length !== 1) throw new AuthError("Indiquez un identifiant d’article.", 400);
  return idSchema.parse(ids[0]);
}

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof z.ZodError || error instanceof SyntaxError) {
    return authError(error);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return authJson({ error: "Article introuvable." }, 404);
  }
  console.error("Blogs API error:", error);
  return authJson({ error: "Le service des articles est indisponible. Réessayez." }, 500);
}

export async function GET(request: Request) {
  await connection();
  try {
    const params = new URL(request.url).searchParams;
    for (const key of params.keys()) {
      if (params.getAll(key).length > 1) return authJson({ error: "Paramètre répété." }, 400);
    }
    const { page: requestedPage, category, q } = listSchema.parse(Object.fromEntries(params));
    // Treat PostgreSQL LIKE metacharacters as literal search text.
    const term = q?.replace(/[\\%_]/g, "\\$&");
    const where: Prisma.BlogWhereInput = {
      ...(category && { category }),
      ...(term && {
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { content: { contains: term, mode: "insensitive" } },
        ],
      }),
    };
    const result = await prisma.$transaction(async tx => {
      const total = await tx.blog.count({ where });
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const page = Math.min(requestedPage, totalPages);
      const blogs = total ? await tx.blog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }) : [];
      return { blogs, total, page, totalPages };
    }, { isolationLevel: "RepeatableRead" });
    return authJson(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const data = blogSchema.parse(await readAuthBody(request));
    return authJson(await prisma.blog.create({ data }), 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
    const id = blogId(request);
    const data = blogSchema.parse(await readAuthBody(request));
    return authJson(await prisma.blog.update({ where: { id }, data }));
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    await prisma.blog.delete({ where: { id: blogId(request) } });
    return authJson({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
