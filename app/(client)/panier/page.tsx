"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Minus, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { AvailabilityBadge } from "@/components/ProductCard";
import { type ProductAvailability, availabilityOptions, fallbackImage } from "@/lib/catalogue";
import { createGuestReceipt, getUnitPriceMillimes, MAX_CART_QUANTITY, saveGuestReceipt, useCart, useGuestReceipts, type CartItem, type GuestReceipt } from "@/lib/cart";
import { useAuth } from "@/components/AuthProvider";
import type { AuthUser } from "@/components/AuthProvider";
import LocationSelects from "@/components/LocationSelects";
import { isValidLocation } from "@/lib/tunisia-locations";

type Coordinates = { customerName: string; customerPhone: string; customerEmail: string; gouvernorat: string; ville: string; deliveryAddress: string; note: string };
type Confirmation = { id: number; reference: string; subtotal: string; deliveryFee: string; total: string };
type CheckoutAttempt = { key: string; fingerprint: string };

async function checkoutFingerprint(payload: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function readCheckoutAttempt(storageKey: string): CheckoutAttempt | null {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return null;
  const value: unknown = JSON.parse(stored);
  if (!value || typeof value !== "object" || !("key" in value) || !("fingerprint" in value) ||
    typeof value.key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.key) ||
    typeof value.fingerprint !== "string" || !/^[0-9a-f]{64}$/.test(value.fingerprint)) {
    throw new Error("La tentative de commande enregistrée est incorrecte. Contactez-nous avant de recommencer.");
  }
  return { key: value.key, fingerprint: value.fingerprint };
}
function initialForm(user: AuthUser | null): Coordinates {
  return {
    customerName: user?.name ?? "", customerPhone: user?.phone ?? "", customerEmail: user?.email ?? "",
    gouvernorat: user?.gouvernorat ?? "", ville: user?.ville ?? "", deliveryAddress: "", note: "",
  };
}
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

function receiptDate(value: string) {
  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "long", timeStyle: "short", timeZone: "Africa/Tunis",
  }).format(new Date(value));
}

