
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Heart,
  PawPrint,
  PackageCheck,
  Truck,
  RotateCcw,
} from "lucide-react";

// ================= PRODUCTS DATA =================

type Product = {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  badge?: string;
  inStock: boolean;
};

const products: Product[] = [
  {
    id: 1,
    name: "Croquettes Premium pour chien",
    category: "Chiens",
    brand: "Royal Canin",
    price: 89,
    oldPrice: 105,
    rating: 4.8,
    reviews: 124,
    image:
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=700",
    badge: "PROMO",
    inStock: true,
  },
  {
    id: 2,
    name: "Croquettes pour chat adulte",
    category: "Chats",
    brand: "Whiskas",
    price: 55,
    rating: 4.7,
    reviews: 89,
    image:
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=700",
    inStock: true,
  },
  {
    id: 3,
    name: "Jouet interactif pour chat",
    category: "Accessoires",
    brand: "PetSafe",
    price: 32,
    oldPrice: 40,
    rating: 4.9,
    reviews: 56,
    image:
      "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=700",
    badge: "PROMO",
    inStock: true,
  },
  {
    id: 4,
    name: "Maison confortable pour chien",
    category: "Accessoires",
    brand: "PetSafe",
    price: 145,
    rating: 4.6,
    reviews: 34,
    image:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=700",
    inStock: true,
  },
  {
    id: 5,
    name: "Gamelle en acier inoxydable",
    category: "Accessoires",
    brand: "PetSafe",
    price: 25,
    rating: 4.5,
    reviews: 72,
    image:
      "https://images.unsplash.com/photo-1601758123927-196b5a6b7e9e?w=700",
    inStock: true,
  },
  {
    id: 6,
    name: "Jouet balle pour chien",
    category: "Chiens",
    brand: "Kong",
    price: 18,
    rating: 4.8,
    reviews: 45,
    image:
      "https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=700",
    inStock: false,
  },
  {
    id: 7,
    name: "Cage confortable pour oiseaux",
    category: "Oiseaux",
    brand: "Ferplast",
    price: 120,
    oldPrice: 140,
    rating: 4.7,
    reviews: 28,
    image:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=700",
    badge: "PROMO",
    inStock: true,
  },
  {
    id: 8,
    name: "Sac de transport pour animaux",
    category: "Accessoires",
    brand: "Ferplast",
    price: 75,
    rating: 4.6,
    reviews: 41,
    image:
      "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=700",
    inStock: true,
  },
];

const categories = [
  { name: "Chiens", count: 12 },
  { name: "Chats", count: 18 },
  { name: "Oiseaux", count: 8 },
  { name: "Accessoires", count: 24 },
  { name: "Alimentation", count: 15 },
];

const brands = ["Royal Canin", "Whiskas", "PetSafe", "Kong", "Ferplast"];

