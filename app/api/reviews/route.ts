import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";
import { connection } from "next/server";
import { z } from "zod";

const querySchema = z.strictObject({
  q: z.string().trim().max(200).optional(),
  rating: z.enum(["1", "2", "3", "4", "5"]).transform(Number).optional(),
  comment: z.enum(["with", "without"]).optional(),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(2147483647)).default(1),
  pageSize: z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(100)).default(12),
});

export async function GET(request: Request) {
  await connection();
  try {
    await requireAdmin(request);
    const params = new URL(request.url).searchParams;
    for (const key of params.keys()) {
      if (params.getAll(key).length > 1) return authJson({ error: `Paramètre répété : ${key}` }, 400);
    }
    const query = querySchema.parse(Object.fromEntries([...params].filter(([, value]) => value.trim() !== "")));
    const where: Prisma.ReviewWhereInput = {};
    if (query.rating !== undefined) where.rating = query.rating;
    if (query.comment === "with") where.AND = [{ comment: { not: null } }, { comment: { not: "" } }];
    if (query.comment === "without") where.AND = [{ OR: [{ comment: null }, { comment: "" }] }];
    if (query.q) {
      const contains = query.q.replace(/[\\%_]/g, "\\$&");
      where.OR = [
        { comment: { contains, mode: "insensitive" } },
        { product: { name: { contains, mode: "insensitive" } } },
        { user: { name: { contains, mode: "insensitive" } } },
      ];
    }
    // Count and page use the same snapshot, even during customer edits/deletions.
    const result = await prisma.$transaction(async tx => {
      const total = await tx.review.count({ where });
      const totalPages = Math.ceil(total / query.pageSize);
      const page = Math.min(query.page, Math.max(1, totalPages));
      const direction = query.sort === "oldest" ? "asc" : "desc";
      const reviews = total === 0 ? [] : await tx.review.findMany({
        where, orderBy: [{ createdAt: direction }, { id: direction }],
        skip: (page - 1) * query.pageSize, take: query.pageSize,
        select: {
          id: true, rating: true, comment: true, createdAt: true, updatedAt: true,
          product: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });
      return { reviews, total, page, totalPages, pageSize: query.pageSize };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return authJson(result);
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    if (error instanceof z.ZodError) return authJson({ error: "Paramètres invalides.", issues: error.issues }, 400);
    console.error("Review list API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger les avis. Veuillez réessayer." }, 500);
  }
}
