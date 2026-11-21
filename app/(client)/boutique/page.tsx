"use client";

import { useToast } from "@/components/ToastProvider";

import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import SidebarFilter from "@/components/SidebarFilter";
import ProductCard, { ProductCardSkeleton, type Product } from "@/components/ProductCard";
import { animals, categories, type Animal } from "@/lib/catalogue";
import { useCart } from "@/lib/cart";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  ShoppingCart,
  SlidersHorizontal,
  X,
  ChevronDown,
  PackageCheck,
  Truck,
  RotateCcw,
  PawPrint,
} from "lucide-react";

/* ============================================================
   Constantes
   ============================================================ */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.2,
    },
  },
};

const wordVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.5,
        ease: "easeOut",
        delay: 0.2,
      },
      opacity: {
        duration: 0.3,
        delay: 0.2,
      },
    },
  },
};

const accentWordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(10px)",
    textShadow: "0px 0px 0px rgba(101, 217, 0, 0)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    textShadow: "0px 0px 20px rgba(101, 217, 0, 0.3)",
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

const allCategories = Array.from(
  new Map(Object.values(categories).flat().map(item => [item.id, item])).values()
);

/* ============================================================
   Hook : valeur debouncée (même logique que l'admin)
   ============================================================ */

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ============================================================
   Skeletons — utilisés UNIQUEMENT au premier chargement
   ============================================================ */

const Skeleton = memo(function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
});

const ProductGridSkeleton = memo(function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Chargement des produits"
      className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3"
    >
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
});

const SidebarSkeleton = memo(function SidebarSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      {[1, 2, 3].map(section => (
        <div key={section} className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

/* ============================================================
   Page
   ============================================================ */

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8F6]">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
            <div className="mb-7 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
              <aside className="hidden lg:block">
                <div className="rounded-2xl border border-gray-100 bg-white p-6">
                  <SidebarSkeleton />
                </div>
              </aside>
              <ProductGridSkeleton count={6} />
            </div>
          </div>
        </div>
      }
    >
      <Catalogue />
    </Suspense>
  );
}

