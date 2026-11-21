import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";
import { availabilityOptions, categories, type Animal, type ProductAvailability } from "@/lib/catalogue";
import { connection } from "next/server";

const animalLabels: Record<Animal, string> = {
  chien: "Chiens", chat: "Chats", oiseaux: "Oiseaux", poissons: "Poissons",
};

export async function GET(request: Request) {
  await connection();
  try {
    await requireAdmin(request);
    const [groups, ratings] = await Promise.all([
      prisma.product.groupBy({
        by: ["targetAnimal", "category", "availability"],
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ["productId"],
        _avg: { rating: true },
        _count: { id: true },
        orderBy: [{ _avg: { rating: "desc" } }, { _count: { id: "desc" } }, { productId: "asc" }],
        take: 5,
      }),
    ]);
    // Fetch only the names of the five ranked products, never their individual reviews.
    const products = ratings.length ? await prisma.product.findMany({
      where: { id: { in: ratings.map(item => item.productId) } },
      select: { id: true, name: true },
    }) : [];
    const names = new Map(products.map(product => [product.id, product.name]));
    const animals = Object.keys(animalLabels) as Animal[];
    const availabilityCounts = new Map<ProductAvailability, number>();
    let totalProducts = 0;
    for (const group of groups) {
      availabilityCounts.set(group.availability, (availabilityCounts.get(group.availability) ?? 0) + group._count._all);
      totalProducts += group._count._all;
    }

    return authJson({
      repartitionDisponibilite: (Object.keys(availabilityOptions) as ProductAvailability[]).map(status => {
        const count = availabilityCounts.get(status) ?? 0;
        return { status, name: availabilityOptions[status].label, count, percentage: totalProducts ? Number((count / totalProducts * 100).toFixed(2)) : 0 };
      }),
      produitsParAnimal: animals.map(animal => ({
        name: animalLabels[animal],
        count: groups.filter(group => group.targetAnimal === animal).reduce((sum, group) => sum + group._count._all, 0),
      })),
      repartitionCategories: Object.fromEntries(animals.map(animal => {
        const counts = new Map<string, number>();
        for (const group of groups.filter(group => group.targetAnimal === animal)) {
          counts.set(group.category, (counts.get(group.category) ?? 0) + group._count._all);
        }
        const knownIds = new Set(categories[animal].map(category => category.id));
        return [animal, [
          ...categories[animal].map(category => ({ name: category.name, count: counts.get(category.id) ?? 0 })),
          ...Array.from(counts).filter(([id]) => !knownIds.has(id)).map(([name, count]) => ({ name, count })),
        ]];
      })),
      topProduits: ratings.filter(item => names.has(item.productId)).map(item => ({
        id: item.productId, name: names.get(item.productId)!,
        rating: item._avg.rating!, reviews: item._count.id,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return authError(error);
    console.error("Product statistics API error", error instanceof Error ? error.name : "UnknownError");
    return authJson({ error: "Impossible de charger les statistiques produits. Veuillez réessayer." }, 500);
  }
}
