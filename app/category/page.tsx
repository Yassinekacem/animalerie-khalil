import { Suspense } from "react";
import CategoryPageClient from "./CategoryPageClient";

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F8F9F7] px-5 py-20 text-center">
          <p className="font-semibold text-gray-500">
            Chargement des catégories...
          </p>
        </main>
      }
    >
      <CategoryPageClient />
    </Suspense>
  );
}