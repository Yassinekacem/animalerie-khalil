"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { fallbackImage } from "@/lib/catalogue";
import { formatMillimes, getUnitPriceMillimes, MAX_CART_QUANTITY, useCart, type CartItem } from "@/lib/cart";

function CartImage({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  const validSource = /^\/(?!\/)/.test(item.image) || /^https?:\/\//i.test(item.image);
  const source = !failed && validSource ? item.image : fallbackImage;
  return <Image src={source} alt={source === fallbackImage ? "Image de remplacement — Animalerie Khalil" : item.name}
    fill sizes="96px" unoptimized={/^https?:\/\//i.test(source)} onError={() => setFailed(true)} className="object-contain p-2" />;
}

function QuantityControl({ quantity, name, onChange }: { quantity: number; name: string; onChange: (value: number) => boolean }) {
  const [draft, setDraft] = useState({ quantity, value: String(quantity) });
  if (draft.quantity !== quantity) setDraft({ quantity, value: String(quantity) });
  const value = draft.value;
  const setValue = (next: string) => setDraft({ quantity, value: next });
  const valid = /^\d+$/.test(value) && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= MAX_CART_QUANTITY;
  const change = (next: number) => {
    if (!onChange(next)) setValue(String(quantity));
  };
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#65D900]">
      <button type="button" disabled={quantity <= 1} aria-label={`Diminuer la quantité de ${name}`} onClick={() => change(quantity - 1)}
        className="p-3 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#65D900] disabled:opacity-40"><Minus size={16} aria-hidden="true" /></button>
      <input type="number" min="1" max={MAX_CART_QUANTITY} step="1" inputMode="numeric" value={value} aria-label={`Quantité de ${name}`} aria-invalid={!valid}
        onChange={event => {
          const next = event.target.value;
          setValue(next);
          if (/^\d+$/.test(next) && Number(next) >= 1 && Number(next) <= MAX_CART_QUANTITY) change(Number(next));
        }}
        onBlur={() => { if (!valid) setValue(String(quantity)); }}
        className="w-16 min-w-0 bg-transparent py-3 text-center text-sm font-bold text-gray-900 focus-visible:outline-2 focus-visible:outline-[#65D900]" />
      <button type="button" disabled={quantity >= MAX_CART_QUANTITY} aria-label={`Augmenter la quantité de ${name}`} onClick={() => change(quantity + 1)}
        className="p-3 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#65D900] disabled:opacity-40"><Plus size={16} aria-hidden="true" /></button>
    </div>
  );
}

export default function CartPage() {
  const { items, count, ready, setQuantity, removeItem } = useCart();
  const [error, setError] = useState("");
  const total = items.reduce((sum, item) => sum + getUnitPriceMillimes(item) * item.quantity, 0);
  const handleChange = (success: boolean) => {
    setError(success ? "" : "Impossible d’enregistrer le panier dans ce navigateur. Vérifiez que le stockage local est autorisé, puis réessayez.");
    return success;
  };

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:px-8">
        <Link href="/boutique" className="mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-gray-600 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]">
          <ArrowLeft size={17} aria-hidden="true" /> Continuer mes achats
        </Link>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Mon panier</h1>
          {ready && <p aria-live="polite" className="text-sm text-gray-500">{count} article{count > 1 ? "s" : ""}</p>}
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {!ready ? (
          <div role="status" className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">Chargement du panier…</div>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center">
            <ShoppingCart size={44} aria-hidden="true" className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-extrabold">Votre panier est vide</h2>
            <p className="mt-3 text-sm text-gray-500">Découvrez les produits pour vos animaux et ajoutez vos favoris au panier.</p>
            <Link href="/boutique" className="mt-6 inline-flex rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]">Découvrir la boutique</Link>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-label="Articles du panier" className="min-w-0">
              <ul className="space-y-4">
                {items.map(item => (
                  <li key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-5">
                      <Link href={`/boutique/${item.id}`} className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 sm:h-24 sm:w-24 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]">
                        <CartImage key={item.image} item={item} />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="min-w-0 break-words text-sm font-bold leading-6 sm:text-base"><Link href={`/boutique/${item.id}`} className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-[#65D900]">{item.name}</Link></h2>
                          <button type="button" onClick={() => handleChange(removeItem(item.id))} aria-label={`Supprimer ${item.name}`}
                            className="-mr-1 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-[#65D900]"><Trash2 size={18} aria-hidden="true" /></button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Prix unitaire</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold">
                          {item.promoPrice !== null && <del className="text-xs font-normal text-gray-400">{formatMillimes(getUnitPriceMillimes({ ...item, promoPrice: null }))}</del>}
                          <span>{formatMillimes(getUnitPriceMillimes(item))}</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <p className="mb-2 text-xs text-gray-500">Quantité</p>
                        <QuantityControl quantity={item.quantity} name={item.name} onChange={value => handleChange(setQuantity(item.id, value))} />
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="mb-1 text-xs text-gray-500">Sous-total</p>
                        <p className="break-words text-base font-extrabold">{formatMillimes(getUnitPriceMillimes(item) * item.quantity)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <aside aria-labelledby="cart-summary" className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 lg:sticky lg:top-36">
              <h2 id="cart-summary" className="text-lg font-extrabold">Récapitulatif</h2>
              <p className="mt-3 text-sm text-gray-500">{count} article{count > 1 ? "s" : ""}</p>
              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3 border-t border-gray-100 pt-5" aria-live="polite" aria-atomic="true">
                <span className="font-bold">Total</span>
                <span className="break-words text-xl font-extrabold">{formatMillimes(total)}</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