function GuestReceiptCard({ receipt }: { receipt: GuestReceipt }) {
  const cardRef = useRef<HTMLElement>(null);
  const [printError, setPrintError] = useState("");

  function printReceipt() {
    if (!cardRef.current || document.querySelector("iframe[data-guest-receipt-print]")) return;
    setPrintError("");
    // Print a standalone DOM copy, never the checkout form or the rest of the page.
    const frame = document.createElement("iframe");
    frame.title = "Impression du reçu";
    frame.dataset.guestReceiptPrint = "true";
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;width:0;height:0;border:0;left:-10000px;top:0";
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument;
      const printWindow = frame.contentWindow;
      if (!doc || !printWindow) throw new Error("Impression indisponible.");
      doc.title = `Reçu ${receipt.reference} - Animalerie Khalil`;
      doc.documentElement.lang = "fr";
      const style = doc.createElement("style");
      style.textContent = `
        @page { margin: 15mm; }
        body { font: 12pt Arial, sans-serif; color: #111; background: white; margin: 0; }
        h3 { font-size: 20pt; margin: 0 0 12pt; } p { line-height: 1.5; }
        table { border-collapse: collapse; width: 100%; margin: 18pt 0; font-size: 10pt; }
        th, td { border-bottom: 1px solid #ddd; padding: 9pt 4pt; text-align: left; overflow-wrap: anywhere; }
        tr { break-inside: avoid; } thead { display: table-header-group; }
        dl { margin-top: 18pt; } dl > div { display: flex; justify-content: space-between; gap: 12pt; margin-top: 8pt; }
        dd { margin: 0; } a { color: inherit; text-decoration: none; }
        .receipt-contact { border-top: 1px solid #ddd; margin-top: 20pt; padding-top: 12pt; }
      `;
      doc.head.appendChild(style);
      const copy = cardRef.current.cloneNode(true) as HTMLElement;
      copy.querySelectorAll("[data-no-print]").forEach(element => element.remove());
      doc.body.appendChild(copy);
      printWindow.addEventListener("afterprint", () => frame.remove(), { once: true });
      printWindow.focus();
      printWindow.print();
    } catch {
      frame.remove();
      setPrintError("Impossible d’ouvrir l’impression. Réessayez depuis un navigateur compatible.");
    }
  }

  return <article ref={cardRef} className="min-w-0 text-left">
    <h3 className="text-xl font-extrabold">{receipt.shop.name}</h3>
    <p className="mt-2 text-sm font-semibold text-gray-700">Reçu de commande</p>
    <p className="mt-2 break-all text-sm font-bold">{receipt.reference}</p>
    <p className="mt-1 text-sm text-gray-500"><time dateTime={receipt.createdAt}>{receiptDate(receipt.createdAt)}</time></p>
    <div className="mt-6 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Articles commandés et montants enregistrés</caption>
        <thead><tr className="border-b border-gray-200 text-xs text-gray-500"><th scope="col" className="py-3 pr-3 font-semibold">Produit</th><th scope="col" className="px-2 py-3 font-semibold">Qté</th><th scope="col" className="px-2 py-3 font-semibold">Prix unitaire</th><th scope="col" className="py-3 pl-2 font-semibold">Montant</th></tr></thead>
        <tbody>{receipt.items.map((item, index) => <tr key={index} className="border-b border-gray-100 align-top">
          <th scope="row" className="min-w-32 break-words py-3 pr-3 font-medium [overflow-wrap:anywhere]">{item.productName}</th>
          <td className="px-2 py-3 tabular-nums">{item.quantity}</td>
          <td className="px-2 py-3 tabular-nums">{money(millimes(item.unitPrice))}</td>
          <td className="py-3 pl-2 tabular-nums">{money(millimes(item.unitPrice) * BigInt(item.quantity))}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <dl className="mt-5 space-y-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><dt>Sous-total</dt><dd>{money(millimes(receipt.subtotal))}</dd></div>
      <div className="flex flex-wrap justify-between gap-2"><dt>Livraison</dt><dd>{money(millimes(receipt.deliveryFee))}</dd></div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-3 font-bold"><dt>Total enregistré</dt><dd>{money(millimes(receipt.total))}</dd></div>
    </dl>
    <div className="receipt-contact mt-6 border-t border-gray-100 pt-4 text-sm leading-6 text-gray-600">
      <p>Une question ? Contactez {receipt.shop.name} au <a href="tel:+21696766945" className={`rounded font-semibold text-[#438F00] underline ${focus}`}>{receipt.shop.phone}</a> ou sur <a href="https://wa.me/21696766945" target="_blank" rel="noopener noreferrer" className={`rounded font-semibold text-[#438F00] underline ${focus}`}>WhatsApp</a>, en indiquant cette référence.</p>
      <p className="mt-2 text-xs text-gray-500">Copie locale de l’enregistrement de la commande. Ce reçu ne confirme ni le paiement ni la livraison ; il ne permet pas d’accéder aux données de la commande en ligne.</p>
    </div>
    <div data-no-print className="mt-5">
      <button type="button" onClick={printReceipt} className={`inline-flex items-center justify-center gap-2 ${primary}`}><Printer size={17} aria-hidden="true" /> Imprimer / Enregistrer en PDF</button>
      <p className="mt-2 text-xs leading-5 text-gray-500">Pour conserver un PDF, choisissez « Enregistrer en PDF » dans la fenêtre d’impression.</p>
      {printError && <p role="alert" className="mt-2 text-sm text-red-700">{printError}</p>}
    </div>
  </article>;
}

function GuestReceipts({ recentReceipt, warning, onSaved, onForgot }: {
  recentReceipt: GuestReceipt | null; warning: string; onSaved: () => void; onForgot: () => void;
}) {
  const { receipts, removeReceipt } = useGuestReceipts(true);
  const [error, setError] = useState("");
  const displayed = recentReceipt && warning ? [recentReceipt, ...receipts.filter(receipt => receipt.reference !== recentReceipt.reference)].slice(0, 10) : receipts;
  if (!displayed.length && !warning) return null;
  return <section aria-labelledby="guest-receipts-title" className="mt-10 rounded-2xl border border-gray-100 bg-white p-5 sm:p-7">
    <h2 id="guest-receipts-title" className="text-xl font-extrabold">Mes reçus sur cet appareil</h2>
    <p className="mt-2 text-sm leading-6 text-gray-500">Vos 10 derniers reçus invités restent accessibles depuis le panier sur ce navigateur. Ils ne contiennent pas vos coordonnées. Une personne utilisant ce même navigateur peut les consulter ; vous pouvez les supprimer ci-dessous.</p>
    <p className="mt-2 text-xs leading-5 text-gray-500">L’effacement des données du navigateur ou la navigation privée peuvent supprimer ces copies. Conservez un PDF si nécessaire.</p>
    {warning && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>{warning}</p>
      {recentReceipt && <button type="button" onClick={() => {
        if (saveGuestReceipt(recentReceipt)) { setError(""); onSaved(); }
        else setError("L’enregistrement local reste impossible. Vous pouvez imprimer le reçu ou le conserver en PDF.");
      }} className={`mt-2 rounded font-semibold underline ${focus}`}>Réessayer l’enregistrement du reçu</button>}
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 space-y-4">{displayed.map((receipt, index) => <details key={receipt.reference} open={index === 0} className="min-w-0 rounded-xl border border-gray-200">
      <summary className={`cursor-pointer rounded-xl px-4 py-4 text-sm font-semibold leading-6 sm:px-5 ${focus}`}>
        <span className="break-all">{receipt.reference}</span><span className="mt-1 block text-xs font-normal text-gray-500">{receiptDate(receipt.createdAt)} · {money(millimes(receipt.total))}</span>
      </summary>
      <div className="border-t border-gray-100 p-4 sm:p-5">
        <GuestReceiptCard receipt={receipt} />
        <button type="button" onClick={() => {
          if (removeReceipt(receipt.reference)) {
            setError("");
            if (recentReceipt?.reference === receipt.reference) onForgot();
          } else setError("Impossible de supprimer ce reçu du navigateur. Réessayez.");
        }} className={`mt-5 inline-flex items-center gap-2 rounded text-xs font-semibold text-gray-500 hover:text-red-700 ${focus}`}><Trash2 size={14} aria-hidden="true" /> Supprimer ce reçu de cet appareil</button>
      </div>
    </details>)}</div>
  </section>;
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
  const cart = useCart();
  // Reset checkout drafts and confirmations when the cart owner changes, even in a preserved route.
  return <CartContent key={cart.storageKey ?? "pending"} cart={cart} />;
}

