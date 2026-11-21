"use client";

import { useEffect, useState } from "react";
import { ChartColumn, Layers, PackageCheck, Star } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { availabilityOptions, type Animal, type ProductAvailability } from "@/lib/catalogue";

const animalOptions: { value: Animal; label: string }[] = [
  { value: "chien", label: "Chiens" },
  { value: "chat", label: "Chats" },
  { value: "oiseaux", label: "Oiseaux" },
  { value: "poissons", label: "Poissons" },
];

type Statistics = {
  produitsParAnimal: { name: string; count: number }[];
  repartitionCategories: Record<Animal, { name: string; count: number }[]>;
  topProduits: { id: number; name: string; rating: number; reviews: number }[];
  repartitionDisponibilite: { status: ProductAvailability; name: string; count: number; percentage: number }[];
};

const availabilityColors: Record<ProductAvailability, string> = {
  DISPONIBLE: "#65D900", EN_ARRIVAGE: "#f59e0b", RUPTURE_STOCK: "#ef4444",
};
const formatPercentage = (percentage: number) => `${percentage.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

const tooltipStyle = {
  borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13,
  boxShadow: "0 4px 16px rgb(0 0 0 / 6%)",
};
const axisTick = { fill: "#6b7280", fontSize: 11 };
const formatRating = (rating: number) => rating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function ChartPlaceholder({ loading, message }: { loading: boolean; message: string }) {
  return loading ? <div aria-hidden="true" className="h-full animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" /> :
    <p className="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500">{message}</p>;
}

export default function ProductStatisticsPage() {
  const [animal, setAnimal] = useState<Animal>("chien");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; data: Statistics | null; error: string }>({ key: -1, data: null, error: "" });
  const loading = result.key !== retry;
  const statistics = loading ? null : result.data;
  const error = loading ? "" : result.error;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/admin/statistiques/produits", { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Impossible de charger les statistiques produits.");
        if (!Array.isArray(payload.repartitionDisponibilite) || payload.repartitionDisponibilite.length !== 3 ||
          !payload.repartitionDisponibilite.every((item: Statistics["repartitionDisponibilite"][number]) => item &&
            Object.hasOwn(availabilityOptions, item.status) && Number.isSafeInteger(item.count) && item.count >= 0 &&
            Number.isFinite(item.percentage) && item.percentage >= 0 && item.percentage <= 100) ||
          new Set(payload.repartitionDisponibilite.map((item: Statistics["repartitionDisponibilite"][number]) => item.status)).size !== 3) {
          throw new Error("La réponse des disponibilités est incorrecte.");
        }
        if (!controller.signal.aborted) setResult({ key: retry, data: payload, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key: retry, data: null, error: error instanceof TypeError ?
          "Impossible de contacter le serveur." : error instanceof Error ? error.message : "Impossible de charger les statistiques produits." });
      }
    })();
    return () => controller.abort();
  }, [retry]);

  const animalData = statistics?.produitsParAnimal ?? [];
  const categoryData = statistics?.repartitionCategories[animal] ?? [];
  const ratedProducts = (statistics?.topProduits ?? []).map((product, index) => ({ ...product, rank: `#${index + 1}` }));
  const animalLabel = animalOptions.find(option => option.value === animal)!.label;
  const totalProducts = animalData.reduce((sum, item) => sum + item.count, 0);
  const categoryTotal = categoryData.reduce((sum, item) => sum + item.count, 0);
  const availabilityData = (statistics?.repartitionDisponibilite ?? []).map(item => ({ ...item, color: availabilityColors[item.status] }));
  const availabilityTotal = availabilityData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Statistiques produits</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">Analysez la répartition et les évaluations de vos produits.</p>
        <span className="mt-3 inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500">Données réelles des produits</span>
      </header>

      {loading && <p role="status" className="sr-only">Chargement des statistiques produits…</p>}
      {error && <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded font-semibold underline focus-visible:outline-2">Réessayer</button>
      </div>}

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <section aria-labelledby="animals-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
            <div>
              <h2 id="animals-title" className="text-lg font-bold">Produits par animal cible</h2>
              <p className="mt-1 text-sm text-gray-500">{loading ? <span aria-hidden="true" className="inline-block h-4 w-8 animate-pulse rounded bg-gray-100 align-middle motion-reduce:animate-none" /> : error ? "—" : totalProducts.toLocaleString("fr-FR")} produits répartis entre quatre univers.</p>
            </div>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><ChartColumn size={20} aria-hidden="true" /></span>
          </div>
          <div className="p-3 pt-6 sm:p-6">
            <div className="h-[340px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Nombre de produits par animal : ${animalData.map(item => `${item.name} ${item.count}`).join(", ")}.` : undefined}>
              {loading || error || totalProducts === 0 ? <ChartPlaceholder loading={loading} message={error ? "Graphique indisponible." : "Aucun produit disponible."} /> :
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={animalData} margin={{ top: 24, right: 12, left: -24, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} tickMargin={12} interval={0} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Produits"]} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="count" name="Produits" fill="#65D900" radius={[7, 7, 0, 0]} maxBarSize={52} isAnimationActive={false}>
                    <LabelList dataKey="count" position="top" fill="#010101" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              }
            </div>
          </div>
        </section>

        <section aria-labelledby="categories-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="categories-title" className="text-lg font-bold">Répartition par catégorie</h2>
                <p className="mt-1 text-sm text-gray-500">Explorez les catégories de chaque animal cible.</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Layers size={20} aria-hidden="true" /></span>
            </div>
            <div role="group" aria-label="Animal cible" className="flex flex-wrap gap-1 rounded-xl bg-gray-100 p-1">
              {animalOptions.map(option => (
                <button key={option.value} type="button" aria-pressed={animal === option.value} onClick={() => setAnimal(option.value)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#306900] ${animal === option.value ? "bg-[#65D900] text-black shadow-sm" : "text-gray-500 hover:bg-white hover:text-black"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 pt-6 sm:p-6">
            <p role="status" className="sr-only">Catégories : {animalLabel}.</p>
            <div className="h-[340px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `${animalLabel}, produits par catégorie : ${categoryData.map(item => `${item.name} ${item.count}`).join(", ")}.` : undefined}>
              {loading || error || categoryTotal === 0 ? <ChartPlaceholder loading={loading} message={error ? "Graphique indisponible." : `Aucun produit pour les ${animalLabel.toLocaleLowerCase("fr-FR")}.`} /> :
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 28, left: 0, bottom: 4 }} accessibilityLayer>
                  <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} />
                  <YAxis type="category" dataKey="name" width={150} axisLine={false} tickLine={false} tick={axisTick} interval={0} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => [value, "Produits"]} cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="count" name="Produits" fill="#65D900" radius={[0, 6, 6, 0]} maxBarSize={24} isAnimationActive={false}>
                    <LabelList dataKey="count" position="right" fill="#010101" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              }
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="availability-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
          <div><h2 id="availability-title" className="text-lg font-bold">Répartition par disponibilité</h2><p className="mt-1 text-sm text-gray-500">Tous les produits du catalogue, tous animaux confondus.</p></div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><PackageCheck size={20} aria-hidden="true" /></span>
        </div>
        <div className="grid min-w-0 items-center gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <div className="relative h-[300px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined}
            aria-label={statistics ? `Disponibilité des ${availabilityTotal} produits : ${availabilityData.map(item => `${item.name}, ${item.count} produits, ${formatPercentage(item.percentage)}`).join(" ; ")}.` : undefined}>
            {loading || error || availabilityTotal === 0 ? <ChartPlaceholder loading={loading} message={error ? "Graphique indisponible." : "Aucun produit dans le catalogue."} /> : <>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart accessibilityLayer>
                  <Pie data={availabilityData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius="65%" outerRadius="88%" paddingAngle={3} cornerRadius={5} stroke="none" isAnimationActive={false}>
                    {availabilityData.map(item => <Cell key={item.status} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name, item) => [`${value} produits · ${formatPercentage(item.payload.percentage)}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold tabular-nums">{availabilityTotal.toLocaleString("fr-FR")}</span><span className="mt-1 text-xs text-gray-500">Produits</span></div>
            </>}
          </div>
          <ul aria-label="Légende des disponibilités" className="space-y-3">
            {loading && [1, 2, 3].map(index => <li key={index} aria-hidden="true" className="h-16 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
            {availabilityData.map(item => <li key={item.status} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-4 text-sm">
              <span className="flex items-center gap-3 text-gray-600"><span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
              <span className="font-semibold tabular-nums">{item.count.toLocaleString("fr-FR")} produit{item.count > 1 ? "s" : ""}<span className="ml-3 font-normal text-gray-500">{formatPercentage(item.percentage)}</span></span>
            </li>)}
          </ul>
        </div>
      </section>

      <section aria-labelledby="ratings-title" className="min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5 sm:p-6">
          <div>
            <h2 id="ratings-title" className="text-lg font-bold">Top 5 des produits les mieux notés</h2>
            <p className="mt-1 text-sm text-gray-500">Classés par note moyenne, puis par nombre d’avis en cas d’égalité.</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]"><Star size={20} aria-hidden="true" /></span>
        </div>
        <div className="grid min-w-0 gap-6 p-3 pt-6 sm:p-6 lg:grid-cols-2 lg:items-center">
          <div className="h-[320px] min-w-0" aria-busy={loading} role={statistics ? "img" : undefined} aria-label={statistics ? `Notes moyennes sur 5 : ${ratedProducts.map(item => `${item.rank} ${item.name}, ${formatRating(item.rating)}, ${item.reviews} avis`).join(" ; ")}.` : undefined}>
            {loading || error || ratedProducts.length === 0 ? <ChartPlaceholder loading={loading} message={error ? "Graphique indisponible." : "Aucun produit évalué pour le moment."} /> :
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={ratedProducts} layout="vertical" margin={{ top: 4, right: 42, left: -16, bottom: 4 }} accessibilityLayer>
                <CartesianGrid stroke="#f0f1f2" strokeDasharray="4 4" horizontal={false} />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={axisTick} tickMargin={8} />
                <YAxis type="category" dataKey="rank" width={48} axisLine={false} tickLine={false} tick={{ fill: "#010101", fontSize: 12, fontWeight: 600 }} interval={0} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f9fafb" }}
                  labelFormatter={(_label, payload) => payload[0]?.payload.name ?? "Produit"}
                  formatter={(value, _name, item) => [`${formatRating(Number(value))} / 5 · ${item.payload.reviews} avis`, "Note moyenne"]} />
                <Bar dataKey="rating" name="Note moyenne" fill="#65D900" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive={false}>
                  <LabelList dataKey="rating" position="right" fill="#010101" fontSize={12} formatter={value => `${formatRating(Number(value))}/5`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            }
          </div>
          <ol className="min-w-0 space-y-3 px-2 pb-2 sm:px-0 sm:pb-0" aria-label="Classement des produits les mieux notés">
            {loading && [1, 2, 3, 4, 5].map(rank => <li key={rank} aria-hidden="true" className="h-[68px] animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />)}
            {ratedProducts.map(product => (
              <li key={product.id} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-600">{product.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{product.reviews} avis clients</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-sm font-bold tabular-nums"><Star size={14} className="fill-[#65D900] text-[#306900]" aria-hidden="true" />{formatRating(product.rating)}<span className="text-xs font-normal text-gray-500">/ 5</span></span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
