"use client";

import { useToast } from "@/components/ToastProvider";

import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import ProductImageZoom from "@/components/ProductImageZoom";
import ProductCard, { type Product as CardProduct } from "@/components/ProductCard";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  PackageSearch,
  Phone,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from "lucide-react";
import { animals, categories, fallbackImage, formatPrice, type Animal } from "@/lib/catalogue";
import { MAX_CART_QUANTITY, useCart } from "@/lib/cart";
import { useAuth } from "@/components/AuthProvider";
import { accountRequest } from "@/components/AccountArea";

/* ============================================================
   Types
   ============================================================ */

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Product = {
  id: number;
  name: string;
  description: string;
  brand: string | null;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
  characteristics: Record<string, JsonValue>;
};
type Result = { product: Product } | { error: string; notFound: boolean };

/* ============================================================
   Helpers
   ============================================================ */

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return (
    Number.isInteger(product.id) &&
    ["name", "description", "category", "image"].every(key => typeof product[key] === "string") &&
    (product.brand === null || typeof product.brand === "string") &&
    typeof product.targetAnimal === "string" &&
    Object.hasOwn(animals, product.targetAnimal) &&
    typeof product.price === "string" &&
    Number.isFinite(Number(product.price)) &&
    Number(product.price) > 0 &&
    (product.promoPrice === null ||
      (typeof product.promoPrice === "string" &&
        product.promoPrice.trim() !== "" &&
        Number.isFinite(Number(product.promoPrice)) &&
        Number(product.promoPrice) >= 0 &&
        Number(product.promoPrice) < Number(product.price))) &&
    product.characteristics !== null &&
    typeof product.characteristics === "object" &&
    !Array.isArray(product.characteristics)
  );
}

function describeValue(value: JsonValue): string {
  if (value === null) return "Non renseigné";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (Array.isArray(value)) return value.length ? value.map(describeValue).join(", ") : "Aucune valeur";
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length
      ? entries.map(([name, item]) => `${name} : ${describeValue(item)}`).join(" ; ")
      : "Aucune valeur";
  }
  return String(value).trim() || "Non renseigné";
}

/* ============================================================
   Skeletons
   ============================================================ */

function ProductLoading() {
  return (
    <div role="status" aria-label="Chargement du produit" className="grid gap-8 lg:grid-cols-2">
      <span className="sr-only">Chargement du produit…</span>
      <div aria-hidden="true" className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
      <div aria-hidden="true" className="space-y-5 py-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-4/5 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-40 animate-pulse rounded bg-gray-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

/* ============================================================
   Page
   ============================================================ */

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#F7F8F6] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:px-8">
        <Link
          href="/boutique"
          className="mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-gray-600 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]"
        >
          <ArrowLeft size={17} aria-hidden="true" /> Retour à la boutique
        </Link>
        <Suspense fallback={<ProductLoading />}>
          <ProductRoute />
        </Suspense>
      </div>
    </div>
  );
}

function ProductRoute() {
  const { id } = useParams<{ id: string }>();
  return <ProductDetails key={id} id={id} />;
}

function ProductDetails({ id }: { id: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const validId = /^[1-9]\d*$/.test(id) && Number(id) <= 2147483647;

  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${id}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.status === 404) {
          if (!controller.signal.aborted)
            setResult({ error: "Ce produit n’existe pas ou a été supprimé.", notFound: true });
          return;
        }
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            typeof data?.error === "string" ? data.error : "Impossible de charger ce produit."
          );
        if (!isProduct(data) || data.id !== Number(id))
          throw new Error("La réponse du serveur est incorrecte.");
        if (!controller.signal.aborted) setResult({ product: data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({
            error:
              error instanceof SyntaxError
                ? "La réponse du serveur est incorrecte."
                : error instanceof TypeError
                  ? "Impossible de contacter le serveur. Veuillez réessayer."
                  : error instanceof Error
                    ? error.message
                    : "Impossible de charger ce produit.",
            notFound: false,
          });
        }
      }
    }
    void loadProduct();
    return () => controller.abort();
  }, [id, validId, retry]);

  if (validId && !result) return <ProductLoading />;
  if (!validId || (result && "error" in result)) {
    const notFound = !validId || (result && "notFound" in result && result.notFound);
    return (
      <section
        role="alert"
        className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center"
      >
        <PackageSearch size={44} aria-hidden="true" className="mx-auto mb-4 text-gray-400" />
        <h1 className="text-xl font-extrabold">
          {notFound ? "Produit introuvable" : "Produit indisponible"}
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          {!validId
            ? "L’identifiant du produit est invalide."
            : result && "error" in result
              ? result.error
              : ""}
        </p>
        {!notFound && (
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setRetry(value => value + 1);
            }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]"
          >
            <RotateCcw size={16} aria-hidden="true" /> Réessayer
          </button>
        )}
      </section>
    );
  }
  return result && "product" in result ? <ProductContent product={result.product} /> : null;
}