function CartContent({ cart }: { cart: ReturnType<typeof useCart> }) {
  const { items, count, ready, setQuantity, removeItem, clearItems, sessionError, retrySession } = cart;
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<Coordinates>(() => initialForm(user));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [recentReceipt, setRecentReceipt] = useState<GuestReceipt | null>(null);
  const [receiptWarning, setReceiptWarning] = useState("");
  const [clearFailed, setClearFailed] = useState(false);
  const [retryPayload, setRetryPayload] = useState("");
  const checkoutStorageKey = `checkout_attempt_${cart.storageKey}`;
  const checkoutPayload = JSON.stringify({
    customerName: form.customerName.trim(), customerPhone: form.customerPhone.trim(),
    customerEmail: form.customerEmail.trim() || null, deliveryAddress: form.deliveryAddress.trim(), note: form.note.trim() || null,
    gouvernorat: form.gouvernorat, ville: form.ville,
    items: items.map(item => ({ productId: item.id, quantity: item.quantity })).sort((a, b) => a.productId - b.productId),
  });
  const retryingCheckout = retryPayload === checkoutPayload;

  // Restore retry eligibility after reload, without persisting addresses or other
  // checkout data: only a random key and a fingerprint are stored in the browser.
  useEffect(() => {
    if (!ready || !cart.storageKey) return;
    let active = true;
    void checkoutFingerprint(checkoutPayload).then(fingerprint => {
      const previous = readCheckoutAttempt(checkoutStorageKey);
      if (active) setRetryPayload(previous?.fingerprint === fingerprint ? checkoutPayload : "");
    }).catch(() => {
      if (active) setError("Impossible de vérifier la tentative de commande enregistrée. Réessayez avant de commander.");
    });
    return () => { active = false; };
  }, [ready, cart.storageKey, checkoutStorageKey, checkoutPayload]);
  const [feeRetry, setFeeRetry] = useState(0);
  const [delivery, setDelivery] = useState<{ key: number; fee: bigint | null; error: string }>({ key: -1, fee: null, error: "" });
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const productIds = items.map(item => item.id).sort((a, b) => a - b).join(",");
  const availabilityKey = `${productIds}:${availabilityRetry}:${step}`;
  const [availabilityState, setAvailabilityState] = useState<{
    key: string; statuses: Record<number, ProductAvailability | null>; error: string;
  }>({ key: "", statuses: {}, error: "" });
  const availabilityReady = availabilityState.key === availabilityKey && !availabilityState.error;
  const canOrder = availabilityReady && items.every(item => availabilityState.statuses[item.id] === "DISPONIBLE");
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const entries = await Promise.all(productIds.split(",").filter(Boolean).map(async id => {
          const response = await fetch(`/api/products/${id}`, { signal: controller.signal, cache: "no-store" });
          if (response.status === 404) return [Number(id), null] as const;
          const product = await response.json();
          if (!response.ok || !Object.hasOwn(availabilityOptions, product.availability)) throw new Error("Disponibilité des produits impossible à vérifier.");
          return [Number(id), product.availability as ProductAvailability] as const;
        }));
        if (!controller.signal.aborted) setAvailabilityState({ key: availabilityKey, statuses: Object.fromEntries(entries), error: "" });
      } catch {
        if (!controller.signal.aborted) setAvailabilityState({ key: availabilityKey, statuses: {}, error: "Disponibilité des produits impossible à vérifier." });
      }
    })();
    return () => controller.abort();
  }, [productIds, availabilityKey]);

  useEffect(() => {
    const refresh = () => setAvailabilityRetry(value => value + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);
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

  // Cache Components preserves this page's state across navigations. A new cart starts a new checkout.
  // Keep the confirmation if clearing the previous cart failed, to prevent a duplicate order.
  if (ready && confirmation && !clearFailed && items.length > 0) {
    setConfirmation(null);
    setStep(1);
    setError("");
    setForm(initialForm(user));
  }

  const updateForm = (field: keyof Coordinates, value: string) => setForm(current => ({ ...current, [field]: value }));
  const mutateCart = (success: boolean) => {
    setError(success ? "" : "Impossible d’enregistrer le panier dans ce navigateur. Vérifiez que le stockage local est autorisé.");
    return success;
  };

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || confirmation || !ready || !items.length || (!retryingCheckout && (!deliveryReady || !canOrder))) return;
    if (!form.customerName.trim() || !form.customerPhone.trim() || !form.deliveryAddress.trim()) {
      setError("Le nom, le téléphone et l’adresse de livraison sont obligatoires.");
      return;
    }
    if (!isValidLocation(form.gouvernorat, form.ville)) {
      setError("Sélectionnez un gouvernorat tunisien et une ville correspondante.");
      return;
    }
    if (items.length > 100) { setError("Une commande peut contenir au maximum 100 produits différents."); return; }
    sending.current = true;
    setSubmitting(true);
    setError("");
    try {
      const fingerprint = await checkoutFingerprint(checkoutPayload);
      const previous = readCheckoutAttempt(checkoutStorageKey);
      const attempt = previous?.fingerprint === fingerprint ? previous : { key: crypto.randomUUID(), fingerprint };
      // Persist before sending. A lost response or page reload must reuse this key.
      localStorage.setItem(checkoutStorageKey, JSON.stringify(attempt));
      setRetryPayload(checkoutPayload);
      const response = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": attempt.key },
        body: checkoutPayload,
      });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Impossible d’enregistrer la commande."));
      if (![200, 201].includes(response.status) || !isConfirmation(data)) throw new Error("La confirmation du serveur est incorrecte. Le panier a été conservé.");
      if (cart.storageKey === "cart_guest") {
        const receipt = createGuestReceipt(data);
        setRecentReceipt(receipt);
        setReceiptWarning(!receipt ? "La commande est enregistrée, mais le reçu détaillé n’a pas pu être préparé. Conservez la référence affichée et contactez la boutique." :
          saveGuestReceipt(receipt) ? "" : "La commande est enregistrée, mais le navigateur n’a pas pu conserver le reçu. Imprimez-le ou enregistrez-le en PDF avant de fermer cette page.");
      }
      if (readCheckoutAttempt(checkoutStorageKey)?.key === attempt.key) localStorage.removeItem(checkoutStorageKey);
      setRetryPayload("");
      const cleared = clearItems();
      setClearFailed(!cleared);
      setConfirmation({ id: data.id, reference: data.reference, subtotal: data.subtotal, deliveryFee: data.deliveryFee, total: data.total });
    } catch (reason) {
      setAvailabilityRetry(value => value + 1);
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
            {!ready ? sessionError ? (
              <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                <p>{sessionError}</p>
                <button type="button" onClick={() => { void retrySession(); }} className={`mt-2 rounded font-bold underline ${focus}`}>Réessayer</button>
              </div>
            ) : <div role="status" className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">Chargement du panier…</div> : items.length === 0 && !submitting ? (
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
                          <div className="mt-2">{availabilityReady ? availabilityState.statuses[item.id] ? <AvailabilityBadge availability={availabilityState.statuses[item.id]!} /> : <span className="text-xs font-semibold text-red-700">Produit supprimé</span> : <span className="text-xs text-gray-500">Vérification de la disponibilité…</span>}</div>
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
                  {!canOrder && <div role="status" className="mt-4 text-sm text-red-700">
                    <p>{availabilityState.error || (availabilityReady ? "Retirez les produits indisponibles du panier pour commander." : "Vérification de la disponibilité…")}</p>
                    <button type="button" onClick={() => setAvailabilityRetry(value => value + 1)} className={`mt-2 rounded font-semibold underline ${focus}`}>Actualiser la disponibilité</button>
                  </div>}
                  <button type="button" disabled={!canOrder && !retryingCheckout} onClick={() => { setError(""); setFeeRetry(value => value + 1); setStep(2); }} className={`mt-6 w-full ${primary}`}>Passer commande</button>
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
                    <LocationSelects gouvernorat={form.gouvernorat} ville={form.ville} required inputClass={inputClass}
                      onChange={location => setForm(current => ({ ...current, ...location }))} />
                    <label className="text-sm font-semibold sm:col-span-2">Adresse de livraison *<textarea id="deliveryAddress" name="deliveryAddress" required maxLength={1000} rows={3} autoComplete="off" placeholder="Saisissez l’adresse pour cette commande" value={form.deliveryAddress} onChange={e => updateForm("deliveryAddress", e.target.value)} className={inputClass} /></label>
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
                  {!canOrder && <div role="status" className="mt-4 text-sm text-red-700"><p>{availabilityState.error || (availabilityReady ? "Certains produits sont indisponibles. Retournez au panier pour les retirer." : "Vérification de la disponibilité…")}</p><button type="button" onClick={() => setAvailabilityRetry(value => value + 1)} className={`mt-2 rounded font-semibold underline ${focus}`}>Actualiser la disponibilité</button></div>}
                  <button type="submit" disabled={submitting || !items.length || (!retryingCheckout && (!deliveryReady || !canOrder))} className={`mt-6 w-full ${primary}`}>{submitting ? "Enregistrement…" : "Confirmer la commande"}</button>
                </aside>
              </form>
            )}
          </>
        )}
        {ready && cart.storageKey === "cart_guest" && <GuestReceipts recentReceipt={recentReceipt} warning={receiptWarning}
          onSaved={() => setReceiptWarning("")} onForgot={() => { setRecentReceipt(null); setReceiptWarning(""); }} />}
      </div>
    </div>
  );
}
