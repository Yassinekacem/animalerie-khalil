import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";
import { connection } from "next/server";

export async function GET(request: Request) {
  await connection();
  try {
    await requireAdmin(request);
    const [clients, products, orders, pendingOrders, delivered, recentOrders] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "EN_ATTENTE" } }),
      prisma.order.aggregate({ where: { status: "LIVREE" }, _count: { id: true }, _sum: { total: true } }),
      prisma.order.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 5,
        select: { id: true, reference: true, customerName: true, createdAt: true, total: true, status: true },
      }),
    ]);
    return authJson({ clients, products, orders, pendingOrders, deliveredOrders: delivered._count.id,
      deliveredTotal: delivered._sum.total?.toFixed(3) ?? "0.000", recentOrders });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    console.error("Dashboard API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger le tableau de bord. Veuillez réessayer." }, 500);
  }
}
