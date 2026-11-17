import { prisma } from "@/lib/prisma";
import { AuthError, authError, authJson, requireAdmin } from "@/lib/auth";
import { categories, type Animal } from "@/lib/catalogue";

const animalLabels: Record<Animal, string> = {
  chien: "Chiens", chat: "Chats", oiseaux: "Oiseaux", poissons: "Poissons",
};

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [groups, ratings] = await Promise.all([
      prisma.product.groupBy({
        by: ["targetAnimal", "category"],
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

    return authJson({
      produitsParAnimal: animals.map(animal => ({
        name: animalLabels[animal],
        count: groups.filter(group => group.targetAnimal === animal).reduce((sum, group) => sum + group._count._all, 0),
      })),
      repartitionCategories: Object.fromEntries(animals.map(animal => {
        const counts = new Map(groups.filter(group => group.targetAnimal === animal)
          .map(group => [group.category, group._count._all]));
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
