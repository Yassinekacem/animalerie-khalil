import { randomUUID } from "node:crypto";
import { OrderStatus, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readDeliveryFee } from "@/lib/order-delivery";
import { z } from "zod";

const maxQuantity = 9999;
const maxAmount = new Prisma.Decimal("999999999999999.999");
const createSchema = z.strictObject({
  customerName: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  customerPhone: z.string().trim().min(1, "Le téléphone est obligatoire.").max(32),
  deliveryAddress: z.string().trim().min(1, "L’adresse de livraison est obligatoire.").max(1000),
  customerEmail: z.string().trim().email("Adresse e-mail invalide.").max(254).nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null).transform(value => value || null),
  items: z.array(z.strictObject({
    productId: z.number().int().positive().max(2147483647),
    quantity: z.number().int().min(1).max(maxQuantity),
  })).min(1, "La commande doit contenir au moins un article.").max(100),
}).superRefine((value, ctx) => {
  const quantities = new Map<number, number>();
  value.items.forEach((item, index) => {
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    quantities.set(item.productId, quantity);
    if (quantity > maxQuantity) {
      ctx.addIssue({ code: "custom", path: ["items", index, "quantity"], message: `La quantité cumulée d’un produit ne doit pas dépasser ${maxQuantity}.` });
    }
  });
});

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  status: z.enum(OrderStatus).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function handleError(error: unknown) {
  if (error instanceof z.ZodError) return json({ error: "Données invalides.", issues: error.issues }, 400);
  if (error instanceof SyntaxError) return json({ error: "Corps JSON incorrect." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003" || error.code === "P2014" || error.code === "P2025") {
      return json({ error: "Un produit n’est plus disponible. Rechargez le panier avant de réessayer." }, 409);
    }
    if (error.code === "P2002") return json({ error: "Une référence identique existe déjà. Veuillez réessayer." }, 409);
    if (error.code === "P2021" || error.code === "P2022") {
      return json({ error: "Le schéma des commandes n’est pas disponible. Appliquez la migration Prisma préparée." }, 503);
    }
  }
  console.error("Orders API error:", error);
  return json({ error: "Erreur interne du serveur." }, 500);
}

// Local development only: protect administrative reads before publishing.
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    for (const key of ["q", "status", "page", "pageSize"]) {
      if (params.getAll(key).length > 1) return json({ error: `Paramètre répété : ${key}` }, 400);
    }
    const query = querySchema.parse(Object.fromEntries([...params].filter(([, value]) => value.trim() !== "")));
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q) {
      // Treat LIKE wildcards as literal characters in the search text.
      const contains = query.q.replace(/[\\%_]/g, "\\$&");
      where.OR = [
        { reference: { contains, mode: "insensitive" } },
        { customerName: { contains, mode: "insensitive" } },
        { customerPhone: { contains, mode: "insensitive" } },
      ];
    }
    const total = await prisma.order.count({ where });
    const totalPages = Math.ceil(total / query.pageSize);
    const page = Math.min(query.page, Math.max(1, totalPages));
    const orders = total === 0 ? [] : await prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return json({ orders, total, page, totalPages, pageSize: query.pageSize });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: Request) {
  try {
    // Strict validation rejects browser-supplied prices, status, totals and userId.
    const data = createSchema.parse(await request.json());
    const fee = readDeliveryFee();
    if (!fee.success) {
      return json({
        error: "Frais de livraison non configurés ou invalides. Définissez ORDER_DELIVERY_FEE_TND côté serveur (montant en TND, positif ou nul, trois décimales maximum).",
        code: "DELIVERY_FEE_NOT_CONFIGURED",
      }, 503);
    }
    const quantities = new Map<number, number>();
    for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] } },
      select: { id: true, name: true, price: true, promoPrice: true },
    });
    const foundIds = new Set(products.map(product => product.id));
    const missingIds = [...quantities.keys()].filter(id => !foundIds.has(id));
    if (missingIds.length) return json({ error: "Certains produits n’existent plus.", productIds: missingIds }, 400);

    let subtotal = new Prisma.Decimal(0);
    const items = products.map(product => {
      const quantity = quantities.get(product.id)!;
      const unitPrice = product.promoPrice ?? product.price;
      subtotal = subtotal.plus(unitPrice.times(quantity));
      return { productId: product.id, productName: product.name, unitPrice, quantity };
    });
    const total = subtotal.plus(fee.data);
    if (subtotal.gt(maxAmount) || total.gt(maxAmount)) return json({ error: "Le montant de la commande dépasse la limite autorisée." }, 400);

    // Prisma commits the order and all its items in one atomic nested write.
    const order = await prisma.order.create({
      data: {
        reference: `AK-${randomUUID().toUpperCase()}`,
        userId: null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        deliveryAddress: data.deliveryAddress,
        customerEmail: data.customerEmail,
        note: data.note,
        status: OrderStatus.EN_ATTENTE,
        subtotal,
        deliveryFee: fee.data,
        total,
        items: { create: items },
      },
      include: { items: { orderBy: { id: "asc" } } },
    });
    return Response.json(order, { status: 201, headers: { Location: `/api/orders/${order.id}`, "Cache-Control": "no-store" } });
  } catch (error) {
    return handleError(error);
  }
}
