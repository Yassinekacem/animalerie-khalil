"use client";

import { useEffect, useState } from "react";
import { ChartColumn, ShoppingBag, TrendingUp } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const periods = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "12m", label: "12 mois" },
] as const;
type Period = (typeof periods)[number]["value"];

const statuses = {
  EN_ATTENTE: { name: "En attente", color: "#f59e0b" },
  CONFIRMEE: { name: "Confirmée", color: "#3b82f6" },
  EN_LIVRAISON: { name: "En livraison", color: "#8b5cf6" },
  LIVREE: { name: "Livrée", color: "#65D900" },
  ANNULEE: { name: "Annulée", color: "#ef4444" },
} as const;
type Statistics = {
  evolution: { date: string; label: string; count: number; amount: string }[];
  repartitionStatuts: { status: keyof typeof statuses; value: number }[];
  totalOrders: number;
  totalRevenue: string;
};

function isStatistics(value: unknown): value is Statistics {
  if (!value || typeof value !== "object") return false;
  const data = value as Statistics;
  const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0;
  const amount = (value: unknown) => typeof value === "string" && /^\d+(?:\.\d{1,3})?$/.test(value) && Number.isFinite(Number(value));
  return count(data.totalOrders) && amount(data.totalRevenue) && Array.isArray(data.evolution) && data.evolution.length > 0 &&
    data.evolution.every(item => item && typeof item.date === "string" && typeof item.label === "string" && count(item.count) && amount(item.amount)) &&
    Array.isArray(data.repartitionStatuts) && data.repartitionStatuts.length === Object.keys(statuses).length &&
    data.repartitionStatuts.every(item => item && Object.hasOwn(statuses, item.status) && count(item.value)) &&
    new Set(data.repartitionStatuts.map(item => item.status)).size === Object.keys(statuses).length &&
    data.evolution.reduce((sum, item) => sum + item.count, 0) === data.totalOrders &&
    data.repartitionStatuts.reduce((sum, item) => sum + item.value, 0) === data.totalOrders;
}

