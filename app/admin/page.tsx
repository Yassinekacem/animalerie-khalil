"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  CheckCircle2,
  Users,
} from "lucide-react";

type Status = "EN_ATTENTE" | "CONFIRMEE" | "EN_LIVRAISON" | "LIVREE" | "ANNULEE";
type Dashboard = {
  clients: number; products: number; orders: number; pendingOrders: number;
  deliveredOrders: number; deliveredTotal: string;
  recentOrders: { id: number; reference: string; customerName: string; createdAt: string; total: string; status: Status }[];
};
const statuses: Record<Status, { label: string; style: string }> = {
  EN_ATTENTE: { label: "En attente", style: "bg-amber-50 text-amber-800" },
  CONFIRMEE: { label: "Confirmée", style: "bg-blue-50 text-blue-800" },
  EN_LIVRAISON: { label: "En livraison", style: "bg-violet-50 text-violet-800" },
  LIVREE: { label: "Livrée", style: "bg-[#65D900]/15 text-[#306900]" },
  ANNULEE: { label: "Annulée", style: "bg-red-50 text-red-700" },
};
function money(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return `${BigInt(whole).toLocaleString("fr-TN")},${fraction.padEnd(3, "0")} TND`;
}
const dateLabel = (value: string) => new Date(value).toLocaleDateString("fr-TN", { timeZone: "Africa/Tunis" });

export default function AdminPage() {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; data: Dashboard | null; error: string }>({ key: -1, data: null, error: "" });
  const loading = result.key !== retry;
  const data = !loading ? result.data : null;
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Impossible de charger le tableau de bord.");
        if (!controller.signal.aborted) setResult({ key: retry, data: payload, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key: retry, data: null, error: error instanceof TypeError ?
          "Impossible de contacter le serveur." : error instanceof Error ? error.message : "Impossible de charger le tableau de bord." });
      }
    })();
    return () => controller.abort();
  }, [retry]);
  const statistics = [
    { label: "Clients", value: data?.clients, detail: "Clients inscrits", icon: Users },
    { label: "Produits", value: data?.products, detail: "Références au catalogue", icon: Package },
    { label: "Commandes", value: data?.orders, detail: "Commandes au total", icon: ShoppingBag },
    { label: "Commandes en attente", value: data?.pendingOrders, detail: "À prendre en charge", icon: Clock3 },
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
            Animalerie Khalil
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tableau de bord</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Bienvenue ! Retrouvez un aperçu de votre boutique et des dernières commandes.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
          <Link
            href="/admin/produits"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#65D900] px-4 py-3 text-sm font-semibold transition hover:bg-[#58bf00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010101]"
          >
            <Plus size={18} aria-hidden="true" />
            Gérer les produits
          </Link>
          <Link
            href="/admin/commandes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#010101] px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010101]"
          >
            Voir les commandes
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <button type="button" disabled={loading} onClick={() => setRetry(value => value + 1)}
        className="rounded-lg text-sm font-semibold text-[#306900] underline disabled:opacity-50 focus-visible:outline-2">Actualiser les données</button>
      {loading && <p role="status" className="text-sm text-gray-500">Chargement du tableau de bord…</p>}
      {!loading && result.error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        <p>{result.error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded font-semibold underline focus-visible:outline-2">Réessayer</button>
      </div>}

      <section aria-label="Chiffres clés" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {statistics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-gray-600">{label}</h2>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]">
                <Icon size={21} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tabular-nums">{value ?? "—"}</p>
            <p className="mt-1 text-xs text-gray-500">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 2xl:grid-cols-3">
        <section aria-labelledby="recent-orders" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm 2xl:col-span-2">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 id="recent-orders" className="text-lg font-bold">Dernières commandes</h2>
            <p className="mt-1 text-sm text-gray-500">Les 5 commandes les plus récentes de la boutique.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Dernières commandes : référence, client, date, montant en TND et statut.</caption>
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">Commande</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Client</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Date</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Montant</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.recentOrders.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-500">Aucune commande pour le moment.</td></tr>}
                {data?.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <th scope="row" className="whitespace-nowrap px-5 py-5 font-semibold"><Link href="/admin/commandes" className="rounded hover:underline focus-visible:outline-2">{order.reference}</Link></th>
                    <td className="whitespace-nowrap px-5 py-5 text-gray-600">{order.customerName}</td>
                    <td className="px-5 py-5 text-gray-500"><time dateTime={order.createdAt}>{dateLabel(order.createdAt)}</time></td>
                    <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums">{money(order.total)}</td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statuses[order.status].style}`}>
                        {statuses[order.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="delivered-orders" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="shrink-0 text-[#306900]" aria-hidden="true" />
              <h2 id="delivered-orders" className="text-lg font-bold">Commandes livrées</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Montants enregistrés des commandes au statut « Livrée ».</p>
          </div>
          <dl className="space-y-5 p-5 sm:p-6">
            <div><dt className="text-sm text-gray-500">Nombre de commandes</dt><dd className="mt-2 text-3xl font-bold tabular-nums">{data?.deliveredOrders ?? "—"}</dd></div>
            <div className="border-t border-gray-100 pt-5"><dt className="text-sm text-gray-500">Montant total, livraison comprise</dt><dd className="mt-2 break-words text-xl font-bold tabular-nums">{data ? money(data.deliveredTotal) : "—"}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
