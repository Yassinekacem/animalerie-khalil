"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { accountButton, accountRequest } from "@/components/AccountArea";
import { useToast } from "@/components/ToastProvider";

const statuses = { EN_ATTENTE: "En attente", CONFIRMEE: "Confirmée", EN_LIVRAISON: "En livraison", LIVREE: "Livrée", ANNULEE: "Annulée" } as const;
type Order = { id: number; reference: string; status: keyof typeof statuses; createdAt: string; total: string };
type OrderDetail = Order & { customerName: string; customerPhone: string; customerEmail: string | null; deliveryAddress: string; note: string | null; subtotal: string; deliveryFee: string; items: { id: number; productName: string; quantity: number; unitPrice: string }[] };
type OrderList = { orders: Order[]; total: number; page: number; totalPages: number };
const dateLabel = (date: string) => new Date(date).toLocaleString("fr-TN", { timeZone: "Africa/Tunis" });
function millimes(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
function money(amount: string | bigint) {
  const value = typeof amount === "bigint" ? amount : millimes(amount);
  return `${(value / BigInt(1000)).toLocaleString("fr-TN")},${String(value % BigInt(1000)).padStart(3, "0")} TND`;
}
function Status({ status }: { status: Order["status"] }) {
  const colors = { EN_ATTENTE: "bg-amber-50 text-amber-800", CONFIRMEE: "bg-blue-50 text-blue-800", EN_LIVRAISON: "bg-violet-50 text-violet-800", LIVREE: "bg-[#65D900]/15 text-[#306900]", ANNULEE: "bg-red-50 text-red-700" };
  return <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>{statuses[status]}</span>;
}

export default function OrdersClient() {
  const { refresh } = useAuth();
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const key = `${page}:${retry}`;
  const [result, setResult] = useState<{ key: string; data?: OrderList; error?: string }>({ key: "" });
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<OrderList>(`/api/orders?scope=mine&page=${page}&pageSize=12`, { signal: controller.signal }, refresh)
      .then(data => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : "Commandes indisponibles." }); });
    return () => controller.abort();
  }, [key, page, refresh]);
  const data = result.key === key ? result.data : undefined;
  return <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-extrabold">Mes commandes</h2><button onClick={() => setRetry(v => v + 1)} className={`${accountButton} bg-gray-100 hover:bg-gray-200`}>Actualiser</button></div>
    {result.key !== key ? <p role="status" className="py-10 text-center text-sm text-gray-500">Chargement des commandes…</p> : result.error ?
      <div role="alert" className="mt-6 text-sm text-red-700"><p>{result.error}</p><button onClick={() => setRetry(v => v + 1)} className={`${accountButton} mt-3 bg-gray-100`}>Réessayer</button></div> : data && (data.total === 0 ?
        <div className="py-12 text-center"><ShoppingBag className="mx-auto mb-4 text-gray-300" size={40} aria-hidden="true" /><p className="font-bold">Vous n’avez pas encore de commande.</p><Link href="/boutique" className={`${accountButton} mt-5 bg-[#65D900]`}>Découvrir la boutique</Link></div> : <>
          <p className="mt-3 text-sm text-gray-500">{data.total} commande{data.total > 1 ? "s" : ""}</p>
          <ul className="mt-6 divide-y divide-gray-100">
            {data.orders.map(order => <li key={order.id}><button onClick={() => setDetailsId(order.id)} aria-haspopup="dialog" className="grid w-full gap-3 rounded-xl px-3 py-5 text-left transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#65D900] sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <span className="min-w-0"><span className="block break-all text-sm font-bold">{order.reference}</span><time dateTime={order.createdAt} className="mt-1 block text-xs text-gray-500">{dateLabel(order.createdAt)}</time></span>
              <span><Status status={order.status} /></span><span className="text-sm font-bold tabular-nums">{money(order.total)}<span className="mt-1 block text-xs font-normal text-gray-500">Voir les détails →</span></span>
            </button></li>)}
          </ul>
          {data.totalPages > 1 && <nav aria-label="Pagination des commandes" className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5">
            <button disabled={data.page <= 1} onClick={() => setPage(data.page - 1)} className={`${accountButton} bg-gray-100`}>Précédent</button>
            <span className="text-sm text-gray-500">Page {data.page} sur {data.totalPages}</span>
            <button disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)} className={`${accountButton} bg-gray-100`}>Suivant</button>
          </nav>}
        </>)}
    {detailsId !== null && <OrderDialog key={detailsId} id={detailsId} onClose={() => setDetailsId(null)} onUpdate={updated => {
      setResult(current => current.data ? { ...current, data: { ...current.data, orders: current.data.orders.map(order => order.id === updated.id ? { ...order, status: updated.status } : order) } } : current);
    }} />}
  </section>;
}

