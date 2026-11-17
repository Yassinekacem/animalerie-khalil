"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const periods = [
  { value: "7j", label: "7 jours" },
  { value: "30j", label: "30 jours" },
  { value: "12m", label: "12 mois" },
] as const;
type Period = (typeof periods)[number]["value"];

type Statistics = {
  evolutionInscriptions: { date: string; label: string; count: number }[];
  repartitionSexe: { name: string; value: number }[];
};
const tooltipStyle = {
  borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 6%)",
};

export default function UserStatisticsPage() {
  const [period, setPeriod] = useState<Period>("12m");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string; data: Statistics | null; error: string;
  }>({ key: "", data: null, error: "" });
  const key = `${period}:${retry}`;
  const loading = result.key !== key;
  const statistics = loading ? null : result.data;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/admin/statistiques/utilisateurs?periode=${period}`, {
          cache: "no-store", signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Impossible de charger les statistiques.");
        if (!controller.signal.aborted) setResult({ key, data: payload, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, data: null, error: error instanceof TypeError ?
          "Impossible de contacter le serveur." : error instanceof Error ? error.message : "Impossible de charger les statistiques." });
      }
    })();
    return () => controller.abort();
  }, [period, key]);

  const data = statistics?.evolutionInscriptions ?? [];
  const genderData = (statistics?.repartitionSexe ?? []).map(item => ({
    ...item, color: item.name === "Hommes" ? "#65D900" : "#010101",
  }));
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const genderTotal = genderData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques utilisateurs</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Suivez les inscriptions et découvrez la répartition de votre clientèle.</p>
        <span className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">Données réelles des clients</span>
      </header>

      {loading && <p role="status" className="sr-only">Chargement des statistiques…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded font-semibold underline focus-visible:outline-2">Réessayer</button>
      </div>}

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-3">
        <section aria-labelledby="registrations-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="registrations-title" className="text-lg font-bold">Évolution des inscriptions</h2>
                <p className="mt-1 text-sm text-gray-500">Nouveaux comptes sur la période sélectionnée.</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><TrendingUp size={20} aria-hidden="true" /></span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-500"><span className="mr-2 inline-block text-2xl font-bold tabular-nums text-[#010101]">{loading ? <span aria-hidden="true" className="inline-block h-7 w-12 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" /> : error ? "—" : total.toLocaleString("fr-FR")}</span>inscriptions</p>
              <div role="group" aria-label="Période des inscriptions" className="inline-flex gap-1 rounded-xl bg-gray-100 p-1">
                {periods.map(({ value, label }) => (
                  <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#306900] ${period === value ? "bg-[#65D900] text-black shadow-sm" : "text-gray-500 hover:bg-white hover:text-black"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-3 pt-6 sm:p-6">
            <div className="relative h-[300px] min-w-0 sm:h-[340px]" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Évolution des inscriptions : ${total} inscriptions sur ${periods.find(item => item.value === period)?.label}.` : undefined}>
              {loading ? <div aria-hidden="true" className="h-full animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" /> : error ? <p className="flex h-full items-center justify-center text-sm text-gray-500">Graphique indisponible.</p> : <>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={data} margin={{ top: 12, right: 14, left: -24, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickMargin={12} minTickGap={22} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Inscriptions"]} cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="count" name="Inscriptions" stroke="#65D900" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#65D900", stroke: "#fff", strokeWidth: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              {total === 0 && <p className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-sm text-gray-500">Aucune inscription sur cette période.</p>}
              </>}
            </div>
          </div>
        </section>

        <section aria-labelledby="gender-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="gender-title" className="text-lg font-bold">Répartition par sexe</h2>
              <p className="mt-1 text-sm text-gray-500">Ensemble des clients au sexe renseigné.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Users size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="relative h-[250px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Répartition par sexe : ${genderData.map(item => `${item.name} ${item.value}`).join(", ")}.` : undefined}>
              {loading ? <div aria-hidden="true" className="mx-auto h-[230px] w-[230px] animate-pulse rounded-full border-[28px] border-gray-100 motion-reduce:animate-none" /> : error || genderTotal === 0 ? <p className="flex h-full items-center justify-center text-center text-sm text-gray-500">{error ? "Graphique indisponible." : "Aucune donnée de répartition disponible."}</p> : <>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart accessibilityLayer>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="68%" outerRadius="88%" paddingAngle={4} cornerRadius={5} stroke="none" isAnimationActive={false}>
                    {genderData.map(item => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} clients`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">{genderTotal.toLocaleString("fr-FR")}</span>
                <span className="mt-1 text-xs text-gray-500">Clients</span>
              </div>
              </>}
            </div>
            <ul className="mt-3 space-y-3" aria-label="Légende de la répartition par sexe">
              {loading && ["Hommes", "Femmes"].map(name => (
                <li key={name} aria-hidden="true" className="h-11 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />
              ))}
              {genderData.map(item => (
                <li key={item.name} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="flex items-center gap-3 text-gray-600"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                  <span className="font-semibold tabular-nums">{item.value.toLocaleString("fr-FR")} <span className="text-gray-500">({genderTotal ? (item.value / genderTotal * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "0"} %)</span></span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
