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

const productSchema = z.strictObject({
  ...fields,
  brand: fields.brand.default(null),
  image: fields.image.default(""),
  promoPrice: fields.promoPrice.default(null),
  characteristics: fields.characteristics.default({}),
}).superRefine(checkProduct);

const querySchema = z.strictObject({
  q: z.string().trim().optional(),
  targetAnimal: animalSchema.optional(),
  category: z.string().trim().min(1).optional(),
  promotion: z.enum(["true", "false"]).optional(),
}).superRefine((value, ctx) => {
  if (value.category && !(Object.values(categories).flat()).includes(value.category)) {
    ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie inconnue." });
  } else if (value.targetAnimal && value.category && !categories[value.targetAnimal].includes(value.category)) {
    ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie incompatible avec l’animal." });
  }
});

export async function GET(request: Request) {
  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const where: Prisma.ProductWhereInput = {
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
      ...(query.targetAnimal ? { targetAnimal: query.targetAnimal } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.promotion === "true" ? { promoPrice: { not: null } } : {}),
      ...(query.promotion === "false" ? { promoPrice: null } : {}),
    };
    const products = await prisma.product.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    return Response.json(products);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    const data = productSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: { ...data, characteristics: data.characteristics as Prisma.InputJsonObject },
    });
    return Response.json(product, { status: 201, headers: { Location: `/api/products/${product.id}` } });
  } catch (error) {
    return handleError(error);
  }
}

