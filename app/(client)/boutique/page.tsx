"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SidebarFilter from "@/components/SidebarFilter";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingCart, SlidersHorizontal, X, ChevronDown, Heart, PackageCheck, Truck, RotateCcw } from "lucide-react";

type Animal = "chien" | "chat" | "oiseaux" | "poissons";
type Product = {
  id: number;
  name: string;
  brand: string | null;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
};
const animals: Record<Animal, string> = { chien: "Chien", chat: "Chat", oiseaux: "Oiseaux", poissons: "Poissons" };
// Same predefined identifiers and labels as the admin and category pages.
const categories: Record<Animal, { id: string; name: string }[]> = {
  chien: [
    { id: "alimentation", name: "Alimentation" }, { id: "colliers-laisses", name: "Colliers et laisses" },
    { id: "hygiene-soins", name: "Hygiène et soins" }, { id: "jouets-divertissement", name: "Jouets et divertissement" },
    { id: "transport", name: "Transport" }, { id: "couchage-niches", name: "Couchage et niches" }, { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  chat: [
    { id: "alimentation", name: "Alimentation" }, { id: "colliers-harnais", name: "Colliers" },
    { id: "hygiene-soins", name: "Hygiène et soins" }, { id: "litieres-proprete", name: "Litières et propreté" },
    { id: "jouets-divertissement", name: "Jouets et divertissement" }, { id: "transport", name: "Transport" },
    { id: "couchage", name: "Couchage" }, { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  oiseaux: [{ id: "alimentation", name: "Alimentation" }, { id: "cages-accessoires", name: "Cages et accessoires" }, { id: "sante-soins", name: "Santé et soins" }],
  poissons: [{ id: "alimentation", name: "Alimentation" }, { id: "aquariums", name: "Aquariums" }, { id: "equipements", name: "Équipements" }, { id: "decorations", name: "Décorations" }],
};
const allCategories = Array.from(new Map(Object.values(categories).flat().map(item => [item.id, item])).values());
const formatPrice = (price: string) => `${Number(price).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
const fallbackImage = "/logo-animalerie.png";

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const validSource = (/^\/(?!\/)/.test(product.image) || /^https?:\/\//i.test(product.image));
  const src = !failed && validSource ? product.image : fallbackImage;
  return <Image src={src} alt={product.name} fill unoptimized={/^https?:\/\//i.test(src)}
    sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 300px"
    onError={() => setFailed(true)}
    className={src === fallbackImage ? "object-contain p-6" : "object-cover transition duration-500 group-hover:scale-110"} />;
}


function SearchInput({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <input aria-label="Rechercher par nom" type="search" value={draft}
    onChange={event => {
      const value = event.target.value;
      setDraft(value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onSearch(value.trim()), 300);
    }}
    placeholder="Rechercher un produit?" className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400" />;
}

export default function ProductsPage() {
  return <Suspense fallback={<div role="status" className="min-h-screen bg-[#F7F8F6] p-10 text-center">Chargement du catalogue…</div>}><Catalogue /></Suspense>;
}

function Catalogue() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.toString();
  const search = searchParams.get("q") ?? "";
  const animalValue = searchParams.get("targetAnimal") ?? "";
  const animal: Animal | "" = Object.hasOwn(animals, animalValue) ? animalValue as Animal : "";
  const category = searchParams.get("category") ?? "";
  const brand = searchParams.get("brand") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const promotion = searchParams.get("promotion") === "true";
  const sort = searchParams.get("sort") || "newest";
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [retry, setRetry] = useState(0);
  const [brandState, setBrandState] = useState<{ data: string[]; error: boolean; loading: boolean }>({ data: [], error: false, loading: true });
  const [priceBounds, setPriceBounds] = useState<{ max: number | null; loading: boolean; error: boolean }>({ max: null, loading: true, error: false });
  const [result, setResult] = useState<{ key: string; data: Product[]; total: number; page: number; totalPages: number; error: string | null }>({ key: "", data: [], total: 0, page: 1, totalPages: 0, error: null });

  function updateUrl(changes: Record<string, string>, resetPage = true, replace = false) {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value.trim()) next.set(key, value); else next.delete(key);
    }
    for (const [key, value] of [...next]) if (!value.trim()) next.delete(key);
    if (resetPage) next.set("page", "1");
    const href = pathname + (next.size ? "?" + next.toString() : "");
    if (replace) router.replace(href, { scroll: false }); else router.push(href, { scroll: false });
  }
  const params = new URLSearchParams();
  for (const key of ["q", "targetAnimal", "category", "brand", "minPrice", "maxPrice", "promotion", "sort", "page"]) {
    for (const value of searchParams.getAll(key)) if (value.trim()) params.append(key, value);
  }
  params.set("pageSize", "12");
  const query = params.toString();
  const requestKey = `${query}|${retry}`;
  const loading = result.key !== requestKey;
  const products = loading || result.error ? [] : result.data;
  const availableCategories = animal ? categories[animal] : allCategories;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    // Ignore responses from previous filters or pages.
    async function loadProducts() {
      try {
        const response = await fetch(`/api/products?${query}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.issues?.[0]?.message ?? data.error ?? "Impossible de charger les produits.");
        if (!Array.isArray(data.products) || !Number.isInteger(data.total) || !Number.isInteger(data.page) || !Number.isInteger(data.totalPages)) throw new Error("R\u00e9ponse du catalogue incorrecte.");
        if (active) {
          setResult({ key: requestKey, data: data.products, total: data.total, page: data.page, totalPages: data.totalPages, error: null });
          const current = new URLSearchParams(window.location.search);
          // Canonicalize clamped pages without adding a browser history entry.
          if (current.toString() === urlQuery && current.get("page") && Number(current.get("page")) !== data.page) {
            current.set("page", String(data.page));
            router.replace(pathname + "?" + current.toString(), { scroll: false });
          }
        }
      } catch (error) {
        if (active) setResult({ key: requestKey, data: [], total: 0, page: 1, totalPages: 0, error: error instanceof Error ? error.message : "Impossible de charger les produits." });
      }
    }
    void loadProducts();
    return () => { active = false; controller.abort(); };
  }, [query, requestKey, pathname, router, urlQuery]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadBrands() {
      setBrandState(previous => ({ ...previous, error: false, loading: true }));
      try {
        const response = await fetch("/api/products?brandsOnly=true", { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data) || !data.every(value => typeof value === "string")) throw new Error("Marques indisponibles");
        if (active) setBrandState({ data, error: false, loading: false });
      } catch {
        if (active) setBrandState({ data: [], error: true, loading: false });
      }
    }
    void loadBrands();
    return () => { active = false; controller.abort(); };
  }, [retry]);


  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadPriceCeiling() {
      setPriceBounds(previous => ({ ...previous, loading: true, error: false }));
      try {
        // No catalogue filter: the first result is the highest effective price.
        const response = await fetch("/api/products?sort=price-desc&page=1&pageSize=1", {
          signal: controller.signal, cache: "no-store",
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
    }
    void loadPriceCeiling();
    return () => { active = false; controller.abort(); };
  }, [retry]);

  function resetFilters() {
    updateUrl({ q: "", targetAnimal: "", category: "", brand: "", minPrice: "", maxPrice: "", promotion: "", sort: "", page: "" }, false);
  }
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
      onRetryPrices={() => setRetry(value => value + 1)}
      minPrice={minPrice}
      maxPrice={maxPrice}
      promotion={promotion}
      onAnimalChange={value => updateUrl({ targetAnimal: value, category: "" })}
      onCategoryChange={value => updateUrl({ category: value })}
      onBrandChange={value => updateUrl({ brand: value })}
      onMinPriceChange={value => updateUrl({ minPrice: value })}
      onMaxPriceChange={value => updateUrl({ maxPrice: value })}
      onPromotionChange={value => updateUrl({ promotion: value ? "true" : "" })}
      onReset={resetFilters}
      onRetryBrands={() => setRetry(value => value + 1)}
    />
  );

  return (
    <main className="min-h-screen bg-[#F7F8F6]">
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-3 lg:px-8">
          {[{ Icon: Truck, title: "Livraison disponible", text: "Faites-vous livrer vos commandes" }, { Icon: PackageCheck, title: "Produits sélectionnés", text: "Pour le bien-être de vos animaux" }, { Icon: RotateCcw, title: "Service client", text: "Nous sommes là pour vous aider" }].map(({ Icon, title, text }) => (
            <div key={title} className="flex items-center gap-3"><Icon className="text-[#58C900]" size={24} /><div><p className="text-sm font-bold text-gray-900">{title}</p><p className="text-xs text-gray-500">{text}</p></div></div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#58B900]">Notre sélection</p><h1 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">Tous les produits</h1><p className="mt-2 text-sm text-gray-500">Trouvez tout ce dont vos animaux ont besoin.</p></div>
          <span aria-live="polite" className="text-sm font-medium text-gray-500">{loading ? "Chargement…" : result.error ? "Catalogue indisponible" : `${result.total} produit(s) trouvé(s)`}</span>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[250px_1fr]">
          <aside className="hidden h-fit rounded-2xl border border-gray-100 bg-white p-6 lg:sticky lg:top-28 lg:block">{filters}</aside>
          <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-4 py-3 focus-within:border-[#65D900]">
                <Search className="mr-3 text-gray-400" size={20} />
                <SearchInput key={urlQuery} value={search} onSearch={value => updateUrl({ q: value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowFilters(true)} aria-expanded={showFilters} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 lg:hidden"><SlidersHorizontal size={18} />Filtres</button>
                <div className="relative flex flex-1 items-center rounded-xl border border-gray-200 bg-white px-3">
                  <select aria-label="Trier les produits" value={sort} onChange={event => updateUrl({ sort: event.target.value })} className="w-full appearance-none bg-transparent py-3 pr-6 text-sm font-medium text-gray-700 outline-none">
                    <option value="newest">Nouveautés</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option>
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 text-gray-400" />
                </div>
              </div>
            </div>
            <div aria-busy={loading}>
              {loading ? <div role="status" className="rounded-2xl bg-white px-5 py-16 text-center text-gray-600">Chargement des produits…</div>
              : result.error ? <div role="alert" className="rounded-2xl bg-white px-5 py-16 text-center"><p className="font-semibold text-red-700">{result.error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-5 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black">Réessayer</button></div>
              : products.length === 0 ? <div className="rounded-2xl bg-white px-5 py-16 text-center"><Search className="mx-auto mb-4 text-gray-300" size={45} /><h2 className="text-lg font-bold text-gray-900">Aucun produit trouvé</h2><p className="mt-2 text-sm text-gray-500">Essayez de modifier vos filtres ou votre recherche.</p><button onClick={resetFilters} className="mt-5 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black">Réinitialiser les filtres</button></div>
              : <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                {products.map(product => {
                  const hasPromo = product.promoPrice !== null;
                  const discount = hasPromo ? Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100) : 0;
                  return <article key={product.id} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      <ProductImage key={product.image} product={product} />
                      {hasPromo && <span className="absolute left-3 top-3 rounded-full bg-[#65D900] px-3 py-1 text-[10px] font-extrabold text-black">−{discount} %</span>}
                      <button onClick={() => setFavorites(previous => previous.includes(product.id) ? previous.filter(id => id !== product.id) : [...previous, product.id])} aria-label="Ajouter aux favoris" aria-pressed={favorites.includes(product.id)} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-[#65D900]"><Heart size={18} className={favorites.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-700"} /></button>
                    </div>
                    <div className="p-3 sm:p-4">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#55B900] sm:text-xs">{categories[product.targetAnimal]?.find(item => item.id === product.category)?.name ?? product.category}</p>
                     <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900 sm:text-base">
  {product.name}
</h2>

{/* Toujours rendu : garde la hauteur même sans marque */}
<p className="mt-2 min-h-4 text-xs text-gray-500">
  {product.brand ?? "\u00A0"}
</p>

<div className="mt-3 flex flex-wrap items-center gap-2">
                        {hasPromo && <del className="text-xs text-gray-400">{formatPrice(product.price)}</del>}
                        <span className="text-base font-extrabold text-gray-900 sm:text-lg">{formatPrice(product.promoPrice ?? product.price)}</span>
                      </div>
                      <button onClick={() => setCartCount(previous => previous + 1)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-2 py-3 text-xs font-bold text-black transition hover:bg-[#55BD00] sm:text-sm"><ShoppingCart size={16} />Ajouter au panier</button>
                    </div>
                  </article>;
                })}
              </div>}
            </div>
          </div>
        </div>

            {!loading && !result.error && result.totalPages > 0 && (
              <nav aria-label="Pagination du catalogue" className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <button disabled={result.page <= 1} onClick={() => updateUrl({ page: String(result.page - 1) }, false)} className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-800 disabled:opacity-40">Précédent</button>
                {Array.from(new Set([1, ...Array.from({ length: 5 }, (_, index) => result.page + index - 2), result.totalPages])).filter(page => page >= 1 && page <= result.totalPages).sort((a, b) => a - b).map((page, index, pages) => (
                  <span key={page} className="flex items-center gap-2">
                    {index > 0 && page - pages[index - 1] > 1 && <span aria-hidden="true" className="text-gray-500">…</span>}
                    <button aria-label={`Page ${page}`} aria-current={page === result.page ? "page" : undefined} onClick={() => updateUrl({ page: String(page) }, false)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${page === result.page ? "bg-[#65D900] text-black" : "bg-white text-gray-800"}`}>{page}</button>
                  </span>
                ))}
                <button disabled={result.page >= result.totalPages} onClick={() => updateUrl({ page: String(result.page + 1) }, false)} className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-800 disabled:opacity-40">Suivant</button>
                <p className="w-full text-center text-sm text-gray-500">Page {result.page} sur {result.totalPages} · {result.total} résultat(s)</p>
              </nav>
            )}
      </section>
      {showFilters && <div className="fixed inset-0 z-[100] lg:hidden">
        <button aria-label="Fermer les filtres" onClick={() => setShowFilters(false)} className="absolute inset-0 bg-black/60" />
        <div role="dialog" aria-modal="true" aria-label="Filtrer les produits" onKeyDown={event => { if (event.key === "Escape") setShowFilters(false); }} className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-extrabold text-gray-900">Filtrer les produits</h2><button autoFocus onClick={() => setShowFilters(false)} aria-label="Fermer" className="rounded-full bg-gray-100 p-2"><X size={20} /></button></div>
          {filters}
          <button onClick={() => setShowFilters(false)} className="mt-7 w-full rounded-xl bg-[#65D900] py-4 font-bold text-black">{loading ? "Chargement…" : "Voir les résultats"}</button>
        </div>
      </div>}
      {cartCount > 0 && <Link href="/panier" className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#010101] px-5 py-4 text-white shadow-xl transition hover:scale-105"><ShoppingCart size={20} className="text-[#65D900]" /><span className="text-sm font-bold">Panier ({cartCount})</span></Link>}
    </main>
  );
}
