import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { AuthError, authError, requireUser } from "@/lib/auth";

const idSchema = z.string().regex(/^[1-9]\d*$/, "Identifiant invalide.")
  .transform(Number).pipe(z.number().int().positive().max(2147483647));
type Context = { params: Promise<{ id: string }> };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser(_request);
    const params = new URL(_request.url).searchParams;
    if (params.getAll("scope").length > 1) return json({ error: "Paramètre scope répété." }, 400);
    const scope = z.literal("mine").optional().parse(params.get("scope") ?? undefined);
    const id = idSchema.parse((await context.params).id);
    const order = await prisma.order.findUnique({
      where: { id, ...(scope === "mine" || user.role !== "ADMIN" ? { userId: user.id } : {}) },
      include: { items: { orderBy: { id: "asc" } } },
    });
    if (!order) return json({ error: "Commande introuvable." }, 404);
    return json(order);
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    if (error instanceof z.ZodError) {
      return json({ error: "Paramètres invalides.", issues: error.issues }, 400);
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

// Customer cancellation is separate from administrative status transitions.
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser(request);
    const id = idSchema.parse((await context.params).id);
    z.strictObject({ status: z.literal("ANNULEE") }).parse(await request.json());
    const order = await prisma.order.update({
      // Ownership and status are checked atomically, including during concurrent admin updates.
      where: { id, userId: user.id, status: "EN_ATTENTE" },
      data: { status: "ANNULEE" },
      include: { items: { orderBy: { id: "asc" } } },
    });
    return json(order);
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    if (error instanceof z.ZodError) return json({ error: "Données invalides.", issues: error.issues }, 400);
    if (error instanceof SyntaxError) return json({ error: "Corps JSON incorrect." }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025" || error.code === "P2034") {
        return json({ error: "L’annulation est impossible : la commande n’est plus en attente ou n’est plus accessible. Ses détails vont être actualisés." }, 409);
      }
      if (error.code === "P2021" || error.code === "P2022") {
        return json({ error: "Le service des commandes est temporairement indisponible." }, 503);
      }
    }
    console.error("Order cancellation API error:", error);
    return json({ error: "Impossible d’annuler la commande. Veuillez réessayer." }, 500);
  }
}
