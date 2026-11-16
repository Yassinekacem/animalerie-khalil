import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, readAuthBody, requireUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
const reviewSchema = z.strictObject({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional().transform(value => value || null),
});
const select = {
  id: true, userId: true, productId: true, rating: true, comment: true, createdAt: true, updatedAt: true,
  user: { select: { name: true, image: true } },
} as const;

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof z.ZodError || error instanceof SyntaxError) return authError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return authJson({ error: "Vous avez déjà publié un avis sur ce produit." }, 409);
    if (error.code === "P2003" || error.code === "P2025") return authJson({ error: "Le produit ou le compte n’est plus disponible." }, 409);
  }
  console.error("Product reviews API error:", error instanceof Error ? error.name : "UnknownError");
  return authJson({ error: "Impossible de gérer les avis. Veuillez réessayer." }, 500);
}

export async function GET(_request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const product = await prisma.product.findUnique({
      where: { id },
      select: { reviews: { select, orderBy: [{ createdAt: "desc" }, { id: "desc" }] } },
    });
    if (!product) return authJson({ error: "Produit introuvable." }, 404);
    const reviews = product.reviews;
    const reviewCount = reviews.length;
    // Derive both statistics from the returned list so they always agree.
    const averageRating = reviewCount ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : null;
    return authJson({ reviews, averageRating, reviewCount });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const productId = idSchema.parse((await context.params).id);
    const data = reviewSchema.parse(await readAuthBody(request));
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return authJson({ error: "Produit introuvable." }, 404);
    const review = await prisma.review.create({ data: { ...data, userId: user.id, productId }, select });
    return authJson({ review }, 201);
  } catch (error) { return handleError(error); }
}
