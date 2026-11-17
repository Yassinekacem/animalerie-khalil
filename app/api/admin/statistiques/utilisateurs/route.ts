import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const periode = new URL(request.url).searchParams.get("periode") ?? "12m";
    if (!["7j", "30j", "12m"].includes(periode)) {
      return authJson({ error: "Période invalide. Choisissez 7j, 30j ou 12m." }, 400);
    }

    const monthly = periode === "12m";
    const size = monthly ? 12 : periode === "7j" ? 7 : 30;
    const unit = monthly ? "month" : "day";
    // PostgreSQL groups and fills calendar buckets in the shop's time zone.
    // Prisma DateTime columns store UTC timestamps without a time zone.
    const [registrations, genders] = await Promise.all([
      prisma.$queryRaw<{ date: string; count: bigint }[]>`
        WITH bounds AS (
          SELECT date_trunc(${unit}::text, CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis') AS last
        ), buckets AS (
          SELECT generate_series(
            last - (${size}::int - 1) * ('1 ' || ${unit}::text)::interval,
            last, ('1 ' || ${unit}::text)::interval
          ) AS date FROM bounds
        ), registrations AS (
          SELECT date_trunc(${unit}::text,
            "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Tunis') AS date,
            COUNT(*) AS count
          FROM "User"
          WHERE role = 'CLIENT'
            AND "createdAt" >= ((SELECT MIN(date) FROM buckets)
              AT TIME ZONE 'Africa/Tunis' AT TIME ZONE 'UTC')
            AND "createdAt" <= CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          GROUP BY 1
        )
        SELECT to_char(buckets.date, 'YYYY-MM-DD') AS date,
          COALESCE(registrations.count, 0) AS count
        FROM buckets LEFT JOIN registrations USING (date)
        ORDER BY buckets.date
      `,
      prisma.user.groupBy({
        by: ["sexe"],
        where: { role: "CLIENT", sexe: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const formatter = new Intl.DateTimeFormat("fr-FR", {
      timeZone: "UTC",
      ...(monthly ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" }),
    });

    return authJson({
      evolutionInscriptions: registrations.map(({ date, count }) => ({
        date, label: formatter.format(new Date(`${date}T00:00:00Z`)), count: Number(count),
      })),
      repartitionSexe: [
        { name: "Hommes", value: genders.find(item => item.sexe === "HOMME")?._count._all ?? 0 },
        { name: "Femmes", value: genders.find(item => item.sexe === "FEMME")?._count._all ?? 0 },
      ],
    });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    console.error("User statistics API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger les statistiques. Veuillez réessayer." }, 500);
  }
}
