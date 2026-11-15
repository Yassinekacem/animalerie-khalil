import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, publicUserSelect, requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { connection } from "next/server";

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(["ADMIN", "CLIENT"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
});

export async function GET(request: Request) {
  await connection();
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    for (const key of ["q", "role", "status", "page", "pageSize"]) {
      if (params.getAll(key).length > 1) return authJson({ error: `Paramètre répété : ${key}` }, 400);
    }
    const query = querySchema.parse(Object.fromEntries([...params].filter(([, value]) => value.trim() !== "")));
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.status) where.isActif = query.status === "active";
    if (query.q) {
      const contains = query.q.replace(/[\\%_]/g, "\\$&");
      where.OR = [{ name: { contains, mode: "insensitive" } }, { email: { contains, mode: "insensitive" } }];
    }
    const total = await prisma.user.count({ where });
    const totalPages = Math.ceil(total / query.pageSize);
    const page = Math.min(query.page, Math.max(1, totalPages));
    const users = total === 0 ? [] : await prisma.user.findMany({
      where, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * query.pageSize, take: query.pageSize,
      select: { ...publicUserSelect, sexe: true, isActif: true, createdAt: true, updatedAt: true },
    });
    return authJson({ users, total, page, totalPages, pageSize: query.pageSize });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    if (error instanceof z.ZodError) return authJson({ error: "Paramètres invalides.", issues: error.issues }, 400);
    console.error("Users API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger les utilisateurs." }, 500);
  }
}
