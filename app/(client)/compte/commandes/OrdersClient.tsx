"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { accountButton, accountRequest } from "@/components/AccountArea";

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
    {detailsId !== null && <OrderDialog key={detailsId} id={detailsId} onClose={() => setDetailsId(null)} />}
  </section>;
}

function OrderDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { refresh } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
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
  return <dialog ref={dialog} aria-labelledby="order-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-gray-100 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/50">
    <div className="p-5 sm:p-8">
      <div className="flex items-start justify-between gap-3"><h2 id="order-title" className="min-w-0 break-all text-lg font-extrabold">{order ? order.reference : "Détails de la commande"}</h2><button autoFocus onClick={onClose} aria-label="Fermer les détails" className="shrink-0 rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-[#65D900]"><X size={20} /></button></div>
      {result.key !== retry ? <p role="status" className="py-8 text-sm text-gray-500">Chargement de la commande…</p> : result.error ?
        <div role="alert" className="mt-6 text-sm text-red-700"><p>{result.error}</p><button onClick={() => setRetry(v => v + 1)} className={`${accountButton} mt-3 bg-gray-100`}>Réessayer</button></div> : order && <>
          <div className="my-5 flex flex-wrap items-center justify-between gap-3"><time dateTime={order.createdAt} className="text-sm text-gray-500">{dateLabel(order.createdAt)}</time><Status status={order.status} /></div>
          <section className="rounded-xl bg-gray-50 p-4 text-sm"><h3 className="mb-3 font-bold">Coordonnées de livraison</h3><p className="break-words font-semibold">{order.customerName}</p><p className="mt-1">{order.customerPhone}</p>{order.customerEmail && <p className="mt-1 break-words">{order.customerEmail}</p>}<p className="mt-3 whitespace-pre-wrap break-words">{order.deliveryAddress}</p>{order.note && <p className="mt-3 whitespace-pre-wrap break-words"><span className="font-semibold">Note : </span>{order.note}</p>}</section>
          <h3 className="mt-6 font-bold">Articles commandés</h3>
          <ul className="mt-3 divide-y divide-gray-100">{order.items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-3 py-4 text-sm"><div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.productName}</p><p className="mt-1 text-gray-500">{item.quantity} × {money(item.unitPrice)}</p></div><p className="font-semibold tabular-nums">{money(millimes(item.unitPrice) * BigInt(item.quantity))}</p></li>)}</ul>
          <dl className="mt-4 space-y-3 border-t border-gray-200 pt-5 text-sm">{[["Sous-total", order.subtotal], ["Livraison", order.deliveryFee], ["Total", order.total]].map(([label, amount]) => <div key={label} className={`flex flex-wrap justify-between gap-3 ${label === "Total" ? "text-base font-extrabold" : "text-gray-600"}`}><dt>{label}</dt><dd className="tabular-nums">{money(amount)}</dd></div>)}</dl>
        </>}
      <button onClick={onClose} className={`${accountButton} mt-6 w-full bg-[#010101] text-white hover:bg-gray-800`}>Fermer</button>
    </div>
  </dialog>;
}