/* ============================================================
   Contenu produit
   ============================================================ */

function ProductContent({ product }: { product: Product }) {
  const { user } = useAuth();
  const reviews = useProductReviews(product.id);
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const { count: cartCount, ready: cartReady, addItem } = useCart();
  const [cartError, setCartError] = useState("");
  const toast = useToast();

  const quantityNumber = Number(quantity);
  const validQuantity = /^\d+$/.test(quantity) && Number.isSafeInteger(quantityNumber) && quantityNumber > 0 && quantityNumber <= MAX_CART_QUANTITY;
  const hasPromo = product.promoPrice !== null;
  const discount = hasPromo
    ? Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100)
    : 0;
  const category =
    categories[product.targetAnimal].find(item => item.id === product.category)?.name ??
    product.category;
  const validImage = /^\/(?!\/)/.test(product.image) || /^https?:\/\//i.test(product.image);
  const imageSource = !imageFailed && validImage ? product.image : fallbackImage;
  const characteristics = Object.entries(product.characteristics);

  return (
    <article className="space-y-10">
      {/* ============================================================
          Bloc principal : image + infos
          ============================================================ */}
      <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-12">
        {/* --- Colonne image + partage --- */}
        <div className="space-y-4">
          <ProductImageZoom
            src={imageSource}
            alt={
              imageSource === fallbackImage
                ? "Image de remplacement — Animalerie Khalil"
                : product.name
            }
            onError={() => setImageFailed(true)}
            discount={hasPromo ? discount : undefined}
          />

          {/* Partage social */}
          <ShareBlock productName={product.name} />
        </div>

        {/* --- Colonne infos --- */}
        <div className="min-w-0 lg:py-2">
          {/* Breadcrumb discret */}
          <nav aria-label="Fil d’Ariane" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <Link href="/boutique" className="hover:text-gray-800">
              Boutique
            </Link>
            <ChevronRight size={12} aria-hidden="true" className="text-gray-400" />
            <Link
              href={`/boutique?targetAnimal=${product.targetAnimal}`}
              className="hover:text-gray-800"
            >
              {animals[product.targetAnimal]}
            </Link>
            <ChevronRight size={12} aria-hidden="true" className="text-gray-400" />
            <span className="truncate text-gray-700">{category}</span>
          </nav>

          {product.brand && (
            <p className="mb-2 break-words text-xs font-bold uppercase tracking-widest text-[#55B900]">
              {product.brand}
            </p>
          )}
          <h1 className="break-words text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
            {product.name}
          </h1>

          {/* Note moyenne */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            {reviews.loading ? <span role="status" className="h-5 w-40 animate-pulse rounded bg-gray-200"><span className="sr-only">Chargement des avis…</span></span> :
              reviews.data ? <a href="#reviews-title" className="flex items-center gap-2 rounded focus-visible:outline-2 focus-visible:outline-[#65D900]">
                <Stars value={reviews.data.averageRating ?? 0} size={16} />
                <span className="font-semibold text-gray-800">{reviews.data.averageRating === null ? "Pas encore de note" : reviews.data.averageRating.toFixed(1).replace(".", ",")}</span>
                <span className="text-gray-500">· {reviews.data.reviewCount} avis</span>
              </a> : <a href="#reviews-title" className="text-gray-500 underline">Avis indisponibles</a>}
          </div>

          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Animal cible</dt>
              <dd className="mt-1 font-semibold">{animals[product.targetAnimal]}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-gray-500">Catégorie</dt>
              <dd className="mt-1 break-words font-semibold">{category}</dd>
            </div>
          </dl>

          <div className="my-6 border-y border-gray-200 py-5">
            {hasPromo && (
              <p className="mb-1 text-sm text-gray-500">
                <span className="sr-only">Prix normal : </span>
                <del>{formatPrice(product.price)}</del>
              </p>
            )}
            <p className="break-words text-3xl font-extrabold">
              <span className="sr-only">{hasPromo ? "Prix promotionnel : " : "Prix : "}</span>
              {formatPrice(product.promoPrice ?? product.price)}
            </p>
            {hasPromo && (
              <p className="mt-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                <Tag size={16} aria-hidden="true" />
                {discount} % de réduction
              </p>
            )}
          </div>

          <label htmlFor="product-quantity" className="mb-2 block text-sm font-semibold">
            Quantité
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex w-fit shrink-0 items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#65D900]">
              <button
                type="button"
                aria-label="Diminuer la quantité"
                disabled={!validQuantity || quantityNumber <= 1}
                onClick={() => {
                  setQuantity(String(quantityNumber - 1));

                }}
                className="p-3.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#65D900] disabled:opacity-40"
              >
                <Minus size={18} aria-hidden="true" />
              </button>
              <input
                id="product-quantity"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_CART_QUANTITY}
                step="1"
                value={quantity}
                aria-invalid={!validQuantity}
                aria-describedby={!validQuantity ? "quantity-error" : undefined}
                onChange={event => {
                  setQuantity(event.target.value);

                }}
                onBlur={() => {
                  if (!validQuantity) setQuantity("1");
                }}
                className="w-16 min-w-0 bg-transparent py-3 text-center text-sm font-bold focus-visible:outline-2 focus-visible:outline-[#65D900]"
              />
              <button
                type="button"
                aria-label="Augmenter la quantité"
                disabled={!validQuantity || quantityNumber >= MAX_CART_QUANTITY}
                onClick={() => {
                  setQuantity(String(quantityNumber + 1));

                }}
                className="p-3.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#65D900] disabled:opacity-40"
              >
                <Plus size={18} aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              disabled={!cartReady || !validQuantity}
              onClick={() => {
                const added = addItem(product, quantityNumber);
                if (added) toast(quantityNumber + " article(s) ajouté(s) au panier.");
                setCartError(added ? "" : "Impossible d’ajouter ce produit. Vérifiez que le stockage du navigateur est autorisé et que la quantité totale ne dépasse pas 9 999.");
              }}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#65D900] px-4 py-3.5 text-sm font-bold text-black transition hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart size={19} aria-hidden="true" className="shrink-0" /> Ajouter au panier
            </button>
          </div>
          {!validQuantity && (
            <p id="quantity-error" className="mt-2 text-sm text-red-700">
              Choisissez une quantité entière entre 1 et {MAX_CART_QUANTITY.toLocaleString("fr-TN")}.
            </p>
          )}
          {cartError && <p role="alert" className="mt-3 text-sm text-red-700">{cartError}</p>}

          {cartCount > 0 && (
            <Link
              href="/panier"
              className="mt-3 inline-flex items-center gap-3 rounded-xl bg-[#010101] px-5 py-3 text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]"
            >
              <ShoppingCart size={20} aria-hidden="true" className="text-[#65D900]" />
              <span className="text-sm font-bold">Panier ({cartCount})</span>
            </Link>
          )}

          {/* Réassurance */}
          <ul className="mt-6 grid gap-3 rounded-2xl border border-gray-100 bg-white p-4 sm:grid-cols-3">
            {[
              { Icon: Truck, label: "Livraison disponible" },
              { Icon: ShieldCheck, label: "Produit sélectionné" },
              { Icon: RotateCcw, label: "Service client" },
            ].map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <Icon size={16} className="text-[#55B900]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>

          {/* Encart contact */}
          <ContactCard />
        </div>
      </div>

      {/* ============================================================
          Description + caractéristiques
          ============================================================ */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="product-description"
          className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-7"
        >
          <h2 id="product-description" className="mb-4 text-lg font-extrabold">
            Description
          </h2>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
            {product.description}
          </p>
        </section>
        <section
          aria-labelledby="product-characteristics"
          className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white"
        >
          <h2
            id="product-characteristics"
            className="px-5 pb-4 pt-5 text-lg font-extrabold sm:px-7 sm:pt-7"
          >
            Caractéristiques
          </h2>
          {characteristics.length ? (
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Caractéristiques de {product.name}</caption>
              <tbody>
                {characteristics.map(([name, value]) => (
                  <tr key={name} className="border-t border-gray-100 odd:bg-gray-50/60">
                    <th
                      scope="row"
                      className="w-2/5 break-words px-5 py-3 align-top font-semibold sm:px-7"
                    >
                      {name}
                    </th>
                    <td className="whitespace-pre-wrap break-words px-5 py-3 align-top text-gray-600 sm:px-7">
                      {describeValue(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 pb-5 text-sm text-gray-500 sm:px-7 sm:pb-7">
              Aucune caractéristique renseignée.
            </p>
          )}
        </section>
      </div>

      {/* ============================================================
          Avis clients
          ============================================================ */}
      <ReviewsSection key={user?.id ?? "guest"} productId={product.id} productName={product.name} {...reviews} />

      <SimilarProducts key={product.id} product={product} />
    </article>
  );
}

/* ============================================================
   Produits similaires
   ============================================================ */

function SimilarProducts({ product }: { product: Product }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [navigation, setNavigation] = useState({ previous: false, next: false });
  const toast = useToast();
  const [cartMessage, setCartMessage] = useState({ text: "", error: false });
  const { addItem, ready: cartReady } = useCart();
  const rail = useRef<HTMLUListElement>(null);
  const titleId = useId();
  const railId = useId();
  const { id, targetAnimal, category } = product;

  useEffect(() => {
    const controller = new AbortController();
    async function loadSimilarProducts() {
      try {
        const query = new URLSearchParams({ targetAnimal, category, excludeId: String(id), pageSize: "10", sort: "newest" });
        const response = await fetch(`/api/products?${query}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Produits similaires indisponibles.");
        const data = await response.json();
        if (!Array.isArray(data?.products) || !data.products.every(isProduct)) {
          throw new Error("Réponse catalogue incorrecte.");
        }
        if (!controller.signal.aborted) {
          setProducts(data.products.filter((item: Product) => item.id !== id && item.targetAnimal === targetAnimal && item.category === category).slice(0, 10));
        }
      } catch {
        if (!controller.signal.aborted) setProducts([]);
      }
    }
    void loadSimilarProducts();
    return () => controller.abort();
  }, [id, targetAnimal, category]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    function updateNavigation() {
      if (!element) return;
      const previous = element.scrollLeft > 2;
      const next = element.scrollLeft + element.clientWidth < element.scrollWidth - 2;
      setNavigation(current => current.previous === previous && current.next === next ? current : { previous, next });
    }
    updateNavigation();
    element.addEventListener("scroll", updateNavigation, { passive: true });
    const observer = new ResizeObserver(updateNavigation);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", updateNavigation);
      observer.disconnect();
    };
  }, [products.length]);

  function scroll(direction: number) {
    const element = rail.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  const addToCart = useCallback((item: CardProduct) => {
    const added = addItem(item);
    if (added) toast(`${item.name} ajouté au panier.`);
    setCartMessage({
      text: added ? "" : "Impossible d’ajouter ce produit. Vérifiez que le stockage du navigateur est autorisé et que la quantité ne dépasse pas 9 999.",
      error: !added,
    });
  }, [addItem, toast]);

  if (products.length === 0) return null;

  const arrowClass = "flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-800 transition hover:border-[#65D900] hover:bg-[#65D900] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900] disabled:cursor-default disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:bg-white motion-reduce:transition-none";

  return (
    <section aria-labelledby={titleId} className="min-w-0 border-t border-gray-200 pt-8 sm:pt-10">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#55B900]">À découvrir aussi</p>
          <h2 id={titleId} className="text-2xl font-extrabold tracking-tight sm:text-3xl">Produits similaires</h2>
          <p className="mt-2 text-sm text-gray-500">D’autres produits de la même catégorie pour votre compagnon.</p>
        </div>
        <div role="group" aria-label="Navigation des produits similaires" className="hidden shrink-0 gap-2 lg:flex">
          <button type="button" aria-label="Produits précédents" aria-controls={railId} disabled={!navigation.previous} onClick={() => scroll(-1)} className={arrowClass}><ChevronLeft size={21} aria-hidden="true" /></button>
          <button type="button" aria-label="Produits suivants" aria-controls={railId} disabled={!navigation.next} onClick={() => scroll(1)} className={arrowClass}><ChevronRight size={21} aria-hidden="true" /></button>
        </div>
      </div>
      {cartMessage.text && <p role={cartMessage.error ? "alert" : "status"} className={`mb-4 rounded-xl border bg-white px-4 py-3 text-sm ${cartMessage.error ? "border-red-200 text-red-700" : "border-[#65D900]/40 text-gray-800"}`}>{cartMessage.text}</p>}
      <ul ref={rail} id={railId} tabIndex={0} aria-label="Liste des produits similaires"
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-1 py-4 [scrollbar-width:none] focus-visible:rounded-2xl focus-visible:outline-2 focus-visible:outline-[#65D900] [&::-webkit-scrollbar]:hidden">
        {products.map(item => <li key={item.id} className="w-[72%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-3rem)/4)]">
          <ProductCard product={item} onAddToCart={addToCart} cartReady={cartReady} />
        </li>)}
      </ul>
    </section>
  );
}

/* ============================================================
   Bloc partage
   ============================================================ */

function ShareBlock({ productName }: { productName: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setUrl(window.location.href);
  }, []);

  const shareUrl = url || "https://animalerie-khalil.tn/boutique";
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <section
      aria-labelledby="share-title"
      className="rounded-2xl border border-gray-100 bg-white p-4"
    >
      <h2 id="share-title" className="mb-3 text-sm font-bold text-gray-800">
        Partager ce produit
      </h2>
      <div className="flex items-center gap-2">
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Partager « ${productName} » sur Facebook`}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0e64da] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]"
        >
          {/* Icône Facebook (inline SVG pour éviter une dépendance) */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.77l-.44 2.91h-2.33V22c4.78-.76 8.45-4.92 8.45-9.94Z" />
          </svg>
          Facebook
        </a>
      </div>
    </section>
  );
}

/* ============================================================
   Encart contact
   ============================================================ */

function ContactCard() {
  return (
    <aside
      aria-labelledby="contact-title"
      className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#65D900]/30 bg-[#65D900]/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#65D900]/20 text-[#438F00]">
          <MessageCircle size={18} aria-hidden="true" />
        </span>
        <div>
          <p id="contact-title" className="text-sm font-bold text-gray-900">
            Une question sur ce produit ?
          </p>
          <p className="mt-0.5 text-xs text-gray-600">Notre équipe vous répond avec plaisir.</p>
        </div>
      </div>
      <a
        href="tel:+21699434597"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#010101] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]"
      >
        <Phone size={16} aria-hidden="true" className="text-[#65D900]" />
        99 434 597
      </a>
    </aside>
  );
}

/* ============================================================
   Étoiles (affichage)
   ============================================================ */

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = value >= star;
        const half = !filled && value >= star - 0.5;
        return (
          <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
            <Star
              size={size}
              className="absolute inset-0 text-gray-300"
              fill="currentColor"
              strokeWidth={0}
            />
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: filled ? size : size / 2 }}
              >
                <Star
                  size={size}
                  className="text-[#FFB400]"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/* ============================================================
   Étoiles interactives (accessibles clavier)
   ============================================================ */

function StarRatingInput({
  value,
  onChange,
  labelledBy,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  labelledBy: string;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const current = hover || value;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(5, value + 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(1, value - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(1);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(5);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(star)}
          onFocus={() => setHover(star)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(star)}
          className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]"
        >
          <Star
            size={22}
            className={current >= star ? "text-[#FFB400]" : "text-gray-300"}
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   Avis clients
   ============================================================ */

type Review = {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  user: { name: string; image: string | null };
};
type ReviewsData = { reviews: Review[]; averageRating: number | null; reviewCount: number };

function reviewStatistics(reviews: Review[]): ReviewsData {
  return {
    reviews,
    reviewCount: reviews.length,
    averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
  };
}

function useProductReviews(productId: number) {
  const { refresh } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; data?: ReviewsData; error?: string }>({ attempt: -1 });
  useEffect(() => {
    const controller = new AbortController();
    void accountRequest<ReviewsData>(`/api/products/${productId}/reviews`, { signal: controller.signal }, refresh)
      .then(data => {
        if (!Array.isArray(data.reviews) || data.reviewCount !== data.reviews.length ||
          (data.averageRating !== null && (typeof data.averageRating !== "number" || !Number.isFinite(data.averageRating) || data.averageRating < 1 || data.averageRating > 5))) {
          throw new Error("La réponse des avis est incorrecte.");
        }
        if (!controller.signal.aborted) setResult({ attempt, data });
      })
      .catch(reason => {
        if (!controller.signal.aborted) setResult({ attempt, error: reason instanceof Error ? reason.message : "Impossible de charger les avis." });
      });
    return () => controller.abort();
  }, [productId, attempt, refresh]);

  return {
    data: result.attempt === attempt ? result.data : undefined,
    error: result.attempt === attempt ? result.error : undefined,
    loading: result.attempt !== attempt,
    reload: () => setAttempt(value => value + 1),
    onSave: (review: Review) => setResult(current => ({
      ...current,
      data: reviewStatistics([review, ...(current.data?.reviews ?? []).filter(item => item.id !== review.id)]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)),
    })),
    onRemove: (id: number) => setResult(current => ({
      ...current, data: reviewStatistics((current.data?.reviews ?? []).filter(review => review.id !== id)),
    })),
  };
}

function ReviewsSection({
  productId, productName, data, loading, error: loadError, reload, onSave, onRemove,
}: {
  productId: number;
  productName: string;
  data?: ReviewsData;
  loading: boolean;
  error?: string;
  reload: () => void;
  onSave: (review: Review) => void;
  onRemove: (id: number) => void;
}) {
  const { user, loading: authLoading, error: authError, refresh } = useAuth();
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "delete">("");
  const [error, setError] = useState("");
  const setMessage = useToast();
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const ratingLabelId = useId();
  const ownReview = data?.reviews.find(review => review.userId === user?.id);
  const canWrite = Boolean(user && !authLoading && !authError && data && !loading);
  const formDisabled = !canWrite || Boolean(busy);
  const loginHref = `/connexion?next=${encodeURIComponent(`/boutique/${productId}`)}`;

  useEffect(() => () => controller.current?.abort(), []);

  function startEditing(review: Review) {
    setForm({ rating: review.rating, comment: review.comment ?? "" });
    setEditing(true); setError(""); setMessage(""); setConfirmDelete(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !canWrite) return;
    if (!Number.isInteger(form.rating) || form.rating < 1 || form.rating > 5) {
      setError("Veuillez choisir une note entre 1 et 5 étoiles."); return;
    }
    if (form.comment.trim().length > 2000) { setError("Le commentaire ne doit pas dépasser 2 000 caractères."); return; }
    sending.current = true;
    const request = new AbortController();
    controller.current = request;
    setBusy("save"); setError(""); setMessage("");
    const modifying = editing && ownReview;
    try {
      const saved = await accountRequest<{ review: Review }>(
        modifying ? `/api/reviews/${ownReview.id}` : `/api/products/${productId}/reviews`,
        {
          method: modifying ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: form.rating, comment: form.comment.trim() || null }),
          signal: request.signal,
        }, refresh,
      );
      if (request.signal.aborted) return;
      onSave(saved.review);
      setEditing(false); setForm({ rating: 5, comment: "" });
      setMessage(modifying ? "Votre avis a été modifié." : "Merci ! Votre avis a été publié.");
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer votre avis.");
    } finally {
      sending.current = false;
      if (!request.signal.aborted) setBusy("");
    }
  }

  async function removeReview() {
    if (sending.current || !canWrite || !ownReview) return;
    sending.current = true;
    const request = new AbortController();
    controller.current = request;
    setBusy("delete"); setError(""); setMessage("");
    try {
      await accountRequest(`/api/reviews/${ownReview.id}`, { method: "DELETE", signal: request.signal }, refresh);
      if (request.signal.aborted) return;
      onRemove(ownReview.id);
      setEditing(false); setConfirmDelete(false); setForm({ rating: 5, comment: "" });
      setMessage("Votre avis a été supprimé.");
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "Impossible de supprimer votre avis.");
    } finally {
      sending.current = false;
      if (!request.signal.aborted) setBusy("");
    }
  }

  return (
    <section aria-labelledby="reviews-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-title" className="text-xl font-extrabold sm:text-2xl">Avis clients</h2>
          <p className="mt-1 break-words text-xs font-semibold uppercase tracking-widest text-[#55B900]">Votre expérience avec {productName}</p>
        </div>
        {!loading && data && <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3" aria-label={data.averageRating === null ? "Aucune note" : `Note moyenne : ${data.averageRating.toFixed(1)} sur 5, ${data.reviewCount} avis`}>
          <span className="text-3xl font-extrabold text-gray-900">{data.averageRating === null ? "—" : data.averageRating.toFixed(1).replace(".", ",")}</span>
          <div><Stars value={data.averageRating ?? 0} size={18} /><p className="mt-1 text-xs text-gray-500">sur 5 · {data.reviewCount} avis</p></div>
        </div>}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="whitespace-pre-line">{error}</p>
        <button type="button" disabled={Boolean(busy)} onClick={() => { setError(""); reload(); }} className="mt-2 rounded font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2">Actualiser les avis</button>
      </div>}


      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          {loading ? <div role="status" aria-label="Chargement des avis" className="space-y-3">
            {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5"><div className="h-8 w-40 animate-pulse rounded bg-gray-200" /><div className="h-3 w-24 animate-pulse rounded bg-gray-200" /><div className="h-12 animate-pulse rounded bg-gray-200" /></div>)}
          </div> : loadError ? <div role="alert" className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-sm text-red-700">{loadError}</p>
            <button type="button" onClick={reload} className="mt-3 rounded font-bold text-[#438F00] underline focus-visible:outline-2 focus-visible:outline-offset-2">Réessayer</button>
          </div> : data?.reviews.length === 0 ? <p className="rounded-2xl border border-gray-100 bg-white p-5 text-sm leading-6 text-gray-500">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p> :
            <ul className="space-y-3">
              {data?.reviews.map(review => <li key={review.id} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={review.user.image || "/Unknown.jpg"} alt={`Photo de ${review.user.name}`} width={32} height={32}
                      onError={event => { if (!event.currentTarget.src.endsWith("/Unknown.jpg")) event.currentTarget.src = "/Unknown.jpg"; }}
                      className="h-8 w-8 shrink-0 rounded-full bg-gray-100 object-cover" />
                    <span className="min-w-0 break-words text-sm font-bold text-gray-900">{review.user.name}</span>
                  </div>
                  <time dateTime={review.createdAt} className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" })}</time>
                </div>
                <div className="mt-2" aria-label={`Note : ${review.rating} sur 5`}><Stars value={review.rating} size={14} /></div>
                {review.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{review.comment}</p>}
                {canWrite && review.userId === user?.id && <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3 text-xs">
                  {confirmDelete ? <>
                    <span className="text-gray-600">Supprimer votre avis ?</span>
                    <button type="button" disabled={Boolean(busy)} onClick={() => void removeReview()} className="rounded font-semibold text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">{busy === "delete" ? "Suppression…" : "Confirmer"}</button>
                    <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDelete(false)} className="rounded font-semibold text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2">Annuler</button>
                  </> : <>
                    <button type="button" disabled={Boolean(busy)} onClick={() => startEditing(review)} className="rounded font-semibold text-[#438F00] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Modifier</button>
                    <button type="button" disabled={Boolean(busy)} onClick={() => setConfirmDelete(true)} className="rounded font-semibold text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Supprimer</button>
                  </>}
                </div>}
              </li>)}
            </ul>}
        </div>

        {authLoading ? <p role="status" className="self-start rounded-2xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Vérification de votre session…</p> :
          authError ? <div role="alert" className="self-start rounded-2xl border border-gray-100 bg-white p-5 text-sm text-red-700"><p>{authError}</p><button type="button" onClick={() => void refresh()} className="mt-2 rounded font-semibold underline focus-visible:outline-2">Réessayer</button></div> :
          !user ? <div className="space-y-4 self-start rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="text-base font-extrabold">Laisser un avis</h3>
            <p className="text-sm leading-6 text-gray-500">Connectez-vous pour noter ce produit et partager votre expérience.</p>
            <Link href={loginHref} className="inline-flex rounded-xl bg-[#65D900] px-4 py-3 text-sm font-bold text-black hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]">Se connecter</Link>
          </div> : ownReview && !editing ? <div className="space-y-4 self-start rounded-2xl border border-gray-100 bg-white p-5">
            <h3 className="text-base font-extrabold">Votre avis est publié</h3>
            <p className="text-sm leading-6 text-gray-500">Vous pouvez modifier votre note et votre commentaire à tout moment.</p>
            <button type="button" disabled={formDisabled} onClick={() => startEditing(ownReview)} className="rounded-xl bg-[#65D900] px-4 py-3 text-sm font-bold text-black hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Modifier mon avis</button>
          </div> : <form onSubmit={submit} aria-labelledby="review-form-title" aria-busy={Boolean(busy)} className="self-start rounded-2xl border border-gray-100 bg-white p-5">
            <fieldset disabled={formDisabled} className="min-w-0 space-y-4">
              <legend id="review-form-title" className="mb-4 text-base font-extrabold">{editing ? "Modifier mon avis" : "Laisser un avis"}</legend>
              <p className="text-xs text-gray-500">Publié en tant que <span className="font-semibold text-gray-800">{user.name}</span>.</p>
              <div>
                <span id={ratingLabelId} className="mb-1.5 block text-sm font-medium">Note</span>
                <StarRatingInput value={form.rating} onChange={rating => setForm(current => ({ ...current, rating }))} labelledBy={ratingLabelId} disabled={formDisabled} />
                <p className="mt-1 text-xs text-gray-500">{form.rating} étoile{form.rating > 1 ? "s" : ""} sur 5</p>
              </div>
              <label className="block text-sm font-medium">Commentaire <span className="font-normal text-gray-500">(facultatif)</span>
                <textarea rows={4} maxLength={2000} value={form.comment} onChange={event => setForm(current => ({ ...current, comment: event.target.value }))} placeholder="Partagez votre expérience…" className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30" />
              </label>
              <button type="submit" disabled={formDisabled} className="w-full rounded-xl bg-[#65D900] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] disabled:cursor-not-allowed disabled:opacity-50">{busy === "save" ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Publier l’avis"}</button>
              {editing && <button type="button" onClick={() => { setEditing(false); setError(""); }} className="w-full rounded py-1 text-sm font-semibold text-gray-500 focus-visible:outline-2 focus-visible:outline-[#65D900]">Annuler</button>}
            </fieldset>
          </form>}
      </div>
    </section>
  );
}