// ================= PAGE =================

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(200);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(0);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category);

      const matchesBrand =
        selectedBrands.length === 0 ||
        selectedBrands.includes(product.brand);

      const matchesPrice = product.price <= maxPrice;

      const matchesStock = !inStockOnly || product.inStock;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesBrand &&
        matchesPrice &&
        matchesStock
      );
    });

    if (sort === "price-asc") {
      result.sort((a, b) => a.price - b.price);
    } else if (sort === "price-desc") {
      result.sort((a, b) => b.price - a.price);
    } else if (sort === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [
    search,
    selectedCategories,
    selectedBrands,
    maxPrice,
    inStockOnly,
    sort,
  ]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((item) => item !== brand)
        : [...prev, brand]
    );
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setMaxPrice(200);
    setInStockOnly(false);
    setSearch("");
    setSort("default");
  };

  // ================= SIDEBAR =================

  const Sidebar = () => (
    <div className="space-y-7">

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Filtres</h2>
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-[#4CA800] hover:underline"
        >
          Réinitialiser
        </button>
      </div>

      {/* Categories */}
      <div>
        <h3 className="mb-4 font-bold text-gray-900">Catégories</h3>

        <div className="space-y-3">
          {categories.map((category) => (
            <label
              key={category.name}
              className="flex cursor-pointer items-center justify-between text-sm text-gray-600"
            >
              <span className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(category.name)}
                  onChange={() => toggleCategory(category.name)}
                  className="h-4 w-4 accent-[#65D900]"
                />
                {category.name}
              </span>
              <span className="text-xs text-gray-400">
                ({category.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Price */}
      <div>
        <h3 className="mb-4 font-bold text-gray-900">Prix maximum</h3>

        <input
          type="range"
          min="10"
          max="200"
          step="5"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full cursor-pointer accent-[#65D900]"
        />

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">10 DT</span>
          <span className="rounded-md bg-[#65D900]/10 px-3 py-1 font-bold text-gray-900">
            {maxPrice} DT
          </span>
          <span className="text-gray-400">200 DT</span>
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Brands */}
      <div>
        <h3 className="mb-4 font-bold text-gray-900">Marques</h3>

        <div className="space-y-3">
          {brands.map((brand) => (
            <label
              key={brand}
              className="flex cursor-pointer items-center gap-3 text-sm text-gray-600"
            >
              <input
                type="checkbox"
                checked={selectedBrands.includes(brand)}
                onChange={() => toggleBrand(brand)}
                className="h-4 w-4 accent-[#65D900]"
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      <div className="h-px bg-gray-100" />

      {/* Availability */}
      <div>
        <h3 className="mb-4 font-bold text-gray-900">Disponibilité</h3>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 accent-[#65D900]"
          />
          En stock uniquement
        </label>
      </div>



    </div>
  );

  return (
    <main className="min-h-screen bg-[#F7F8F6]">



      {/* ================= BENEFITS ================= */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Truck className="text-[#58C900]" size={24} />
            <div>
              <p className="text-sm font-bold text-gray-900">
                Livraison disponible
              </p>
              <p className="text-xs text-gray-500">
                Faites-vous livrer vos commandes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <PackageCheck className="text-[#58C900]" size={24} />
            <div>
              <p className="text-sm font-bold text-gray-900">
                Produits sélectionnés
              </p>
              <p className="text-xs text-gray-500">
                Pour le bien-être de vos animaux
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RotateCcw className="text-[#58C900]" size={24} />
            <div>
              <p className="text-sm font-bold text-gray-900">
                Service client
              </p>
              <p className="text-xs text-gray-500">
                Nous sommes là pour vous aider
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRODUCTS CONTENT ================= */}
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">

        {/* Page title */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#58B900]">
              Notre sélection
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Tous les produits
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Trouvez tout ce dont vos animaux ont besoin.
            </p>
          </div>

          <span className="text-sm font-medium text-gray-500">
            {filteredProducts.length} produit(s) trouvé(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">

          {/* ================= DESKTOP SIDEBAR ================= */}
          <aside className="hidden h-fit rounded-2xl border border-gray-100 bg-white p-6 lg:sticky lg:top-28 lg:block">
            <Sidebar />
          </aside>

          {/* ================= MAIN CONTENT ================= */}
          <div>

            {/* Search and sorting */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">

              <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-[#65D900]">
                <Search className="mr-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Effacer la recherche"
                  >
                    <X size={17} className="text-gray-400" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">

                {/* Mobile filters button */}
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 lg:hidden"
                >
                  <SlidersHorizontal size={18} />
                  Filtres
                </button>

                {/* Sorting */}
                <div className="relative flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-3 sm:flex-none">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full cursor-pointer appearance-none bg-transparent py-3 pr-6 text-sm font-medium text-gray-700 outline-none sm:w-48"
                  >
                    <option value="default">Trier par : Défaut</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    <option value="rating">Meilleures notes</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Active categories */}
            {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {selectedCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className="rounded-full bg-[#65D900]/15 px-3 py-1.5 text-xs font-semibold text-gray-800"
                  >
                    {category} ×
                  </button>
                ))}

                {selectedBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleBrand(brand)}
                    className="rounded-full bg-[#65D900]/15 px-3 py-1.5 text-xs font-semibold text-gray-800"
                  >
                    {brand} ×
                  </button>
                ))}

                <button
                  onClick={resetFilters}
                  className="text-xs font-semibold text-gray-500 underline"
                >
                  Tout effacer
                </button>
              </div>
            )}

            {/* ================= PRODUCT GRID ================= */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">

                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >

                    {/* Product image */}
                    <div className="relative aspect-square overflow-hidden bg-gray-100">

                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 300px"
                        className="object-cover transition duration-500 group-hover:scale-110"
                      />

                      {product.badge && (
                        <span className="absolute left-3 top-3 rounded-full bg-[#65D900] px-3 py-1 text-[10px] font-extrabold text-black">
                          {product.badge}
                        </span>
                      )}

                      {!product.inStock && (
                        <span className="absolute left-3 top-3 rounded-full bg-gray-900 px-3 py-1 text-[10px] font-bold text-white">
                          Rupture
                        </span>
                      )}

                      <button
                        onClick={() => toggleFavorite(product.id)}
                        aria-label="Ajouter aux favoris"
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#65D900]"
                      >
                        <Heart
                          size={18}
                          className={
                            favorites.includes(product.id)
                              ? "fill-red-500 text-red-500"
                              : "text-gray-700"
                          }
                        />
                      </button>
                    </div>

                    {/* Product information */}
                    <div className="p-3 sm:p-4">

                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#55B900] sm:text-xs">
                        {product.category}
                      </p>

                      <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900 transition group-hover:text-[#4DA900] sm:text-base">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      <div className="mt-2 flex items-center gap-1">
                        <Star
                          size={13}
                          className="fill-yellow-400 text-yellow-400"
                        />
                        <span className="text-xs font-semibold text-gray-700">
                          {product.rating}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({product.reviews})
                        </span>
                      </div>

                      {/* Price */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-gray-900 sm:text-lg">
                          {product.price} DT
                        </span>

                        {product.oldPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {product.oldPrice} DT
                          </span>
                        )}
                      </div>

                      {/* Add to cart */}
                      <button
                        disabled={!product.inStock}
                        onClick={() => setCartCount((prev) => prev + 1)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-2 py-3 text-xs font-bold text-black transition hover:bg-[#55BD00] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:text-sm"
                      >
                        <ShoppingCart size={16} />
                        {product.inStock ? "Ajouter au panier" : "Indisponible"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center">
                <Search className="mx-auto mb-4 text-gray-300" size={45} />
                <h3 className="text-lg font-bold text-gray-900">
                  Aucun produit trouvé
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Essayez de modifier vos filtres ou votre recherche.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ================= MOBILE FILTER DRAWER ================= */}
      {showFilters && (
        <div className="fixed inset-0 z-[100] lg:hidden">

          <button
            aria-label="Fermer les filtres"
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-900">
                Filtrer les produits
              </h2>
              <button
                onClick={() => setShowFilters(false)}
                aria-label="Fermer"
                className="rounded-full bg-gray-100 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <Sidebar />

            <button
              onClick={() => setShowFilters(false)}
              className="mt-7 w-full rounded-xl bg-[#65D900] py-4 font-bold text-black transition hover:bg-[#55BD00]"
            >
              Voir {filteredProducts.length} produit(s)
            </button>
          </div>
        </div>
      )}

      {/* ================= FLOATING CART COUNTER ================= */}
      {cartCount > 0 && (
        <Link
          href="/panier"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#010101] px-5 py-4 text-white shadow-xl transition hover:scale-105"
        >
          <ShoppingCart size={20} className="text-[#65D900]" />
          <span className="text-sm font-bold">
            Panier ({cartCount})
          </span>
        </Link>
      )}

    </main>
  );
}
