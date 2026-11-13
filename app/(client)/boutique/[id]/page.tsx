"use client";

import { Suspense, useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
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
  const [imageFailed, setImageFailed] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const { count: cartCount, ready: cartReady, addItem } = useCart();
  const [cartError, setCartError] = useState("");
  const [addedQuantity, setAddedQuantity] = useState(0);

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
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-gray-100 bg-white">
            <Image
              src={imageSource}
              alt={
                imageSource === fallbackImage
                  ? "Image de remplacement — Animalerie Khalil"
                  : product.name
              }
              fill
              sizes="(max-width: 1023px) 100vw, 600px"
              unoptimized={/^https?:\/\//i.test(imageSource)}
              onError={() => setImageFailed(true)}
              className="object-contain p-6 sm:p-10"
            />
            {hasPromo && (
              <span className="absolute left-4 top-4 rounded-full bg-[#65D900] px-3 py-1.5 text-xs font-extrabold text-black">
                −{discount} %
              </span>
            )}
          </div>

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

          {/* Note moyenne factice */}
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Stars value={4.6} size={16} />
            <span className="font-semibold text-gray-800">4,6</span>
            <span className="text-gray-500">· 12 avis</span>
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
                  setAddedQuantity(0);
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
                  setAddedQuantity(0);
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
                  setAddedQuantity(0);
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
                setAddedQuantity(added ? quantityNumber : 0);
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
          <p role="status" className="mt-3 flex min-h-5 items-center gap-2 text-sm text-gray-600">
            {addedQuantity > 0 && (
              <>
                <Check size={16} aria-hidden="true" className="shrink-0 text-[#438F00]" />
                {addedQuantity} article(s) ajouté(s) au panier.
              </>
            )}
          </p>
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
          Avis clients (simulés)
          ============================================================ */}
      <ReviewsSection productName={product.name} />
    </article>
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
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const groupId = useId();
  const current = hover || value;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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
      aria-labelledby={`${groupId}-label`}
      className="inline-flex items-center gap-1"
      onMouseLeave={() => setHover(0)}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
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
   Section avis clients (simulée)
   ============================================================ */

type Review = {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
};

const sampleReviews: Review[] = [
  {
    id: 1,
    author: "Sarah B.",
    rating: 5,
    comment:
      "Excellent produit, mon chat l’adore ! Livraison rapide et emballage soigné. Je recommande.",
    date: "12/10/2026",
  },
  {
    id: 2,
    author: "Karim T.",
    rating: 4,
    comment:
      "Très bonne qualité, conforme à la description. Un peu cher mais ça vaut le coup sur la durée.",
    date: "28/09/2026",
  },
  {
    id: 3,
    author: "Ines M.",
    rating: 5,
    comment: "Parfait pour mon chien, il en raffole. Le service client est également très réactif.",
    date: "05/09/2026",
  },
];

function ReviewsSection({ productName }: { productName: string }) {
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  const [form, setForm] = useState({ name: "", rating: 5, comment: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Merci d’indiquer votre nom.");
      return;
    }
    if (!form.comment.trim()) {
      setError("Merci d’écrire un commentaire.");
      return;
    }
    if (form.rating < 1 || form.rating > 5) {
      setError("Veuillez choisir une note entre 1 et 5 étoiles.");
      return;
    }

    const newReview: Review = {
      id: Date.now(),
      author: form.name.trim(),
      rating: form.rating,
      comment: form.comment.trim(),
      date: new Date().toLocaleDateString("fr-FR"),
    };

    setReviews(prev => [newReview, ...prev]);
    setForm({ name: "", rating: 5, comment: "" });
    setSubmitted(true);
  };

  return (
    <section aria-labelledby="reviews-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-title" className="text-xl font-extrabold sm:text-2xl">
            Avis clients
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#55B900]">
            Exemples de démonstration
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3">
          <span className="text-3xl font-extrabold text-gray-900">
            {average.toFixed(1).replace(".", ",")}
          </span>
          <div>
            <Stars value={average} size={18} />
            <p className="mt-1 text-xs text-gray-500">
              sur 5 · {reviews.length} avis
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Liste des avis */}
        <ul className="space-y-3">
          {reviews.map(review => (
            <li
              key={review.id}
              className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#65D900]/15 text-xs font-extrabold text-[#438F00]">
                    {review.author.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-bold text-gray-900">{review.author}</span>
                </div>
                <span className="text-xs text-gray-500">{review.date}</span>
              </div>
              <div className="mt-2">
                <Stars value={review.rating} size={14} />
              </div>
              <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                {review.comment}
              </p>
            </li>
          ))}
        </ul>

        {/* Formulaire */}
        <form
          onSubmit={handleSubmit}
          aria-labelledby="review-form-title"
          className="space-y-4 self-start rounded-2xl border border-gray-100 bg-white p-5"
        >
          <div>
            <h3 id="review-form-title" className="text-base font-extrabold">
              Laisser un avis
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Avis de démonstration — non publié réellement.
            </p>
          </div>

          <label className="block text-sm font-medium">
            Nom
            <input
              type="text"
              required
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              placeholder="Votre prénom"
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30"
            />
          </label>

          <div>
            <span
              id={`${useId()}-label`}
              className="mb-1.5 block text-sm font-medium"
            >
              Note
            </span>
            <StarRatingInput
              value={form.rating}
              onChange={rating => setForm(prev => ({ ...prev, rating }))}
            />
            <p className="mt-1 text-xs text-gray-500">
              {form.rating} étoile{form.rating > 1 ? "s" : ""} sur 5
            </p>
          </div>

          <label className="block text-sm font-medium">
            Commentaire
            <textarea
              required
              rows={4}
              value={form.comment}
              onChange={event => setForm(prev => ({ ...prev, comment: event.target.value }))}
              placeholder="Partagez votre expérience…"
              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#65D900] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]"
          >
            Publier l’avis
          </button>

          {submitted && (
            <p role="status" className="flex items-center gap-2 text-sm text-[#438F00]">
              <Check size={16} aria-hidden="true" />
              Merci ! Votre avis a été ajouté à titre d’exemple.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
