"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import ProductRating, { type ReviewSummary } from "@/components/ProductRating";
import { useWishlist } from "@/components/WishlistProvider";
import { availabilityOptions, type ProductAvailability, categories, fallbackImage, formatPrice, type Animal } from "@/lib/catalogue";

export type Product = ReviewSummary & {
  id: number;
  name: string;
  brand: string | null;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
  availability: ProductAvailability;
};

export function AvailabilityBadge({ availability }: { availability: ProductAvailability }) {
  const status = availabilityOptions[availability];
  if (!status) return null;
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>;
}

const Skeleton = memo(function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
});

export const ProductCardSkeleton = memo(function ProductCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gray-100">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        <Skeleton className="mb-2 h-4 w-20 max-w-full" />
        <div className="h-10 space-y-2">
          <Skeleton className="block h-4 w-full" />
          <Skeleton className="block h-4 w-3/4" />
        </div>
        <Skeleton className="mt-2 h-4 w-16 max-w-full" />
        <div className="mt-2 flex h-10 items-center sm:h-6"><Skeleton className="h-3 w-24 max-w-full" /></div>
        <div className="mt-3 grid h-12 grid-rows-[1rem_2rem]">
          <Skeleton className="h-3 w-14 max-w-full" />
          <Skeleton className="my-auto h-5 w-20 max-w-full" />
        </div>
        <div className="mt-auto pt-4"><Skeleton className="block h-12 w-full rounded-xl" /></div>
      </div>
    </div>
  );
});

const ProductImage = memo(function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  const validSource = /^\/(?!\/)/.test(product.image) || /^https?:\/\//i.test(product.image);
  const src = !failed && validSource ? product.image : fallbackImage;
  return (
    <Image
      src={src}
      alt={product.name}
      fill
      unoptimized={/^https?:\/\//i.test(src)}
      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 300px"
      onError={() => setFailed(true)}
      className={
        src === fallbackImage
          ? "object-contain p-6"
          : "object-cover transition duration-500 group-hover:scale-110"
      }
    />
  );
});

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  cartReady,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
  cartReady: boolean;
}) {
  const { isFavorite, isPending, loading: wishlistLoading, toggleFavorite } = useWishlist();
  const favorite = isFavorite(product.id);
  const favoritePending = isPending(product.id);
  const hasPromo = product.promoPrice !== null;
  const discount = hasPromo
    ? Math.round((1 - Number(product.promoPrice) / Number(product.price)) * 100)
    : 0;

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gray-100">
        <Link
          href={`/boutique/${product.id}`}
          aria-label={`Voir ${product.name}`}
          className="relative block h-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#65D900]"
        >
          <ProductImage key={product.image} product={product} />
        </Link>
        {hasPromo && (
          <span className="absolute left-3 top-3 rounded-full bg-[#65D900] px-3 py-1 text-[10px] font-extrabold text-black">
            −{discount} %
          </span>
        )}
        <button
          type="button"
          onClick={() => void toggleFavorite(product)}
          disabled={wishlistLoading || favoritePending}
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favorite}
          aria-busy={wishlistLoading || favoritePending}
          title={wishlistLoading || favoritePending ? "Chargement des favoris…" : favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md hover:bg-[#65D900] disabled:cursor-wait disabled:opacity-60"
        >
          <Heart
            size={18}
            className={favorite ? "fill-red-500 text-red-500" : "text-gray-700"}
          />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-4">
        {/* ✅ Catégorie : 1 seule ligne, hauteur fixe, tronquée si trop longue */}
        <p className="mb-2 h-4 shrink-0 truncate text-[10px] font-bold uppercase leading-4 tracking-wider text-[#55B900] sm:text-xs">
          {categories[product.targetAnimal]?.find(item => item.id === product.category)?.name ??
            product.category}
        </p>

        {/* Nom : hauteur fixe (2 lignes) */}
        <h2 title={product.name} className="line-clamp-2 h-10 shrink-0 text-sm font-bold leading-5 text-gray-900 [overflow-wrap:anywhere] sm:text-base">
          <Link
            href={`/boutique/${product.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-[#65D900]"
          >
            {product.name}
          </Link>
        </h2>

        {/* Marque : hauteur fixe */}
        <p title={product.brand ?? undefined} className="mt-2 h-4 shrink-0 truncate text-xs leading-4 text-gray-500">{product.brand ?? "\u00A0"}</p>
        <div className="mt-2"><AvailabilityBadge availability={product.availability} /></div>
        <ProductRating averageRating={product.averageRating} reviewCount={product.reviewCount} />

        {/* Prix : hauteur fixe quel que soit le nombre de prix affichés */}
        <div className="mt-3 grid h-12 shrink-0 grid-rows-[1rem_2rem] tabular-nums">
          <del
            className={`min-w-0 truncate text-xs leading-4 text-gray-400 ${hasPromo ? "" : "invisible"}`}
            title={hasPromo ? formatPrice(product.price) : undefined}
            aria-hidden={!hasPromo}
          >
            {formatPrice(product.price)}
          </del>
          <span className="whitespace-nowrap text-sm font-extrabold leading-8 text-gray-900 sm:text-lg">
            {formatPrice(product.promoPrice ?? product.price)}
          </span>
        </div>

        {/* Bouton poussé en bas grâce à flex-1 sur le parent */}
        <div className="mt-auto pt-4"><button
          disabled={!cartReady || product.availability !== "DISPONIBLE"}
          onClick={() => { if (product.availability === "DISPONIBLE") onAddToCart(product); }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-2 text-xs font-bold leading-4 text-black transition hover:bg-[#55BD00] disabled:opacity-50 sm:text-sm"
        >
          <ShoppingCart size={16} className="shrink-0" />
          {product.availability === "DISPONIBLE" ? "Ajouter au panier" : availabilityOptions[product.availability]?.label ?? "Indisponible"}
        </button></div>
      </div>
    </article>
  );
});

export default ProductCard;

