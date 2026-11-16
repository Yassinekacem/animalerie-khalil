import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, readAuthBody, requireUser } from "@/lib/auth";

const productSchema = z.strictObject({
  productId: z.number().int().positive().max(2147483647),
});

function handleError(error: unknown) {
  if (error instanceof AuthError || error instanceof z.ZodError || error instanceof SyntaxError) return authError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return authJson({ error: "Ce produit est déjà dans vos favoris." }, 409);
    }
    if (error.code === "P2003" || error.code === "P2025") {
      return authJson({ error: "Le produit ou le compte n’est plus disponible." }, 409);
    }
  }
  console.error("Wishlist API error:", error instanceof Error ? error.name : "UnknownError");
  return authJson({ error: "Impossible de gérer vos favoris. Veuillez réessayer." }, 500);
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { product: true },
    });
    return authJson({ products: wishlist.map(item => item.product) });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const { productId } = productSchema.parse(await readAuthBody(request));
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return authJson({ error: "Produit introuvable." }, 404);
    const wishlist = await prisma.wishlist.create({
      data: { userId: user.id, productId },
      select: { product: true },
    });
    return authJson({ message: "Produit ajouté aux favoris.", product: wishlist.product }, 201);
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    const { productId } = productSchema.parse(await readAuthBody(request));
    const result = await prisma.wishlist.deleteMany({ where: { userId: user.id, productId } });
    if (result.count === 0) return authJson({ error: "Ce produit ne figure pas dans vos favoris." }, 404);
    return authJson({ message: "Produit retiré des favoris.", productId });
  } catch (error) { return handleError(error); }
}
