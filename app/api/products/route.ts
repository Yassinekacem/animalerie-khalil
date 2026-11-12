import { Prisma, type Product as DatabaseProduct } from "@/app/generated/prisma/client";
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



const querySchema = z.object({
  q: z.string().trim().optional(),
  targetAnimal: animalSchema.optional(),
  category: z.string().trim().min(1).optional(),
  promotion: z.enum(["true", "false"]).optional(),
  brand: z.string().trim().min(1).optional(),
  minPrice: moneySchema.optional(),
  maxPrice: moneySchema.optional(),
  sort: z.enum(["newest", "price-asc", "price-desc"]).default("newest"),
  brandsOnly: z.enum(["true", "false"]).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(48)).default(12),
}).superRefine((value, ctx) => {
  if (value.category && !Object.values(categories).flat().includes(value.category)) {
    ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie inconnue." });
  } else if (value.targetAnimal && value.category && !categories[value.targetAnimal].includes(value.category)) {
    ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie incompatible avec l’animal." });
  }
  if (value.minPrice && value.maxPrice && value.minPrice.gt(value.maxPrice)) {
    ctx.addIssue({ code: "custom", path: ["maxPrice"], message: "Le maximum doit être supérieur ou égal au minimum." });
  }
});

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    for (const key of ["q", "targetAnimal", "category", "promotion", "brand", "minPrice", "maxPrice", "sort", "brandsOnly", "page", "pageSize"]) {
      if (params.getAll(key).length > 1) {
        return Response.json({ error: "Paramètre répété : " + key }, { status: 400 });
      }
    }
    const query = querySchema.parse(Object.fromEntries([...params].filter(([, value]) => value.trim() !== "")));
    if (query.brandsOnly === "true") {
      const rows = await prisma.product.findMany({
        where: { brand: { not: null } }, select: { brand: true },
        distinct: ["brand"], orderBy: { brand: "asc" },
      });
      return Response.json(rows.map(({ brand }) => brand).filter((brand): brand is string => !!brand?.trim()));
    }
    // Only SQL fragments are composed; all user values remain bound parameters.
    const conditions: Prisma.Sql[] = [];
    if (query.q) conditions.push(Prisma.sql`strpos(lower("name"), lower(${query.q}::text)) > 0`);
    if (query.targetAnimal) conditions.push(Prisma.sql`"targetAnimal"::text = ${query.targetAnimal}`);
    if (query.category) conditions.push(Prisma.sql`"category" = ${query.category}`);
    if (query.brand) conditions.push(Prisma.sql`"brand" = ${query.brand}`);
    if (query.promotion === "true") conditions.push(Prisma.sql`"promoPrice" IS NOT NULL`);
    if (query.promotion === "false") conditions.push(Prisma.sql`"promoPrice" IS NULL`);
    if (query.minPrice !== undefined) conditions.push(Prisma.sql`COALESCE("promoPrice", "price") >= ${query.minPrice.toString()}::numeric`);
    if (query.maxPrice !== undefined) conditions.push(Prisma.sql`COALESCE("promoPrice", "price") <= ${query.maxPrice.toString()}::numeric`);
    const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
    const order = query.sort === "price-asc"
      ? Prisma.sql`COALESCE("promoPrice", "price") ASC, "id" ASC`
      : query.sort === "price-desc"
        ? Prisma.sql`COALESCE("promoPrice", "price") DESC, "id" DESC`
        : Prisma.sql`"createdAt" DESC, "id" DESC`;
    // A consistent snapshot keeps the count and page aligned during concurrent writes.
    const result = await prisma.$transaction(async tx => {
      const [count] = await tx.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM "Product" ${where}`);
      const total = Number(count.total);
      const totalPages = Math.ceil(total / query.pageSize);
      const page = Math.min(query.page, Math.max(1, totalPages));
      const products = total === 0 ? [] : await tx.$queryRaw<DatabaseProduct[]>(
        Prisma.sql`SELECT * FROM "Product" ${where} ORDER BY ${order} LIMIT ${query.pageSize} OFFSET ${(page - 1) * query.pageSize}`
      );
      return { products, total, page, totalPages, pageSize: query.pageSize };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return Response.json(result);
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

