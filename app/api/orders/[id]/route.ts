import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
type Context = { params: Promise<{ id: string }> };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Development only: protect order details with administrator authorization before publication.
export async function GET(_request: Request, context: Context) {
  try {
    const id = idSchema.parse((await context.params).id);
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return json({ error: "Commande introuvable." }, 404);
    return json(order);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Identifiant invalide.", issues: error.issues }, 400);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") return json({ error: "Commande introuvable." }, 404);
      if (error.code === "P2021" || error.code === "P2022") {
        return json({ error: "Le schéma des commandes n’est pas à jour. Appliquez la migration Prisma avant d’utiliser cette API." }, 503);
      }
    }
    console.error("Order details API error:", error);
    return json({ error: "Erreur interne du serveur." }, 500);
  }
}
