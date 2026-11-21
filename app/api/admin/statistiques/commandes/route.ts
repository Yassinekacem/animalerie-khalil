import type { OrderStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";
import { z } from "zod";
import { connection } from "next/server";

const querySchema = z.strictObject({ periode: z.enum(["7j", "30j", "12m"]).default("12m") });

type StatisticsRow = {
  evolution: { date: string; count: number; amount: string }[];
  repartitionStatuts: { status: OrderStatus; value: number }[];
  totalOrders: bigint;
  totalRevenue: string;
};

export async function GET(request: Request) {
  await connection();
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    if (params.getAll("periode").length > 1) return authJson({ error: "La période ne doit pas être répétée." }, 400);
    const { periode } = querySchema.parse(Object.fromEntries(params));
    const monthly = periode === "12m";
    const unit = monthly ? "month" : "day";
    const size = monthly ? 12 : periode === "7j" ? 7 : 30;

    // One PostgreSQL snapshot keeps all three charts and their totals consistent.
    // DateTime columns contain UTC timestamps; calendar boundaries use Tunisia.
    const [row] = await prisma.$queryRaw<StatisticsRow[]>`
      WITH bounds AS (
        SELECT date_trunc(${unit}::text, CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis') AS last
      ), buckets AS (
        SELECT generate_series(
          last - (${size}::int - 1) * ('1 ' || ${unit}::text)::interval,
          last, ('1 ' || ${unit}::text)::interval
        ) AS date FROM bounds
      ), filtered AS MATERIALIZED (
        SELECT date_trunc(${unit}::text,
          "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Tunis') AS date,
          status, total
        FROM "Order"
        WHERE "createdAt" >= ((SELECT MIN(date) FROM buckets)
          AT TIME ZONE 'Africa/Tunis' AT TIME ZONE 'UTC')
          AND "createdAt" <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
      ), evolution AS (
        SELECT buckets.date, COUNT(filtered.date) AS count,
          COALESCE(SUM(filtered.total) FILTER (WHERE filtered.status = 'LIVREE'), 0) AS amount
        FROM buckets LEFT JOIN filtered USING (date)
        GROUP BY buckets.date
      ), status_counts AS (
        SELECT status, COUNT(*) AS count FROM filtered GROUP BY status
      ), statuses AS (
        SELECT unnest(enum_range(NULL::"OrderStatus")) AS status
      )
      SELECT
        (SELECT jsonb_agg(jsonb_build_object(
          'date', to_char(date, 'YYYY-MM-DD'), 'count', count, 'amount', amount::text
        ) ORDER BY date) FROM evolution) AS evolution,
        (SELECT jsonb_agg(jsonb_build_object(
          'status', statuses.status, 'value', COALESCE(status_counts.count, 0)
        ) ORDER BY statuses.status)
          FROM statuses LEFT JOIN status_counts USING (status)) AS "repartitionStatuts",
        (SELECT COUNT(*) FROM filtered) AS "totalOrders",
        (SELECT COALESCE(SUM(total) FILTER (WHERE status = 'LIVREE'), 0)::text FROM filtered) AS "totalRevenue"
    `;
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      ...(monthly ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" }),
    });
    return authJson({
      evolution: row.evolution.map(item => ({ ...item, label: formatter.format(new Date(`${item.date}T00:00:00Z`)) })),
      repartitionStatuts: row.repartitionStatuts,
      totalOrders: Number(row.totalOrders),
      totalRevenue: row.totalRevenue,
    });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    if (error instanceof z.ZodError) return authJson({ error: "Paramètres invalides. Choisissez une période : 7j, 30j ou 12m." }, 400);
    console.error("Order statistics API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger les statistiques des commandes. Veuillez réessayer." }, 500);
  }
}
