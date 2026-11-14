import { OrderStatus, Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
const statusSchema = z.strictObject({ status: z.enum(OrderStatus) });
type Context = { params: Promise<{ id: string }> };

const transitions: Record<OrderStatus, OrderStatus[]> = {
  EN_ATTENTE: [OrderStatus.CONFIRMEE, OrderStatus.ANNULEE],
  CONFIRMEE: [OrderStatus.EN_LIVRAISON, OrderStatus.ANNULEE],
  EN_LIVRAISON: [OrderStatus.LIVREE, OrderStatus.ANNULEE],
  LIVREE: [],
  ANNULEE: [],
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Development only: require administrator authorization before publication.
export async function PUT(request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const { status } = statusSchema.parse(await request.json());
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return json({ error: "Commande introuvable." }, 404);
    // Repeating the current status is a no-op, including for final states.
    if (order.status === status) return json(order);
    if (!transitions[order.status].includes(status)) {
      return json({
        error: `Transition de ${order.status} vers ${status} refusée.`,
        currentStatus: order.status,
        allowedStatuses: transitions[order.status],
      }, 409);
    }
    const updated = await prisma.order.update({
      // A concurrent status change must not be overwritten with a stale transition.
      where: { id, status: order.status },
      data: { status },
      include: { items: { orderBy: { id: "asc" } } },
    });
    return json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Données invalides.", issues: error.issues }, 400);
    }
    if (error instanceof SyntaxError) return json({ error: "Corps JSON incorrect." }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025" || error.code === "P2034") {
        return json({ error: "La commande a été modifiée entre-temps. Rechargez ses détails avant de réessayer." }, 409);
      }
      if (error.code === "P2021" || error.code === "P2022") {
        return json({ error: "Le schéma des commandes n’est pas à jour. Appliquez la migration Prisma avant d’utiliser cette API." }, 503);
      }
    }
    console.error("Order status API error:", error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
}
