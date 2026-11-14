"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { fallbackImage } from "@/lib/catalogue";
import { getUnitPriceMillimes, MAX_CART_QUANTITY, useCart, type CartItem } from "@/lib/cart";

type Coordinates = { customerName: string; customerPhone: string; customerEmail: string; deliveryAddress: string; note: string };
type Confirmation = { id: number; reference: string; subtotal: string; deliveryFee: string; total: string };
const emptyForm: Coordinates = { customerName: "", customerPhone: "", customerEmail: "", deliveryAddress: "", note: "" };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]";
const primary = `rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black hover:bg-[#55BD00] disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/25 disabled:bg-gray-50";

// Prices arrive in TND. Integer millimes preserve all three decimal places.
function millimes(price: string) {
  const [dinars, fraction = ""] = price.split(".");
  return BigInt(dinars) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
function money(amount: bigint) {
  return `${(amount / BigInt(1000)).toLocaleString("fr-TN")},${String(amount % BigInt(1000)).padStart(3, "0")} TND`;
}
function isAmount(value: unknown): value is string {
  return typeof value === "string" && /^\d+(?:\.\d{1,3})?$/.test(value);
}
function isConfirmation(value: unknown): value is Confirmation {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return Number.isInteger(data.id) && Number(data.id) > 0 && typeof data.reference === "string" && data.reference.trim() !== "" &&
    isAmount(data.subtotal) && isAmount(data.deliveryFee) && isAmount(data.total);
}
function apiError(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const body = data as { error?: unknown; issues?: unknown };
  const issues = Array.isArray(body.issues) ? body.issues.flatMap(issue =>
    issue && typeof issue === "object" && "message" in issue && typeof issue.message === "string" ? [issue.message] : []) : [];
  return [typeof body.error === "string" ? body.error : fallback, ...issues].join("\n");
}

function CartImage({ item }: { item: CartItem }) {
  const [failed, setFailed] = useState(false);
  const valid = /^\/(?!\/)/.test(item.image) || /^https?:\/\//i.test(item.image);
  const source = !failed && valid ? item.image : fallbackImage;
  return <Image src={source} alt={source === fallbackImage ? "Image de remplacement — Animalerie Khalil" : item.name}
    fill sizes="96px" unoptimized={/^https?:\/\//i.test(source)} onError={() => setFailed(true)} className="object-contain p-2" />;
}

function QuantityControl({ item, onChange }: { item: CartItem; onChange: (value: number) => boolean }) {
  const [draft, setDraft] = useState({ quantity: item.quantity, value: String(item.quantity) });
  if (draft.quantity !== item.quantity) setDraft({ quantity: item.quantity, value: String(item.quantity) });
  const valid = /^\d+$/.test(draft.value) && Number(draft.value) >= 1 && Number(draft.value) <= MAX_CART_QUANTITY;
  const change = (next: number) => {
    if (!onChange(next)) setDraft({ quantity: item.quantity, value: String(item.quantity) });
  };
  return (
    <div className="flex w-fit items-center overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-[#65D900]">
      <button type="button" disabled={item.quantity <= 1} aria-label={`Diminuer la quantité de ${item.name}`} onClick={() => change(item.quantity - 1)}
        className={`p-3 hover:bg-gray-50 disabled:opacity-40 ${focus}`}><Minus size={16} aria-hidden="true" /></button>
      <input type="number" min="1" max={MAX_CART_QUANTITY} step="1" inputMode="numeric" value={draft.value} aria-label={`Quantité de ${item.name}`} aria-invalid={!valid}
        onChange={event => {
          const value = event.target.value;
          setDraft({ quantity: item.quantity, value });
          if (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_CART_QUANTITY) change(Number(value));
        }}
        onBlur={() => { if (!valid) setDraft({ quantity: item.quantity, value: String(item.quantity) }); }}
        className={`w-16 min-w-0 bg-transparent py-3 text-center text-sm font-bold ${focus}`} />
      <button type="button" disabled={item.quantity >= MAX_CART_QUANTITY} aria-label={`Augmenter la quantité de ${item.name}`} onClick={() => change(item.quantity + 1)}
        className={`p-3 hover:bg-gray-50 disabled:opacity-40 ${focus}`}><Plus size={16} aria-hidden="true" /></button>
    </div>
  );
}

export default function CartPage() {
  const { items, count, ready, setQuantity, removeItem, clearItems } = useCart();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Coordinates>(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [clearFailed, setClearFailed] = useState(false);
  const [feeRetry, setFeeRetry] = useState(0);
  const [delivery, setDelivery] = useState<{ key: number; fee: bigint | null; error: string }>({ key: -1, fee: null, error: "" });
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtotal = items.reduce((sum, item) => sum + BigInt(getUnitPriceMillimes(item)) * BigInt(item.quantity), BigInt(0));
  const deliveryLoading = delivery.key !== feeRetry;
  const deliveryReady = !deliveryLoading && delivery.fee !== null;

  useEffect(() => {
    if (step !== 2) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/orders/delivery-fee", { signal: controller.signal, cache: "no-store" });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(apiError(data, "Impossible de charger les frais de livraison."));
        if (!data || typeof data !== "object" || !("deliveryFee" in data) || !isAmount(data.deliveryFee)) throw new Error("Frais de livraison indisponibles.");
        if (!controller.signal.aborted) setDelivery({ key: feeRetry, fee: millimes(data.deliveryFee), error: "" });
      } catch (reason) {
        if (!controller.signal.aborted) setDelivery({ key: feeRetry, fee: null, error: reason instanceof TypeError ? "Impossible de contacter le serveur." : reason instanceof Error ? reason.message : "Frais de livraison indisponibles." });
      }
    })();
    return () => controller.abort();
  }, [step, feeRetry]);

  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [step, confirmation]);

  const updateForm = (field: keyof Coordinates, value: string) => setForm(current => ({ ...current, [field]: value }));
  const mutateCart = (success: boolean) => {
    setError(success ? "" : "Impossible d’enregistrer le panier dans ce navigateur. Vérifiez que le stockage local est autorisé.");
    return success;
  };

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || confirmation || !ready || !items.length || !deliveryReady) return;
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.deliveryAddress.trim()) {
      setError("Le nom, le téléphone et l’adresse de livraison sont obligatoires.");
      return;
    }
    if (items.length > 100) { setError("Une commande peut contenir au maximum 100 produits différents."); return; }
    sending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(),
          customerEmail: form.customerEmail.trim() || null, deliveryAddress: form.deliveryAddress.trim(), note: form.note.trim() || null,
          items: items.map(item => ({ productId: item.id, quantity: item.quantity })),
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Impossible d’enregistrer la commande."));
      if (response.status !== 201 || !isConfirmation(data)) throw new Error("La confirmation du serveur est incorrecte. Le panier a été conservé.");
      setConfirmation(data);
      setClearFailed(!clearItems());
    } catch (reason) {
      setError(reason instanceof TypeError ? "Impossible de contacter le serveur. Votre panier et vos coordonnées sont conservés." :
        reason instanceof SyntaxError ? "La réponse du serveur est incorrecte. Votre panier et vos coordonnées sont conservés." :
          reason instanceof Error ? reason.message : "Impossible d’enregistrer la commande.");
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:px-8">
        {confirmation ? (
          <section className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 text-center sm:p-10">
            <CheckCircle2 size={52} aria-hidden="true" className="mx-auto text-[#438F00]" />
            <h1 ref={titleRef} tabIndex={-1} className="mt-4 text-2xl font-extrabold outline-none">Commande enregistrée</h1>
            <p className="mt-3 text-sm text-gray-600">Merci {form.customerName.trim()}. Votre commande est en attente de confirmation.</p>
            <div className="mt-6 rounded-xl bg-gray-50 p-5 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Référence de votre commande</p>
              <p className="mt-2 break-all font-extrabold">{confirmation.reference}</p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><dt>Sous-total</dt><dd>{money(millimes(confirmation.subtotal))}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt>Frais de livraison</dt><dd>{money(millimes(confirmation.deliveryFee))}</dd></div>
                <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-3 font-bold"><dt>Total enregistré</dt><dd>{money(millimes(confirmation.total))}</dd></div>
              </dl>
            </div>
            {clearFailed && <div role="alert" className="mt-4 text-sm text-red-700">
              <p>La commande est enregistrée, mais le panier n’a pas pu être vidé. Ne passez pas à nouveau cette commande.</p>
              <button type="button" onClick={() => setClearFailed(!clearItems())} className={`mt-2 rounded font-bold underline ${focus}`}>Réessayer de vider le panier</button>
            </div>}
            <Link href="/boutique" className={`mt-7 inline-flex ${primary}`}>Retour à la boutique</Link>
          </section>
        ) : (
          <>
            {step === 1 ? <Link href="/boutique" className={`mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-gray-600 hover:text-black ${focus}`}>
              <ArrowLeft size={17} aria-hidden="true" /> Continuer mes achats
            </Link> : <button type="button" disabled={submitting} onClick={() => { setStep(1); setError(""); }} className={`mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-gray-600 disabled:opacity-50 ${focus}`}>
              <ArrowLeft size={17} aria-hidden="true" /> Retour au panier
            </button>}
            <ol aria-label="Étapes de la commande" className="mb-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-gray-500">
              <li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "text-gray-900" : ""}>1. Mon panier</li>
              <li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "text-gray-900" : ""}>2. Coordonnées et confirmation</li>
            </ol>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
              <h1 ref={titleRef} tabIndex={-1} className="text-2xl font-extrabold outline-none sm:text-3xl">{step === 1 ? "Mon panier" : "Coordonnées et confirmation"}</h1>
              {ready && <p aria-live="polite" className="text-sm text-gray-500">{count} article{count > 1 ? "s" : ""}</p>}
            </div>
            {error && <p role="alert" className="mb-5 whitespace-pre-line rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
            {!ready ? <div role="status" className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">Chargement du panier…</div> : items.length === 0 && !submitting ? (
              <section className="rounded-2xl border border-gray-100 bg-white px-5 py-16 text-center">
                <ShoppingCart size={44} aria-hidden="true" className="mx-auto mb-4 text-gray-300" />
                <h2 className="text-xl font-extrabold">Votre panier est vide</h2>
                <p className="mt-3 text-sm text-gray-500">Découvrez les produits pour vos animaux et ajoutez vos favoris au panier.</p>
                <Link href="/boutique" className={`mt-6 inline-flex ${primary}`}>Découvrir la boutique</Link>
              </section>
            ) : step === 1 ? (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <section aria-label="Articles du panier" className="min-w-0"><ul className="space-y-4">
                  {items.map(item => (
                    <li key={item.id} className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
                      <div className="flex items-start gap-3 sm:gap-5">
                        <Link href={`/boutique/${item.id}`} className={`relative block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 sm:h-24 sm:w-24 ${focus}`}><CartImage key={item.image} item={item} /></Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="min-w-0 break-words text-sm font-bold leading-6 sm:text-base"><Link href={`/boutique/${item.id}`} className={`rounded hover:underline ${focus}`}>{item.name}</Link></h2>
                            <button type="button" onClick={() => mutateCart(removeItem(item.id))} aria-label={`Supprimer ${item.name}`} className={`-mr-1 shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 ${focus}`}><Trash2 size={18} aria-hidden="true" /></button>
                          </div>
                          <p className="mt-2 text-xs text-gray-500">Prix unitaire</p>
                          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold">
                            {item.promoPrice !== null && <del className="text-xs font-normal text-gray-400">{money(millimes(item.price))}</del>}
                            <span>{money(millimes(item.promoPrice ?? item.price))}</span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-gray-100 pt-4">
                        <div><p className="mb-2 text-xs text-gray-500">Quantité</p><QuantityControl item={item} onChange={value => mutateCart(setQuantity(item.id, value))} /></div>
                        <div className="min-w-0 text-right"><p className="mb-1 text-xs text-gray-500">Sous-total</p><p className="break-words text-base font-extrabold">{money(millimes(item.promoPrice ?? item.price) * BigInt(item.quantity))}</p></div>
                      </div>
                    </li>
                  ))}
                </ul></section>
                <aside className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 lg:sticky lg:top-36">
                  <h2 className="text-lg font-extrabold">Récapitulatif</h2>
                  <p className="mt-3 text-sm text-gray-500">{count} article{count > 1 ? "s" : ""}</p>
                  <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-5 font-bold"><span>Sous-total</span><span>{money(subtotal)}</span></div>
                  <p className="mt-2 text-xs text-gray-500">Frais de livraison affichés à l’étape suivante.</p>
                  <button type="button" onClick={() => { setError(""); setFeeRetry(value => value + 1); setStep(2); }} className={`mt-6 w-full ${primary}`}>Passer commande</button>
                </aside>
              </div>
            ) : (
              <form onSubmit={submitOrder} aria-busy={submitting} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <fieldset disabled={submitting} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
                  <legend className="px-1 text-lg font-extrabold">Coordonnées de livraison</legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="text-sm font-semibold">Nom complet *<input id="customerName" name="customerName" required maxLength={200} autoComplete="name" value={form.customerName} onChange={e => updateForm("customerName", e.target.value)} className={inputClass} /></label>
                    <label className="text-sm font-semibold">Téléphone *<input id="customerPhone" name="customerPhone" type="tel" required maxLength={32} autoComplete="tel" value={form.customerPhone} onChange={e => updateForm("customerPhone", e.target.value)} className={inputClass} /></label>
                    <label className="text-sm font-semibold sm:col-span-2">Email facultatif<input id="customerEmail" name="customerEmail" type="email" maxLength={254} autoComplete="email" value={form.customerEmail} onChange={e => updateForm("customerEmail", e.target.value)} className={inputClass} /></label>
                    <label className="text-sm font-semibold sm:col-span-2">Adresse de livraison *<textarea id="deliveryAddress" name="deliveryAddress" required maxLength={1000} rows={3} autoComplete="street-address" value={form.deliveryAddress} onChange={e => updateForm("deliveryAddress", e.target.value)} className={inputClass} /></label>
                    <label className="text-sm font-semibold sm:col-span-2">Note facultative<textarea id="note" name="note" maxLength={2000} rows={3} value={form.note} onChange={e => updateForm("note", e.target.value)} className={inputClass} /></label>
                  </div>
                </fieldset>
                <aside className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 lg:sticky lg:top-36">
                  <h2 className="text-lg font-extrabold">Votre commande</h2>
                  <ul className="mt-4 max-h-64 space-y-4 overflow-y-auto pr-1">
                    {items.map(item => <li key={item.id} className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-100"><CartImage key={item.image} item={item} /></div>
                      <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-gray-500">{item.quantity} × {money(millimes(item.promoPrice ?? item.price))}</p></div>
                    </li>)}
                  </ul>
                  <dl className="mt-5 space-y-3 border-t border-gray-100 pt-5 text-sm">
                    <div className="flex flex-wrap justify-between gap-2"><dt>Sous-total</dt><dd>{money(subtotal)}</dd></div>
                    <div className="flex flex-wrap justify-between gap-2"><dt>Frais de livraison</dt><dd>{deliveryLoading ? "Chargement…" : delivery.fee !== null ? money(delivery.fee) : "Indisponibles"}</dd></div>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-base font-extrabold"><dt>Total estimé</dt><dd>{deliveryReady ? money(subtotal + delivery.fee!) : "—"}</dd></div>
                  </dl>
                  <p className="mt-3 text-xs leading-5 text-gray-500">Les prix sont revérifiés lors de la confirmation. Le montant enregistré figurera sur votre confirmation.</p>
                  {!deliveryLoading && delivery.error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    <p>{delivery.error}</p><button type="button" disabled={submitting} onClick={() => setFeeRetry(value => value + 1)} className={`mt-2 rounded font-bold underline ${focus}`}>Réessayer les frais de livraison</button>
                  </div>}
                  <button type="submit" disabled={submitting || !deliveryReady || !items.length} className={`mt-6 w-full ${primary}`}>{submitting ? "Enregistrement…" : "Confirmer la commande"}</button>
                </aside>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
