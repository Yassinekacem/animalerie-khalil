import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, readAuthBody, requireUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
const reviewSchema = z.strictObject({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).nullable().transform(value => value || null).optional(),
}).refine(data => data.rating !== undefined || data.comment !== undefined, {
  message: "Indiquez une note ou un commentaire à modifier.",
});

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof z.ZodError || error instanceof SyntaxError) return authError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return authJson({ error: "Avis introuvable." }, 404);
  }
  console.error("Review API error:", error instanceof Error ? error.name : "UnknownError");
  return authJson({ error: "Impossible de gérer cet avis. Veuillez réessayer." }, 500);
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    const data = reviewSchema.parse(await readAuthBody(request));
    const existing = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return authJson({ error: "Avis introuvable." }, 404);
    if (existing.userId !== user.id) return authJson({ error: "Vous ne pouvez modifier que vos propres avis." }, 403);
    const review = await prisma.review.update({
      where: { id, userId: user.id },
      data,
      select: {
        id: true, userId: true, productId: true, rating: true, comment: true, createdAt: true, updatedAt: true,
        user: { select: { name: true, image: true } },
      },
    });
    return authJson({ review });
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    const existing = await prisma.review.findUnique({ where: { id }, select: { userId: true } });
    if (!existing) return authJson({ error: "Avis introuvable." }, 404);
    if (existing.userId !== user.id && user.role !== "ADMIN") return authJson({ error: "Vous ne pouvez supprimer que vos propres avis." }, 403);
    // Roles come from the authenticated database user, never from request data.
    await prisma.review.delete({ where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) } });
    return authJson({ message: "Avis supprimé.", id });
  } catch (error) { return handleError(error); }
}