const money = (amount: string | number) => {
  // Keep PostgreSQL's decimal total exact; only chart coordinates use numbers.
  if (typeof amount === "string") {
    const [dinars, fraction = ""] = amount.split(".");
    return `${BigInt(dinars).toLocaleString("fr-TN")},${fraction.padEnd(3, "0")} TND`;
  }
  return `${amount.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
};
const tooltipStyle = {
  borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 6%)",
};
const axisTick = { fill: "#6b7280", fontSize: 11 };

function ChartPlaceholder({ loading, error }: { loading: boolean; error: string }) {
  return loading ? <div aria-hidden="true" className="h-full animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" /> :
    <p className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">{error ? "Graphique indisponible." : "Aucune commande sur cette période."}</p>;
}

export default function OrderStatisticsPage() {
  const [period, setPeriod] = useState<Period>("12m");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; data: Statistics | null; error: string }>({ key: "", data: null, error: "" });
  const key = `${period}:${retry}`;
  const loading = result.key !== key;
  const statistics = loading ? null : result.data;
  const error = loading ? "" : result.error;
  const periodLabel = periods.find(option => option.value === period)!.label.toLowerCase();

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/statistiques/commandes?periode=${period}`, { cache: "no-store", signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "Impossible de charger les statistiques.");
        if (!isStatistics(payload)) throw new Error("La réponse des statistiques est incorrecte.");
        if (!controller.signal.aborted) setResult({ key, data: payload, error: "" });
      } catch (reason) {
        if (!controller.signal.aborted) setResult({ key, data: null, error: reason instanceof TypeError ? "Impossible de contacter le serveur." : reason instanceof Error ? reason.message : "Impossible de charger les statistiques." });
      }
    })();
    return () => controller.abort();
  }, [period, key]);

  const data = (statistics?.evolution ?? []).map(item => ({ ...item, amount: Number(item.amount) }));
  const ordersData = data;
  const statusData = (statistics?.repartitionStatuts ?? []).map(item => ({ ...item, ...statuses[item.status] }));
  const totalOrders = statistics?.totalOrders ?? 0;
  const revenue = statistics?.totalRevenue ?? "0";
  const percent = (value: number) => `${(totalOrders ? value / totalOrders * 100 : 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques commandes</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Analysez l&apos;évolution des ventes et le suivi des commandes.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">Données réelles des commandes · Calendrier tunisien</span>
          <button type="button" disabled={loading} onClick={() => setRetry(value => value + 1)} className="rounded text-xs font-semibold text-[#306900] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Actualiser</button>
        </div>
      </header>

      {loading && <p role="status" className="sr-only">Chargement des statistiques…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded font-semibold underline focus-visible:outline-2">Réessayer</button></div>}

      <section aria-labelledby="revenue-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="revenue-title" className="text-lg font-bold">Évolution du chiffre d&apos;affaires</h2>
              <p className="mt-1 text-sm text-gray-500">Total des commandes actuellement livrées, livraison comprise, regroupées par date de création.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><TrendingUp size={20} aria-hidden="true" /></span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="text-2xl font-bold tabular-nums">{loading ? "Chargement…" : error ? "—" : money(revenue)}</p>
            <div role="group" aria-label="Période du chiffre d'affaires" className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
              {periods.map(option => (
                <button key={option.value} type="button" aria-pressed={period === option.value} onClick={() => setPeriod(option.value)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#306900] ${period === option.value ? "bg-[#65D900] text-black shadow-sm" : "text-gray-500 hover:bg-white hover:text-black"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="p-3 pt-6 sm:p-6">
          <div className="h-[300px] min-w-0 sm:h-[340px]" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Chiffre d'affaires sur ${periodLabel} : ${money(revenue)}.` : undefined}>
            {loading || error || !totalOrders ? <ChartPlaceholder loading={loading} error={error} /> :
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 12, right: 14, left: 0, bottom: 4 }} accessibilityLayer>
                <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={12} minTickGap={22} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} tickFormatter={value => Number(value).toLocaleString("fr-FR")} />
                <Tooltip contentStyle={tooltipStyle} formatter={value => [money(Number(value)), "Chiffre d'affaires"]} cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }} />
                <Line type="monotone" dataKey="amount" stroke="#65D900" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#65D900", stroke: "#fff", strokeWidth: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            }
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="orders-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="orders-title" className="text-lg font-bold">Évolution du nombre de commandes</h2>
              <p className="mt-1 text-sm text-gray-500">{loading ? "Chargement…" : error ? "Données indisponibles." : `${totalOrders} commandes sur les ${periodLabel}, tous statuts confondus.`}</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><ChartColumn size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-3 pt-6 sm:p-6">
            <div className="h-[340px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Commandes par ${period === "12m" ? "mois" : "jour"} : ${ordersData.map(item => `${item.label} : ${item.count}`).join(", ")}.` : undefined}>
              {loading || error || !totalOrders ? <ChartPlaceholder loading={loading} error={error} /> :
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={ordersData} margin={{ top: 12, right: 14, left: -24, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={12} minTickGap={16} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Commandes"]} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="count" fill="#65D900" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
              }
            </div>
          </div>
        </section>

        <section aria-labelledby="statuses-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="statuses-title" className="text-lg font-bold">Répartition par statut</h2>
              <p className="mt-1 text-sm text-gray-500">Statut actuel des commandes créées sur les {periodLabel}.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><ShoppingBag size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="relative h-[250px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Commandes par statut : ${statusData.map(item => `${item.name} ${percent(item.value)}`).join(", ")}.` : undefined}>
              {loading || error || !totalOrders ? <ChartPlaceholder loading={loading} error={error} /> : <>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart accessibilityLayer>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="68%" outerRadius="88%" paddingAngle={3} cornerRadius={5} stroke="none" isAnimationActive={false}>
                    {statusData.map(item => <Cell key={item.status} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} commandes · ${percent(Number(value))}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">{totalOrders}</span>
                <span className="mt-1 text-xs text-gray-500">Commandes</span>
              </div>
              </>}
            </div>
            <ul className="mt-3 space-y-3" aria-label="Légende des statuts de commande">
              {statusData.map(item => (
                <li key={item.status} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="flex items-center gap-3 text-gray-600"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums">{percent(item.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
