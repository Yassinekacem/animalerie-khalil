"use client";

import { memo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import { useWishlist } from "@/components/WishlistProvider";
import { categories, fallbackImage, formatPrice, type Animal } from "@/lib/catalogue";

export type Product = {
  id: number;
  name: string;
  brand: string | null;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
};

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
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Skeleton className="h-full w-full rounded-none" />
      </div>
      <div className="p-3 sm:p-4">
        <Skeleton className="mb-2 h-2.5 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="mt-2 h-3 w-16" />
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="mt-4 h-11 w-full rounded-xl" />
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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-square overflow-hidden bg-gray-100">
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
          onClick={() => void toggleFavorite(product.id)}
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

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {/* ✅ Catégorie : 1 seule ligne, hauteur fixe, tronquée si trop longue */}
        <p className="mb-2 h-4 truncate text-[10px] font-bold uppercase tracking-wider text-[#55B900] sm:text-xs">
          {categories[product.targetAnimal]?.find(item => item.id === product.category)?.name ??
            product.category}
        </p>

        {/* Nom : hauteur fixe (2 lignes) */}
        <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-gray-900 sm:text-base">
          <Link
            href={`/boutique/${product.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-[#65D900]"
          >
            {product.name}
          </Link>
        </h2>

        {/* Marque : hauteur fixe */}
        <p className="mt-2 min-h-4 text-xs text-gray-500">{product.brand ?? "\u00A0"}</p>

        {/* Prix : hauteur fixe quel que soit le nombre de prix affichés */}
        <div className="mt-3 flex min-h-7 flex-wrap items-center gap-2">
          <del
            className={`text-xs text-gray-400 ${hasPromo ? "" : "invisible"}`}
            aria-hidden={!hasPromo}
          >
            {formatPrice(product.price)}
          </del>
          <span className="text-base font-extrabold text-gray-900 sm:text-lg">
            {formatPrice(product.promoPrice ?? product.price)}
          </span>
        </div>

        {/* Bouton poussé en bas grâce à flex-1 sur le parent */}
        <button
          disabled={!cartReady}
          onClick={() => onAddToCart(product)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-2 py-3 text-xs font-bold text-black transition hover:bg-[#55BD00] disabled:opacity-50 sm:text-sm"
        >
          <ShoppingCart size={16} />
          Ajouter au panier
        </button>
      </div>
    </article>
  );
});

export default ProductCard;

