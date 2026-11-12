"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, MapPin, Package, Search, ShoppingBag, X } from "lucide-react";

const statuses = ["En attente", "Confirmée", "En livraison", "Livrée", "Annulée"] as const;
type Status = (typeof statuses)[number];
type Order = {
  number: string;
  client: string;
  phone: string;
  address: string;
  date: string;
  status: Status;
  delivery: number;
  items: { name: string; quantity: number; price: number }[];
};

// Tous les prix sont en millimes : 1 TND = 1 000 millimes.
const initialOrders: Order[] = [
  { number: "CMD-0384", client: "Amira Ben Ali", phone: "+216 55 123 456", address: "12 rue des Jasmins, La Marsa, 2070 Tunis", date: "2026-11-12", status: "En attente", delivery: 7000, items: [
    { name: "Croquettes pour chat stérilisé · 2 kg", quantity: 2, price: 48500 },
    { name: "Souris en peluche pour chat", quantity: 1, price: 12900 },
  ] },
  { number: "CMD-0383", client: "Mohamed Trabelsi", phone: "+216 98 456 789", address: "8 avenue Habib Bourguiba, 4000 Sousse", date: "2026-11-12", status: "Confirmée", delivery: 8000, items: [
    { name: "Croquettes pour chien adulte · 3 kg", quantity: 1, price: 65000 },
    { name: "Collier réglable pour chien", quantity: 1, price: 18500 },
  ] },
  { number: "CMD-0382", client: "Inès Mansour", phone: "+216 26 789 012", address: "25 rue de la Liberté, 3000 Sfax", date: "2026-11-11", status: "En livraison", delivery: 8000, items: [
    { name: "Graines pour perruches · 1 kg", quantity: 3, price: 14750 },
    { name: "Mangeoire pour oiseaux", quantity: 1, price: 22500 },
  ] },
  { number: "CMD-0381", client: "Youssef Gharbi", phone: "+216 22 345 678", address: "4 rue des Orangers, 8000 Nabeul", date: "2026-11-10", status: "Livrée", delivery: 7000, items: [
    { name: "Pâtée pour chat au poulet · 85 g", quantity: 6, price: 4250 },
    { name: "Gamelle en inox", quantity: 2, price: 15900 },
  ] },
  { number: "CMD-0380", client: "Sarra Ayari", phone: "+216 50 234 567", address: "16 avenue de la République, 5000 Monastir", date: "2026-11-09", status: "Annulée", delivery: 8000, items: [
    { name: "Foin pour lapin · 1 kg", quantity: 2, price: 18000 },
    { name: "Biberon pour rongeur · 250 ml", quantity: 1, price: 14500 },
  ] },
  { number: "CMD-0379", client: "Aziz Jebali", phone: "+216 97 654 321", address: "9 rue de Carthage, 9000 Béja", date: "2026-11-08", status: "En attente", delivery: 8000, items: [
    { name: "Flocons pour poissons · 100 g", quantity: 2, price: 12750 },
    { name: "Épuisette pour aquarium", quantity: 1, price: 9500 },
  ] },
];