function Catalogue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();

  const searchFromUrl = searchParams.get("q") ?? "";
  const animalValue = searchParams.get("targetAnimal") ?? "";
  const animal: Animal | "" = Object.hasOwn(animals, animalValue) ? (animalValue as Animal) : "";
  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const promotion = searchParams.get("promotion") === "true";
  const availability = searchParams.get("availability") ?? "";
  const sort = searchParams.get("sort") || "newest";

  const [showFilters, setShowFilters] = useState(false);
  const { count: cartCount, ready: cartReady, addItem } = useCart();
  const toast = useToast();
  const [cartMessage, setCartMessage] = useState({ text: "", error: false });
  const [retry, setRetry] = useState(0);

  /* ---- Recherche : valeur "live" (input) + valeur debouncée (URL) ---- */

  // ⚠️ Le champ de saisie est contrôlé localement pour la réactivité,
  // mais on synchronise si l'URL change depuis l'extérieur (reset, retour arrière…).
  const [searchInput, setSearchInput] = useState(searchFromUrl);
  useEffect(() => {
    // Si l'URL change et ne correspond plus à la valeur locale, on resynchronise.
    if (searchFromUrl !== searchInput) {
      setSearchInput(searchFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFromUrl]);

  // Debounce 300 ms — même logique que l'admin.
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  // Synchronise l'URL quand la valeur debouncée change (et diffère de l'URL).
  // `replace` → pas d'entrée d'historique à chaque frappe.
  const lastPushedSearch = useRef(searchFromUrl);
  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed === lastPushedSearch.current.trim()) return;
    lastPushedSearch.current = debouncedSearch;

    const next = new URLSearchParams(window.location.search);
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    next.set("page", "1");

    const href = pathname + (next.size ? "?" + next.toString() : "");
    router.replace(href, { scroll: false });
  }, [debouncedSearch, pathname, router]);

  /* ---- Données marques / prix ---- */

  const [brandState, setBrandState] = useState<{
    data: string[];
    error: boolean;
    loading: boolean;
  }>({ data: [], error: false, loading: true });

  const [priceBounds, setPriceBounds] = useState<{
    max: number | null;
    loading: boolean;
    error: boolean;
  }>({ max: null, loading: true, error: false });

  /* ---- Liste produits (stale-while-revalidate) ---- */

  const [result, setResult] = useState<{
    data: Product[];
    total: number;
    page: number;
    totalPages: number;
    error: string | null;
    loaded: boolean;
  }>({ data: [], total: 0, page: 1, totalPages: 0, error: null, loaded: false });

  const [listLoading, setListLoading] = useState(false);

  const listController = useRef<AbortController | null>(null);
  const productListRef = useRef<HTMLDivElement | null>(null);
  const pendingPageScroll = useRef(false);

  useEffect(() => {
    if (!pendingPageScroll.current) return;
    pendingPageScroll.current = false;
    if (!result.error) {
      productListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  /* ---- URL helpers ---- */

  const updateUrl = useCallback(
    (changes: Record<string, string>, resetPage = true, replace = false) => {
      pendingPageScroll.current = !resetPage && Boolean(changes.page) && Number(changes.page) !== result.page;
      const next = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(changes)) {
        if (value.trim()) next.set(key, value);
        else next.delete(key);
      }
      for (const [key, value] of [...next]) if (!value.trim()) next.delete(key);
      if (resetPage) next.set("page", "1");
      const href = pathname + (next.size ? "?" + next.toString() : "");
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, result.page]
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const key of [
      "q",
      "availability",
      "targetAnimal",
      "category",
      "brand",
      "minPrice",
      "maxPrice",
      "promotion",
      "sort",
      "page",
    ]) {
      for (const value of searchParams.getAll(key)) if (value.trim()) params.append(key, value);
    }
    params.set("pageSize", "12");
    return params.toString();
  }, [searchParams]);

  const products = result.data;

  // ⚠️ Skeleton UNIQUEMENT au tout premier chargement.
  const isFirstLoad = !result.loaded && listLoading;
  const isRefreshing = result.loaded && listLoading;

  const availableCategories = animal ? categories[animal] : allCategories;

  /* ---- Chargement produits ---- */

  useEffect(() => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;

    (async () => {
      setListLoading(true);
      try {
        const response = await fetch(`/api/products?${query}`, {
          signal: controller.signal,
          cache: "default",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data.issues?.[0]?.message ?? data.error ?? "Impossible de charger les produits."
          );
        }
        if (
          !Array.isArray(data.products) ||
          !Number.isInteger(data.total) ||
          !Number.isInteger(data.page) ||
          !Number.isInteger(data.totalPages)
        ) {
          throw new Error("Réponse du catalogue incorrecte.");
        }
        if (controller.signal.aborted) return;

        setResult({
          data: data.products,
          total: data.total,
          page: data.page,
          totalPages: data.totalPages,
          error: null,
          loaded: true,
        });

        const current = new URLSearchParams(window.location.search);
        if (
          current.toString() === urlQuery &&
          current.get("page") &&
          Number(current.get("page")) !== data.page
        ) {
          current.set("page", String(data.page));
          router.replace(pathname + "?" + current.toString(), { scroll: false });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : "Impossible de charger les produits.",
        }));
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    })();

    return () => controller.abort();
  }, [query, retry, pathname, router, urlQuery]);

  useEffect(() => () => listController.current?.abort(), []);

  /* ---- Marques ---- */

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      setBrandState(prev => ({ ...prev, error: false, loading: true }));
      try {
        const response = await fetch("/api/products?brandsOnly=true", {
          signal: controller.signal,
          cache: "default",
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data) || !data.every(v => typeof v === "string")) {
          throw new Error("Marques indisponibles");
        }
        if (active) setBrandState({ data, error: false, loading: false });
      } catch {
        if (active) setBrandState({ data: [], error: true, loading: false });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  /* ---- Prix max ---- */

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    (async () => {
      setPriceBounds(prev => ({ ...prev, loading: true, error: false }));
      try {
        const response = await fetch("/api/products?sort=price-desc&page=1&pageSize=1", {
          signal: controller.signal,
          cache: "default",
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.products) || !Number.isInteger(data.total)) {
          throw new Error("Plage de prix indisponible.");
        }
        const highest = data.products[0];
        const max = highest ? Number(highest.promoPrice ?? highest.price) : 0;
        if (!Number.isFinite(max) || max < 0 || (data.total > 0 && !highest)) {
          throw new Error("Prix incorrect.");
        }
        if (active) setPriceBounds({ max, loading: false, error: false });
      } catch {
        if (active) setPriceBounds({ max: null, loading: false, error: true });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  /* ---- Handlers stables ---- */

  const resetFilters = useCallback(() => {
    setSearchInput("");
    lastPushedSearch.current = "";
    updateUrl(
      {
        q: "",
        targetAnimal: "",
        category: "",
        brand: "",
        minPrice: "",
        maxPrice: "",
        promotion: "",
        availability: "",
        sort: "",
        page: "",
      },
      false
    );
  }, [updateUrl]);

  const addToCart = useCallback(async (product: Product) => {
    const added = await addItem(product);
    if (added) toast(`${product.name} ajouté au panier.`);
    setCartMessage({
      text: added ? "" : "Ajout impossible : produit indisponible, quantité dépassée ou stockage du navigateur inaccessible.",
      error: !added,
    });
  }, [addItem, toast]);

  /* ---- Skeleton sidebar : uniquement si jamais chargé ---- */

  const sidebarFirstLoad =
    (brandState.loading && brandState.data.length === 0) ||
    (priceBounds.loading && priceBounds.max === null);

  const filters = (
    <SidebarFilter
      animal={animal}
      animals={animals}
      category={category}
      categories={availableCategories}
      brand={brand}
      brands={brandState.data}
      brandsLoading={brandState.loading}
      brandsError={brandState.error}
      priceCeiling={priceBounds.max}
      pricesLoading={priceBounds.loading}
      pricesError={priceBounds.error}
      onRetryPrices={() => setRetry(v => v + 1)}
      minPrice={minPrice}
      maxPrice={maxPrice}
      promotion={promotion}
      availability={availability}
      onAnimalChange={value => updateUrl({ targetAnimal: value, category: "" })}
      onCategoryChange={value => updateUrl({ category: value })}
      onBrandChange={value => updateUrl({ brand: value })}
      onMinPriceChange={value => updateUrl({ minPrice: value })}
      onMaxPriceChange={value => updateUrl({ maxPrice: value })}
      onPromotionChange={value => updateUrl({ promotion: value ? "true" : "" })}
      onAvailabilityChange={value => updateUrl({ availability: value })}
      onReset={resetFilters}
      onRetryBrands={() => setRetry(v => v + 1)}
    />
  );

  /* ============================================================
     Rendu
     ============================================================ */

  return (
    <main className="min-h-screen bg-[#F7F8F6]"> 
    <section className="relative overflow-hidden bg-[#010101] px-4 py-12 text-white sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none overflow-hidden text-[#65D900]/[0.12]">
          {[
          "left-3 top-5 h-10 w-10 -rotate-[24deg] sm:left-[3%] sm:h-14 sm:w-14",
          "left-[42%] top-4 h-8 w-8 rotate-[18deg] sm:left-[40%] sm:top-8 sm:h-12 sm:w-12",
          "right-5 top-7 h-16 w-16 rotate-[22deg] sm:right-[8%] sm:h-24 sm:w-24",
          "-right-4 top-[42%] h-20 w-20 -rotate-[25deg] sm:right-5 sm:h-28 sm:w-28",
          "bottom-5 left-4 h-14 w-14 -rotate-[18deg] sm:left-[5%] sm:h-20 sm:w-20",
          "bottom-6 left-[46%] hidden h-12 w-12 rotate-[30deg] lg:block",
          "bottom-3 right-[8%] h-10 w-10 rotate-[18deg] sm:bottom-6 sm:h-16 sm:w-16",
        ].map((position, index) => (
            <PawPrint key={index} focusable="false" fill="currentColor" strokeWidth={0} className={`absolute ${position}`} />
          ))}
        </div>
        <div className="relative z-10 mx-auto max-w-7xl">
  

          <div className="max-w-2xl">
   

            <motion.h1
              className="text-3xl font-extrabold leading-tight sm:text-5xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.span variants={wordVariants} className="inline-block">Tout</motion.span>{" "}
              <motion.span variants={wordVariants} className="inline-block">pour</motion.span>{" "}
              <motion.span variants={wordVariants} className="inline-block">vos</motion.span>{" "}
              <motion.span variants={accentWordVariants} className="inline-block text-[#65D900]">compagnons</motion.span>
            </motion.h1>

            <p className="mt-4 max-w-lg text-sm leading-6 text-gray-400 sm:text-base">
              Découvrez notre sélection d'alimentation, accessoires
              et produits de qualité pour prendre soin de vos animaux.
            </p>
          </div>
        </div>
      </section>
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-3 lg:px-8">
          {[
            { Icon: Truck, title: "Livraison disponible", text: "Faites-vous livrer vos commandes" },
            { Icon: PackageCheck, title: "Produits sélectionnés", text: "Pour le bien-être de vos animaux" },
            { Icon: RotateCcw, title: "Service client", text: "Nous sommes là pour vous aider" },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="text-[#58C900]" size={24} />
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#58B900]">
              Notre sélection
            </p>
            <h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Tous les produits</h1>
            <p className="mt-2 text-sm text-gray-500">
              Trouvez tout ce dont vos animaux ont besoin.
            </p>
          </div>
          <span aria-live="polite" className="text-sm font-medium text-gray-500">
            {isFirstLoad ? (
              <Skeleton className="h-4 w-24" />
            ) : result.error && products.length === 0 ? (
              "Catalogue indisponible"
            ) : (
              <>
                {result.total} produit(s) trouvé(s)
                {isRefreshing && (
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-[#65D900]"
                  />
                )}
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
          <aside className="hidden h-fit rounded-2xl border border-gray-100 bg-white p-6 lg:sticky lg:top-28 lg:block">
            {sidebarFirstLoad ? <SidebarSkeleton /> : filters}
          </aside>

          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              {/* Barre de recherche — même pattern que l'admin */}
              <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-[#65D900]">
                <Search className="mr-3 text-gray-400" size={20} />
                <input
                  aria-label="Rechercher par nom"
                  type="search"
                  value={searchInput}
                  onChange={event => setSearchInput(event.target.value)}
                  placeholder="Rechercher un produit"
                  className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    aria-label="Effacer la recherche"
                    className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  aria-expanded={showFilters}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 lg:hidden"
                >
                  <SlidersHorizontal size={18} />
                  Filtres
                </button>
                <div className="relative flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-3">
                  <select
                    aria-label="Trier les produits"
                    value={sort}
                    onChange={event => updateUrl({ sort: event.target.value })}
                    className="w-full appearance-none bg-transparent py-3 pr-6 text-sm font-medium text-gray-700 outline-none"
                  >
                    <option value="newest">Nouveautés</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    <option value="rating-desc">Les mieux notés</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 text-gray-400"
                  />
                </div>
              </div>
            </div>

            {cartMessage.text && <p role={cartMessage.error ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${cartMessage.error ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-white text-gray-700"}`}>{cartMessage.text}</p>}
            <div ref={productListRef} aria-busy={listLoading} className="scroll-mt-28">
              {/* 1. Skeleton : uniquement au TOUT premier chargement */}
              {isFirstLoad ? (
                <ProductGridSkeleton count={12} />
              ) : result.error && products.length === 0 ? (
                <div role="alert" className="rounded-2xl bg-white px-5 py-16 text-center">
                  <p className="font-semibold text-red-700">{result.error}</p>
                  <button
                    onClick={() => setRetry(v => v + 1)}
                    className="mt-5 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black"
                  >
                    Réessayer
                  </button>
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl bg-white px-5 py-16 text-center">
                  <Search className="mx-auto mb-4 text-gray-300" size={45} />
                  <h2 className="text-lg font-bold text-gray-900">Aucun produit trouvé</h2>
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
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={addToCart}
                      cartReady={cartReady}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {!isFirstLoad &&
          !(result.error && products.length === 0) &&
          result.totalPages > 0 && (
            <nav
              aria-label="Pagination du catalogue"
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
            >
              <button
                disabled={result.page <= 1}
                onClick={() => updateUrl({ page: String(result.page - 1) }, false)}
                className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-800 disabled:opacity-40"
              >
                Précédent
              </button>
              {Array.from(
                new Set([
                  1,
                  ...Array.from({ length: 5 }, (_, index) => result.page + index - 2),
                  result.totalPages,
                ])
              )
                .filter(page => page >= 1 && page <= result.totalPages)
                .sort((a, b) => a - b)
                .map((page, index, pages) => (
                  <span key={page} className="flex items-center gap-2">
                    {index > 0 && page - pages[index - 1] > 1 && (
                      <span aria-hidden="true" className="text-gray-500">
                        …
                      </span>
                    )}
                    <button
                      aria-label={`Page ${page}`}
                      aria-current={page === result.page ? "page" : undefined}
                      onClick={() => updateUrl({ page: String(page) }, false)}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                        page === result.page
                          ? "bg-[#65D900] text-black"
                          : "bg-white text-gray-800"
                      }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}
              <button
                disabled={result.page >= result.totalPages}
                onClick={() => updateUrl({ page: String(result.page + 1) }, false)}
                className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-800 disabled:opacity-40"
              >
                Suivant
              </button>
              <p className="w-full text-center text-sm text-gray-500">
                Page {result.page} sur {result.totalPages} · {result.total} résultat(s)
              </p>
            </nav>
          )}
      </section>

      {showFilters && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <button
            aria-label="Fermer les filtres"
            onClick={() => setShowFilters(false)}
            className="absolute inset-0 bg-black/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtrer les produits"
            onKeyDown={event => {
              if (event.key === "Escape") setShowFilters(false);
            }}
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-gray-900">Filtrer les produits</h2>
              <button
                autoFocus
                onClick={() => setShowFilters(false)}
                aria-label="Fermer"
                className="rounded-full bg-gray-100 p-2"
              >
                <X size={20} />
              </button>
            </div>
            {filters}
            <button
              onClick={() => setShowFilters(false)}
              className="mt-7 w-full rounded-xl bg-[#65D900] py-4 font-bold text-black"
            >
              Voir les résultats
            </button>
          </div>
        </div>
      )}

      {cartCount > 0 && (
        <Link
          href="/panier"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#010101] px-5 py-4 text-white shadow-xl transition hover:scale-105"
        >
          <ShoppingCart size={20} className="text-[#65D900]" />
          <span className="text-sm font-bold">Panier ({cartCount})</span>
        </Link>
      )}
    </main>
  );
}