function OrderDialog({ id, onClose, onUpdate }: { id: number; onClose: () => void; onUpdate: (order: OrderDetail) => void }) {
  const { refresh } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const toast = useToast();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const saving = useRef(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; data?: OrderDetail; error?: string }>({ key: -1 });
  useEffect(() => {
    const element = dialog.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<OrderDetail>(`/api/orders/${id}?scope=mine`, { signal: controller.signal }, refresh)
      .then(data => { if (!controller.signal.aborted) setResult({ key: retry, data }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key: retry, error: error instanceof Error ? error.message : "Commande indisponible." }); });
    return () => controller.abort();
  }, [id, retry, refresh]);
  const order = result.key === retry ? result.data : undefined;
  const close = () => { if (!saving.current) onClose(); };

  async function cancelOrder() {
    if (saving.current || !confirmCancel || order?.status !== "EN_ATTENTE") return;
    saving.current = true;
    setCancelling(true);
    setCancelError("");
    try {
      const response = await fetch(`/api/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "ANNULEE" }), cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401) void refresh();
        if (response.status === 409) {
          try {
            const current = await accountRequest<OrderDetail>(`/api/orders/${id}?scope=mine`, {}, refresh);
            setResult({ key: retry, data: current });
            onUpdate(current);
            setConfirmCancel(false);
          } catch { /* Preserve the cancellation error and allow an explicit refresh. */ }
        }
        throw new Error(data?.error ?? "Impossible d’annuler la commande. Veuillez réessayer.");
      }
      if (data?.id !== id || data.status !== "ANNULEE") throw new Error("Réponse du serveur incorrecte. Actualisez les détails avant de réessayer.");
      onUpdate(data);
      onClose();
      toast("Votre commande a été annulée.");
    } catch (error) {
      setCancelError(error instanceof TypeError ? "Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez." : error instanceof Error ? error.message : "Impossible d’annuler la commande.");
    } finally {
      saving.current = false;
      setCancelling(false);
    }
  }

  return <dialog ref={dialog} aria-labelledby="order-title" aria-busy={cancelling} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50">
    <div className="p-5 sm:p-8">
      <div className="flex items-start justify-between gap-3"><h2 id="order-title" className="min-w-0 break-all text-lg font-extrabold">{order ? order.reference : "Détails de la commande"}</h2><button autoFocus onClick={close} disabled={cancelling} aria-label="Fermer les détails" className="shrink-0 rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#65D900] disabled:opacity-50"><X size={20} /></button></div>
      {result.key !== retry ? <p role="status" className="py-8 text-sm text-gray-500">Chargement de la commande…</p> : result.error ?
        <div role="alert" className="mt-6 text-sm text-red-700"><p>{result.error}</p><button onClick={() => setRetry(v => v + 1)} className={`${accountButton} mt-3 bg-gray-100`}>Réessayer</button></div> : order && <>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3"><time dateTime={order.createdAt} className="text-sm text-gray-500">{dateLabel(order.createdAt)}</time><Status status={order.status} /></div>
          <section className="rounded-xl bg-gray-50 p-4 text-sm"><h3 className="mb-3 font-bold">Coordonnées de livraison</h3><p className="break-words font-semibold">{order.customerName}</p><p className="mt-1">{order.customerPhone}</p>{order.customerEmail && <p className="mt-1 break-words">{order.customerEmail}</p>}<p className="mt-3 whitespace-pre-wrap break-words">{order.deliveryAddress}</p>{order.note && <p className="mt-3 whitespace-pre-wrap break-words"><span className="font-semibold">Note : </span>{order.note}</p>}</section>
          <h3 className="mt-6 font-bold">Articles commandés</h3>
          <ul className="mt-3 divide-y divide-gray-100">{order.items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.productName}</p><p className="mt-1 text-gray-500">{item.quantity} × {money(item.unitPrice)}</p></div><p className="font-semibold tabular-nums">{money(millimes(item.unitPrice) * BigInt(item.quantity))}</p></li>)}</ul>
          <dl className="mt-4 space-y-3 border-t border-gray-200 pt-5 text-sm">{[["Sous-total", order.subtotal], ["Livraison", order.deliveryFee], ["Total", order.total]].map(([label, amount]) => <div key={label} className={`flex flex-wrap justify-between gap-3 ${label === "Total" ? "text-base font-extrabold" : "text-gray-600"}`}><dt>{label}</dt><dd className="tabular-nums">{money(amount)}</dd></div>)}</dl>
        </>}
      {order?.status === "EN_ATTENTE" && <div className="mt-6 border-t border-gray-100 pt-5">
        {confirmCancel ? <section aria-labelledby="cancel-order-title" className="rounded-xl border border-red-100 bg-red-50/60 p-4">
          <h3 id="cancel-order-title" className="text-sm font-bold text-gray-900">Confirmer l’annulation ?</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">La commande {order.reference} sera annulée. Cette action est définitive.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={cancelling} onClick={() => setConfirmCancel(false)} className={`${accountButton} bg-white text-gray-800`}>Conserver ma commande</button>
            <button type="button" disabled={cancelling} onClick={() => void cancelOrder()} className={`${accountButton} bg-red-600 text-white hover:bg-red-700`}>{cancelling ? "Annulation en cours…" : "Oui, annuler la commande"}</button>
          </div>
        </section> : <button type="button" onClick={() => { setCancelError(""); setConfirmCancel(true); }} className={`${accountButton} w-full border border-red-200 bg-white text-red-700 hover:bg-red-50`}>Annuler la commande</button>}
      </div>}
      {cancelError && <div role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><p>{cancelError}</p><button type="button" disabled={cancelling} onClick={() => { setConfirmCancel(false); setCancelError(""); setRetry(value => value + 1); }} className="mt-3 rounded font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-[#65D900]">Actualiser les détails</button></div>}
      <button onClick={close} disabled={cancelling} className={`${accountButton} mt-6 w-full bg-[#010101] text-white hover:bg-gray-800`}>Fermer</button>
    </div>
  </dialog>;
}
