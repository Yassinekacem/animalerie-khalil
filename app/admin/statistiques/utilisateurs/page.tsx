"use client";

import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const periods = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "12m", label: "12 mois" },
] as const;
type Period = (typeof periods)[number]["value"];

// Séries de démonstration indépendantes de la base de données.
const registrations: Record<Period, { label: string; count: number }[]> = {
  "7d": [8, 12, 9, 17, 14, 22, 19].map((count, index) => ({ label: `J${index + 1}`, count })),
  "30d": [5, 9, 7, 12, 8, 14, 10, 16, 13, 11, 18, 15, 20, 14, 19, 22, 17, 24, 21, 18, 26, 23, 29, 25, 22, 30, 27, 33, 28, 35]
    .map((count, index) => ({ label: `J${index + 1}`, count })),
  "12m": ["Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."]
    .map((label, index) => ({ label, count: [84, 112, 98, 145, 172, 158, 204, 192, 238, 265, 249, 312][index] })),
};
const genderData = [
  { name: "Hommes", value: 44, color: "#65D900" },
  { name: "Femmes", value: 56, color: "#010101" },
];
const tooltipStyle = {
  borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 6%)",
};

export default function UserStatisticsPage() {
  const [period, setPeriod] = useState<Period>("12m");
  const data = registrations[period];
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques utilisateurs</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Suivez les inscriptions et découvrez la répartition de votre clientèle.</p>
        <span className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">Aperçu avec données fictives</span>
      </header>

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
              <p className="text-sm text-gray-500"><span className="mr-2 text-2xl font-bold tabular-nums text-[#010101]">{total.toLocaleString("fr-FR")}</span>inscriptions</p>
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
            <div className="h-[300px] min-w-0 sm:h-[340px]" role="img" aria-label={`Évolution des inscriptions : ${total} inscriptions sur ${periods.find(item => item.value === period)?.label}.`}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={data} margin={{ top: 12, right: 14, left: -24, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 11 }} tickMargin={12} minTickGap={22} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Inscriptions"]} cursor={{ stroke: "#d1d5db", strokeDasharray: "4 4" }} />
                  <Line type="monotone" dataKey="count" name="Inscriptions" stroke="#65D900" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: "#65D900", stroke: "#fff", strokeWidth: 3 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section aria-labelledby="gender-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="gender-title" className="text-lg font-bold">Répartition par sexe</h2>
              <p className="mt-1 text-sm text-gray-500">Ensemble des utilisateurs.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Users size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-5 sm:p-6">
            <div className="relative h-[250px] min-w-0" role="img" aria-label="Répartition fictive : Hommes 44 %, Femmes 56 %.">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart accessibilityLayer>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="68%" outerRadius="88%" paddingAngle={4} cornerRadius={5} stroke="none" isAnimationActive={false}>
                    {genderData.map(item => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`${value} %`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums">100 %</span>
                <span className="mt-1 text-xs text-gray-500">Utilisateurs</span>
              </div>
            </div>
            <ul className="mt-3 space-y-3" aria-label="Légende de la répartition par sexe">
              {genderData.map(item => (
                <li key={item.name} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-3 text-sm">
                  <span className="flex items-center gap-3 text-gray-600"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                  <span className="font-semibold tabular-nums">{item.value} %</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
