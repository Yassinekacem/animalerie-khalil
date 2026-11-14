import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const categories = {
  chien: ["alimentation", "colliers-laisses", "hygiene-soins", "jouets-divertissement", "transport", "couchage-niches", "gamelles-distributeurs"],
  chat: ["alimentation", "colliers-harnais", "hygiene-soins", "litieres-proprete", "jouets-divertissement", "transport", "couchage", "gamelles-distributeurs"],
  oiseaux: ["alimentation", "cages-accessoires", "sante-soins"],
  poissons: ["alimentation", "aquariums", "equipements", "decorations"],
};
const animalSchema = z.enum(["chien", "chat", "oiseaux", "poissons"]);

// Accept JSON numbers or decimal strings, preserving monetary precision.
const moneySchema = z.union([
  z.number().finite(),
  z.string().regex(/^\d+(?:\.\d{1,3})?$/, "Utilisez au maximum trois décimales."),
]).transform((value) => new Prisma.Decimal(value))
  .refine((value) => value.isFinite() && value.gte(0) && value.lte("9999999.999") && value.decimalPlaces() <= 3,
    "Le prix doit être positif ou nul, avec au maximum trois décimales et inférieur à 10000000.");

const fields = {
  name: z.string().trim().min(1, "Le nom est obligatoire."),
  description: z.string().trim().min(1, "La description est obligatoire."),
  brand: z.string().trim().min(1).nullable(),
  targetAnimal: animalSchema,
  category: z.string().trim().min(1),
  image: z.string(),
  price: moneySchema.refine((value) => value.gt(0), "Le prix doit être strictement positif."),
  promoPrice: moneySchema.nullable(),
  characteristics: z.record(z.string(), z.json()),
};

function checkProduct(value: { targetAnimal: z.infer<typeof animalSchema>; category: string; price: Prisma.Decimal; promoPrice: Prisma.Decimal | null }, ctx: z.RefinementCtx) {
  if (!categories[value.targetAnimal].includes(value.category)) {
    ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie incompatible avec l’animal." });
  }
  if (value.promoPrice !== null && !value.promoPrice.lt(value.price)) {
    ctx.addIssue({ code: "custom", path: ["promoPrice"], message: "Le prix promotionnel doit être inférieur au prix normal." });
  }
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) {
    return Response.json({ error: "Données invalides.", issues: error.issues }, { status: 400 });
  }
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Corps JSON incorrect." }, { status: 400 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      return Response.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (error.code === "P2003" || error.code === "P2014") {
      return Response.json({ error: "Opération refusée : le produit est lié à une commande ou à un autre enregistrement." }, { status: 409 });
    }
    if (error.code === "P2002") {
      return Response.json({ error: "Un enregistrement avec ces valeurs existe déjà." }, { status: 409 });
    }
  }
  console.error("Product API error:", error);
  return Response.json({ error: "Erreur interne du serveur." }, { status: 500 });
}

const productSchema = z.strictObject(fields).superRefine(checkProduct);
const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return Response.json({ error: "Produit introuvable." }, { status: 404 });
    return Response.json(product);
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const data = productSchema.parse(await request.json());
    const product = await prisma.product.update({
      where: { id },
      data: { ...data, characteristics: data.characteristics as Prisma.InputJsonObject },
    });
    return Response.json(product);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    // The OrderItem foreign key rejects linked deletions atomically (409).
    await prisma.product.delete({ where: { id } });
    return Response.json({ message: "Produit supprimé." });
  } catch (error) {
    return handleError(error);
  }
}

