import { createHash, randomUUID } from "node:crypto";
import { OrderStatus, Prisma, type Product } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { readDeliveryFee } from "@/lib/order-delivery";
import { isValidLocation } from "@/lib/tunisia-locations";
import { z } from "zod";
import { AuthError, authError, checkOrigin, getCurrentUser, requireAdmin, requireUser } from "@/lib/auth";
import { after, connection } from "next/server";
import { logEmailFailure, notifyAdminOrder } from "@/lib/email";

const maxQuantity = 9999;
const maxAmount = new Prisma.Decimal("999999999999999.999");
const createSchema = z.strictObject({
  customerName: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  customerPhone: z.string().trim().min(1, "Le téléphone est obligatoire.").max(32),
  deliveryAddress: z.string().trim().min(1, "L’adresse de livraison est obligatoire.").max(1000),
  gouvernorat: z.string().trim().min(1, "Le gouvernorat est obligatoire.").max(100),
  ville: z.string().trim().min(1, "La ville est obligatoire.").max(100),
  customerEmail: z.string().trim().email("Adresse e-mail invalide.").max(254).nullable().default(null),
  note: z.string().trim().max(2000).nullable().default(null).transform(value => value || null),
  items: z.array(z.strictObject({
    productId: z.number().int().positive().max(2147483647),
    quantity: z.number().int().min(1).max(maxQuantity),
  })).min(1, "La commande doit contenir au moins un article.").max(100),
}).superRefine((value, ctx) => {
  if (!isValidLocation(value.gouvernorat, value.ville)) {
    ctx.addIssue({ code: "custom", path: ["ville"], message: "Sélectionnez une ville appartenant au gouvernorat tunisien choisi." });
  }
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
  scope: z.literal("mine").optional(),
  q: z.string().trim().max(200).optional(),
  status: z.enum(OrderStatus).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(20),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

function handleError(error: unknown) {
  if (error instanceof AuthError) return authError(error);
  if (error instanceof z.ZodError) return json({ error: "Données invalides.", issues: error.issues }, 400);
  if (error instanceof SyntaxError) return json({ error: "Corps JSON incorrect." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003" || error.code === "P2014" || error.code === "P2025") {
      return json({ error: "Un produit ou le compte client n’est plus disponible. Rechargez la page avant de réessayer." }, 409);
    }
    if (error.code === "P2002") return json({ error: "Une référence identique existe déjà. Veuillez réessayer." }, 409);
    if (error.code === "P2021" || error.code === "P2022") {
      return json({ error: "Le schéma des commandes n’est pas disponible. Appliquez la migration Prisma préparée." }, 503);
    }
  }
  console.error("Orders API error:", error);
  return json({ error: "Erreur interne du serveur." }, 500);
}

// The default remains administrative; scope=mine always restricts reads to the session owner.
export async function GET(request: Request) {
  await connection();
  try {
    const user = await requireUser(request);
    const params = new URL(request.url).searchParams;
    if (params.has("unseen")) {
      if (user.role !== "ADMIN") throw new AuthError("Accès réservé aux administrateurs.", 403);
      if (params.size !== 1 || params.get("unseen") !== "true") return json({ error: "Paramètres invalides." }, 400);
      return json({ count: await prisma.order.count({ where: { adminSeenAt: null } }) });
    }
    for (const key of ["scope", "q", "status", "page", "pageSize"]) {
      if (params.getAll(key).length > 1) return json({ error: `Paramètre répété : ${key}` }, 400);
    }
    const query = querySchema.parse(Object.fromEntries([...params].filter(([, value]) => value.trim() !== "")));
    if (query.scope !== "mine" && user.role !== "ADMIN") throw new AuthError("Accès réservé aux administrateurs.", 403);
    const where: Prisma.OrderWhereInput = query.scope === "mine" ? { userId: user.id } : {};
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

// Only the exact orders displayed by the administrator are acknowledged.
export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const { ids } = z.strictObject({
      ids: z.array(z.number().int().positive().max(2147483647)).min(1).max(100),
    }).parse(await request.json());
    await prisma.order.updateMany({
      where: { id: { in: ids }, adminSeenAt: null },
      data: { adminSeenAt: new Date() },
    });
    return json({ count: await prisma.order.count({ where: { adminSeenAt: null } }) });
  } catch (error) { return handleError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    // Strict validation rejects browser-supplied prices, status, totals and userId.
    const data = createSchema.parse(await request.json());
    const user = await getCurrentUser();
    const key = z.uuid().parse(request.headers.get("Idempotency-Key")).toLowerCase();
    const idempotencyKeyHash = createHash("sha256").update(key).digest("hex");
    const quantities = new Map<number, number>();
    for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const requestHash = createHash("sha256").update(JSON.stringify({
      ...data,
      userId: user?.id ?? null,
      items: [...quantities].sort(([a], [b]) => a - b).map(([productId, quantity]) => ({ productId, quantity })),
    })).digest("hex");
    const replay = (order: { requestHash: string | null; id: number }) => {
      if (order.requestHash !== requestHash) return json({
        error: "Cette tentative correspond à un autre achat. Vérifiez votre panier avant de réessayer.",
        code: "IDEMPOTENCY_CONFLICT",
      }, 409);
      return Response.json(order, { status: 200, headers: {
        Location: `/api/orders/${order.id}`, "Cache-Control": "private, no-store", "Idempotency-Replayed": "true",
      } });
    };
    try {
      let createdId: number | undefined;
      const response = await prisma.$transaction(async tx => {
        // A replay must still work if prices, availability or delivery settings changed.
        const existing = await tx.order.findUnique({
          where: { idempotencyKeyHash }, include: { items: { orderBy: { id: "asc" } } },
        });
        if (existing) return replay(existing);
        const fee = readDeliveryFee();
        if (!fee.success) {
          return json({
            error: "Frais de livraison non configurés ou invalides. Définissez ORDER_DELIVERY_FEE_TND côté serveur (montant en TND, positif ou nul, trois décimales maximum).",
            code: "DELIVERY_FEE_NOT_CONFIGURED",
          }, 503);
        }
        // Keep availability and prices stable until the order is committed.
        const products = await tx.$queryRaw<Pick<Product, "id" | "name" | "price" | "promoPrice" | "availability">[]>(Prisma.sql`
          SELECT "id", "name", "price", "promoPrice", "availability" FROM "Product"
          WHERE "id" IN (${Prisma.join([...quantities.keys()])})
          ORDER BY "id" FOR SHARE
        `);
        const unavailable = products.filter(product => product.availability !== "DISPONIBLE");
        if (unavailable.length) return json({
          error: "Certains produits sont indisponibles. Retirez-les du panier pour commander.",
          code: "PRODUCT_UNAVAILABLE", productIds: unavailable.map(product => product.id),
        }, 409);
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
        const order = await tx.order.create({
          data: {
            reference: `AK-${randomUUID().toUpperCase()}`,
            idempotencyKeyHash,
            requestHash,
            userId: user?.id ?? null,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            deliveryAddress: data.deliveryAddress,
            gouvernorat: data.gouvernorat,
            ville: data.ville,
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
        createdId = order.id;
        return Response.json(order, { status: 201, headers: { Location: `/api/orders/${order.id}`, "Cache-Control": "no-store" } });
      });
      if (response.status === 201 && createdId !== undefined) {
        const orderId = createdId;
        // Register only after commit. Delivery must never change the checkout response.
        try { after(async () => {
          console.info("Order notification deferred task started");
          try { await notifyAdminOrder(orderId); }
          catch (error) { logEmailFailure("Order notification processing unavailable", error); }
        }); } catch (error) { logEmailFailure("Order notification scheduling unavailable", error); }
      }
      return response;
    } catch (error) {
      // Concurrent requests can both miss the lookup. The unique index chooses
      // one winner; after the losing transaction rolls back, return its result.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKeyHash }, include: { items: { orderBy: { id: "asc" } } },
        });
        if (existing) return replay(existing);
      }
      throw error;
    }
  } catch (error) {
    return handleError(error);
  }
}
