"use client";

import { useState } from "react";
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

// Séries fictives arrêtées au 17 novembre 2026, sans accès à une API.
const demoEnd = new Date("2026-11-17T12:00:00Z");
const monthlyOrders = [32, 41, 0, 45, 52, 48, 67, 61, 74, 83, 79, 57];
const monthlyRevenue = [2840.5, 3560, 0, 4125.9, 4890.3, 4360, 6240.5, 5680, 7120.8, 7980.4, 7540, 5290.6];
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const ordersData = monthlyOrders.map((count, index) => ({
  label: monthFormatter.format(new Date(Date.UTC(demoEnd.getUTCFullYear(), demoEnd.getUTCMonth() - 11 + index, 1))), count,
}));
const dailyRevenue = [125, 210.5, 185, 0, 342.9, 178.5, 240, 315, 165.5, 289, 0, 198, 420.8, 265, 312, 176, 390.5, 245, 298.5, 150, 365, 428.9, 220, 310.5, 480, 275, 395.5, 340, 510.9, 455];
const revenueData: Record<Period, { label: string; amount: number }[]> = {
  "7j": dailyRevenue.slice(-7).map((amount, index) => ({
    label: dayFormatter.format(new Date(demoEnd.getTime() - (6 - index) * 86400000)), amount,
  })),
  "30j": dailyRevenue.map((amount, index) => ({
    label: dayFormatter.format(new Date(demoEnd.getTime() - (29 - index) * 86400000)), amount,
  })),
  "12m": ordersData.map((item, index) => ({ label: item.label, amount: monthlyRevenue[index] })),
};
const statusData = [
  { status: "EN_ATTENTE", name: "En attente", value: 38, color: "#f59e0b" },
  { status: "CONFIRMEE", name: "Confirmée", value: 52, color: "#3b82f6" },
  { status: "EN_LIVRAISON", name: "En livraison", value: 43, color: "#8b5cf6" },
  { status: "LIVREE", name: "Livrée", value: 474, color: "#65D900" },
  { status: "ANNULEE", name: "Annulée", value: 32, color: "#ef4444" },
];
const totalOrders = monthlyOrders.reduce((sum, count) => sum + count, 0);
const money = (amount: number) => `${amount.toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
const percent = (value: number) => `${(value / totalOrders * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
const tooltipStyle = {
  borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 6%)",
};
const axisTick = { fill: "#6b7280", fontSize: 11 };

export default function OrderStatisticsPage() {
  const [period, setPeriod] = useState<Period>("12m");
  const data = revenueData[period];
  const revenue = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques commandes</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Analysez l&apos;évolution des ventes et le suivi des commandes.</p>
        <span className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">Aperçu avec données fictives · Novembre 2026</span>
      </header>

      <section aria-labelledby="revenue-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-gray-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="revenue-title" className="text-lg font-bold">Évolution du chiffre d&apos;affaires</h2>
              <p className="mt-1 text-sm text-gray-500">Montant des ventes sur la période sélectionnée.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><TrendingUp size={20} aria-hidden="true" /></span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p aria-live="polite" className="text-2xl font-bold tabular-nums">{money(revenue)}</p>
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
          <div className="h-[300px] min-w-0 sm:h-[340px]" role="img" aria-label={`Chiffre d'affaires sur ${periods.find(option => option.value === period)?.label} : ${money(revenue)}.`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} margin={{ top: 12, right: 14, left: 0, bottom: 4 }} accessibilityLayer>
                <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={12} minTickGap={22} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} tickFormatter={value => Number(value).toLocaleString("fr-FR")} />
                <Tooltip contentStyle={tooltipStyle} formatter={value => [money(Number(value)), "Chiffre d'affaires"]} cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }} />
                <Line type="monotone" dataKey="amount" stroke="#65D900" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#65D900", stroke: "#fff", strokeWidth: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="orders-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="orders-title" className="text-lg font-bold">Évolution du nombre de commandes</h2>
              <p className="mt-1 text-sm text-gray-500">{totalOrders} commandes sur les 12 derniers mois de démonstration.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><ChartColumn size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-3 pt-6 sm:p-6">
            <div className="h-[340px] min-w-0" role="img" aria-label={`Commandes par mois : ${ordersData.map(item => `${item.label} : ${item.count}`).join(", ")}.`}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={ordersData} margin={{ top: 12, right: 14, left: -24, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} tickMargin={12} minTickGap={16} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Commandes"]} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="count" fill="#65D900" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section aria-labelledby="statuses-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="statuses-title" className="text-lg font-bold">Répartition par statut</h2>
              <p className="mt-1 text-sm text-gray-500">Suivi des commandes de la période.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><ShoppingBag size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="relative h-[250px] min-w-0" role="img" aria-label={`Commandes par statut : ${statusData.map(item => `${item.name} ${percent(item.value)}`).join(", ")}.`}>
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