const badgeStyles: Record<Status, string> = {
  "En attente": "bg-amber-50 text-amber-800",
  "Confirmée": "bg-blue-50 text-blue-800",
  "En livraison": "bg-violet-50 text-violet-800",
  "Livrée": "bg-[#65D900]/15 text-[#306900]",
  "Annulée": "bg-red-50 text-red-700",
};
const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101]";
const money = (millimes: number) => `${(millimes / 1000).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
const dateLabel = (date: string) => date.split("-").reverse().join("/");
const subtotal = (order: Order) => order.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Badge({ status }: { status: Status }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}>{status}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={ref} aria-labelledby="order-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="order-modal-title" className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2"><X size={20} aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [detailsNumber, setDetailsNumber] = useState<string | null>(null);
  const [cancelNumber, setCancelNumber] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const query = normalize(search.trim());
  const phoneQuery = search.replace(/\D/g, "");
  const visibleOrders = orders.filter((order) =>
    (!status || order.status === status) && (
      normalize(order.number).includes(query) || normalize(order.client).includes(query) ||
      (phoneQuery.length > 0 && /^[\d\s+().-]+$/.test(search.trim()) && order.phone.replace(/\D/g, "").includes(phoneQuery))
    )
  );
  const detailOrder = orders.find((order) => order.number === detailsNumber);
  const cancelOrder = orders.find((order) => order.number === cancelNumber);

  function updateStatus(number: string, nextStatus: Status) {
    setOrders((current) => current.map((order) => order.number === number ? { ...order, status: nextStatus } : order));
    setNotice(`Commande ${number} : statut « ${nextStatus} » enregistré.`);
  }

  function requestStatus(number: string, nextStatus: Status) {
    if (nextStatus === "Annulée") setCancelNumber(number);
    else updateStatus(number, nextStatus);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des commandes</h1>
          <p className="mt-3 text-sm text-gray-600">Consultez les commandes et suivez leur livraison.</p>
        </div>
        <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <span className="rounded-xl bg-[#010101] p-3 text-[#65D900]"><ShoppingBag size={23} aria-hidden="true" /></span>
          <div><p className="text-2xl font-bold">{orders.length}</p><p className="text-xs text-gray-500">Commandes au total</p></div>
        </div>
      </header>
      <p className="text-xs text-gray-500">Données fictives · Les modifications disparaissent au rechargement.</p>
      <p role="status" className="text-sm text-[#306900]">{notice}</p>

      <section aria-label="Recherche et filtre" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[2fr_1fr]">
        <label className="text-sm font-medium">Rechercher une commande
          <span className="relative mt-2 block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-gray-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Numéro, nom du client ou téléphone…" className={`${inputClass} pl-10`} />
          </span>
        </label>
        <label className="text-sm font-medium">Statut
          <select value={status} onChange={(event) => setStatus(event.target.value as Status | "")} className={`${inputClass} mt-2`}>
            <option value="">Tous les statuts</option>
            {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <section aria-labelledby="orders-title" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5">
          <h2 id="orders-title" className="font-bold">Liste des commandes</h2>
          <p aria-live="polite" className="mt-1 text-sm text-gray-500">{visibleOrders.length} résultat{visibleOrders.length > 1 ? "s" : ""}</p>
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Tableau des commandes défilant horizontalement" tabIndex={0}>
          <table className="w-full min-w-[1150px] text-left text-sm">
            <caption className="sr-only">Commandes fictives, montants en TND et actions de gestion</caption>
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Numéro", "Client", "Téléphone", "Date", "Montant total", "Statut", "Actions"].map((label) => <th scope="col" key={label} className="whitespace-nowrap px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {visibleOrders.map((order) => (
                <tr key={order.number} className="hover:bg-gray-50">
                  <th scope="row" className="whitespace-nowrap px-5 py-5 font-semibold">{order.number}</th>
                  <td className="whitespace-nowrap px-5 py-5">{order.client}</td>
                  <td className="whitespace-nowrap px-5 py-5 text-gray-600">{order.phone}</td>
                  <td className="px-5 py-5 text-gray-600"><time dateTime={order.date}>{dateLabel(order.date)}</time></td>
                  <td className="whitespace-nowrap px-5 py-5 font-semibold tabular-nums">{money(subtotal(order) + order.delivery)}</td>
                  <td className="px-5 py-5"><Badge status={order.status} /></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-2">
                    <button type="button" onClick={() => setDetailsNumber(order.number)} aria-label={`Consulter les détails de ${order.number}`} title="Consulter les détails" className="rounded-lg p-2.5 hover:bg-[#65D900]/20 focus-visible:outline-2"><Eye size={18} aria-hidden="true" /></button>
                    <select aria-label={`Changer le statut de ${order.number}`} value={order.status} onChange={(event) => requestStatus(order.number, event.target.value as Status)} className={`${inputClass} min-w-36`}>
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div></td>
                </tr>
              ))}
              {visibleOrders.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Aucune commande ne correspond à vos filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {detailOrder && (
        <Modal title={`Commande ${detailOrder.number}`} onClose={() => setDetailsNumber(null)}>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Passée le <time dateTime={detailOrder.date}>{dateLabel(detailOrder.date)}</time></p>
            <Badge status={detailOrder.status} />
          </div>
          <section aria-labelledby="customer-title" className="mb-6 rounded-xl bg-gray-50 p-4">
            <h3 id="customer-title" className="mb-3 flex items-center gap-2 text-sm font-bold"><MapPin size={17} aria-hidden="true" />Client et livraison</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-gray-500">Nom du client</dt><dd className="mt-1 font-medium">{detailOrder.client}</dd></div>
              <div><dt className="text-gray-500">Téléphone</dt><dd className="mt-1">{detailOrder.phone}</dd></div>
              <div className="sm:col-span-2"><dt className="text-gray-500">Adresse de livraison</dt><dd className="mt-1 break-words">{detailOrder.address}</dd></div>
            </dl>
          </section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Package size={17} aria-hidden="true" />Articles commandés</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200" role="region" aria-label="Articles de la commande, tableau défilant horizontalement" tabIndex={0}>
            <table className="w-full min-w-[550px] text-left text-sm">
              <caption className="sr-only">Articles et calcul des sous-totaux en TND</caption>
              <thead className="bg-gray-50 text-xs text-gray-500"><tr><th scope="col" className="px-4 py-3">Article</th><th scope="col" className="px-4 py-3 text-right">Quantité</th><th scope="col" className="px-4 py-3 text-right">Prix unitaire</th><th scope="col" className="px-4 py-3 text-right">Sous-total</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{detailOrder.items.map((item) => <tr key={item.name}>
                <th scope="row" className="px-4 py-4 font-medium">{item.name}</th>
                <td className="px-4 py-4 text-right tabular-nums">{item.quantity}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">{money(item.price)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">{money(item.quantity * item.price)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <dl className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-gray-600">Sous-total des articles</dt><dd className="whitespace-nowrap font-medium tabular-nums">{money(subtotal(detailOrder))}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-600">Frais de livraison</dt><dd className="whitespace-nowrap font-medium tabular-nums">{money(detailOrder.delivery)}</dd></div>
            <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-bold"><dt>Montant total</dt><dd className="whitespace-nowrap tabular-nums">{money(subtotal(detailOrder) + detailOrder.delivery)}</dd></div>
          </dl>
          <div className="mt-6 flex justify-end"><button type="button" onClick={() => setDetailsNumber(null)} className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}>Fermer</button></div>
        </Modal>
      )}

      {cancelOrder && (
        <Modal title="Annuler la commande" onClose={() => setCancelNumber(null)}>
          <p className="text-sm leading-6 text-gray-600">Voulez-vous vraiment annuler la commande <strong className="text-[#010101]">{cancelOrder.number}</strong> de {cancelOrder.client} ? Son statut actuel est « {cancelOrder.status} ». Le statut « Annulée » sera appliqué après confirmation.</p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setCancelNumber(null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>Conserver la commande</button>
            <button type="button" onClick={() => { updateStatus(cancelOrder.number, "Annulée"); setCancelNumber(null); }} className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}>Confirmer l’annulation</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
