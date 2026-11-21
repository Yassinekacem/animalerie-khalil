"use client";

import { useToast } from "@/components/ToastProvider";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import ProductCard, { ProductCardSkeleton, type Product } from "@/components/ProductCard";
import { useWishlist } from "@/components/WishlistProvider";
import { accountButton } from "@/components/AccountArea";
import { useCart } from "@/lib/cart";

export default function FavoritesClient() {
  const { products, count, loading, error, retry } = useWishlist();
  const { addItem, ready: cartReady } = useCart();
  const toast = useToast();
  const [cartMessage, setCartMessage] = useState({ text: "", error: false });
  const addToCart = useCallback(async (product: Product) => {
    const added = await addItem(product);
    if (added) toast(`${product.name} ajouté au panier.`);
    setCartMessage({
      text: added ? "" : "Ajout impossible : produit indisponible, quantité dépassée ou stockage du navigateur inaccessible.",
      error: !added,
    });
  }, [addItem, toast]);

  return <section aria-labelledby="favorites-title">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="favorites-title" className="text-2xl font-extrabold tracking-tight text-gray-950">Mes favoris</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">Retrouvez les produits que vous aimez et préparez votre prochaine visite.</p>
      </div>
      {count !== null && !loading && !error && <span aria-live="polite" className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">{count} produit{count > 1 ? "s" : ""}</span>}
    </div>
    {cartMessage.text && <p role={cartMessage.error ? "alert" : "status"} className={`mb-5 rounded-xl border bg-white px-4 py-3 text-sm ${cartMessage.error ? "border-red-200 text-red-700" : "border-[#65D900]/40 text-gray-800"}`}>{cartMessage.text}</p>}
    {loading ? <div role="status" aria-label="Chargement de vos favoris" className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => <ProductCardSkeleton key={index} />)}
    </div> : error ? <div role="alert" className="rounded-2xl border border-red-100 bg-white p-6">
      <p className="text-sm text-red-700">{error}</p>
      <button type="button" onClick={retry} className={`${accountButton} mt-4 bg-gray-100 text-gray-900`}>Réessayer</button>
    </div> : products.length === 0 ? <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center sm:py-16">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#65D900]/10"><Heart size={25} className="text-[#438F00]" aria-hidden="true" /></span>
      <h3 className="mt-5 text-lg font-bold text-gray-950">Votre liste de favoris est vide</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Explorez la boutique et cliquez sur le cœur des produits pour les retrouver ici.</p>
      <Link href="/boutique" className={`${accountButton} mt-6 bg-[#65D900] text-black hover:bg-[#59C200]`}>Découvrir la boutique<ArrowRight size={17} aria-hidden="true" /></Link>
    </div> : <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
      {products.map(product => <ProductCard key={product.id} product={product} onAddToCart={addToCart} cartReady={cartReady} />)}
    </div>}
  </section>;
}
