"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bird, Cat, ChevronDown, Clock3, Dog, Fish, Leaf, PawPrint } from "lucide-react";
import { useBlogs, type BlogArticle } from "@/lib/blogs";

const filters = [
  { value: "", label: "Tous", Icon: PawPrint },
  { value: "chien", label: "Chiens", Icon: Dog },
  { value: "chat", label: "Chats", Icon: Cat },
  { value: "oiseaux", label: "Oiseaux", Icon: Bird },
  { value: "poissons", label: "Poissons", Icon: Fish },
] as const;

const dateFormat = new Intl.DateTimeFormat("fr-TN", { dateStyle: "long", timeZone: "Africa/Tunis" });
const gridClass = "grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3";
const cardClass = "overflow-hidden rounded-2xl border border-gray-200/70 bg-white";
const buttonClass = "rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-[#65D900] focus-visible:outline-2 disabled:opacity-50";

function describe(content: string) {
  const text = content.replace(/\s+/gu, " ").trim();
  const characters = Array.from(text);
  if (characters.length <= 160) return text;
  const start = characters.slice(0, 160).join("");
  const lastSpace = start.lastIndexOf(" ");
  return (lastSpace > 100 ? start.slice(0, lastSpace) : start) + "…";
}

function BlogImage({ article }: { article: BlogArticle }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      src={failed ? "/logo-animalerie.png" : article.image}
      alt=""
      fill
      sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 400px"
      unoptimized
      onError={() => setFailed(true)}
      className={failed ? "bg-[#EDF2E8] object-contain p-12" : "object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transition-none"}
    />
  );
}

function Reading({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reducedMotion = useReducedMotion();
  return (
    <div className="mt-5 border-t border-gray-100 pt-4">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left text-sm font-bold text-[#357800] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900]">
        {open ? "Refermer l’article" : "Prendre le temps de lire"}
        <ChevronDown size={18} aria-hidden="true" className={"shrink-0 transition-transform duration-300 motion-reduce:transition-none " + (open ? "rotate-180" : "")} />
      </button>
      <div id={id}>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.25 }} className="overflow-hidden">
              <p className="whitespace-pre-wrap break-words pt-6 text-sm leading-7 text-gray-600">{content}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: BlogArticle }) {
  const minutes = Math.max(1, Math.ceil(article.content.trim().split(/\s+/u).length / 200));
  return (
    <article className={cardClass + " group transition-shadow duration-300 hover:shadow-xl hover:shadow-black/5 motion-reduce:transition-none"}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <BlogImage key={article.image} article={article} />
        <span className="absolute bottom-4 left-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-bold text-gray-800 shadow-sm backdrop-blur-sm">
          {filters.find(filter => filter.value === article.category)?.label}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="break-words text-xl font-bold leading-7 tracking-tight">{article.title}</h2>
        <p className="mb-5 mt-3 break-words text-sm leading-7 text-gray-500">{describe(article.content)}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <time dateTime={article.createdAt}>{dateFormat.format(new Date(article.createdAt))}</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{minutes} min de lecture</span>
        </div>
        <Reading content={article.content} />
      </div>
    </article>
  );
}

export default function KhalilAstucesPage() {
  const [category, setCategory] = useState<(typeof filters)[number]["value"]>("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useBlogs(category, page);

  return (
    <div className="overflow-hidden bg-[#F7F8F6] text-[#111111]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:py-16 lg:px-8">
        <section id="articles" aria-labelledby="articles-title" className="scroll-mt-40 pt-14 sm:pt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[#438F00]">À chaque compagnon, son univers</p>
              <h1 id="articles-title" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Un peu de lecture,<br className="sm:hidden" /> beaucoup d’idées<span className="text-[#65D900]">.</span>
              </h1>
            </div>
            <p role="status" className="text-xs font-medium text-gray-500">
              {loading ? "Chargement des articles…" : data ? data.total + (data.total === 1 ? " article à découvrir" : " articles à découvrir") : ""}
            </p>
          </div>
          <div role="group" aria-label="Filtrer les articles par animal" className="mb-8 mt-7 flex flex-wrap gap-2 sm:gap-3">
            {filters.map(({ value, label, Icon }) => (
              <button key={label} type="button" aria-pressed={category === value} aria-controls="articles-grid"
                onClick={() => { setCategory(value); setPage(1); }}
                className={"inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#65D900] sm:px-5 " +
                  (category === value ? "border-[#010101] bg-[#010101] text-[#65D900]" : "border-gray-200 bg-white text-gray-500 hover:border-[#65D900] hover:text-gray-900")}>
                <Icon size={17} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
          <div id="articles-grid" aria-busy={loading} className={gridClass}>
            {loading ? Array.from({ length: 3 }, (_, index) => (
              <div key={index} aria-hidden="true" className={cardClass + " animate-pulse"}>
                <div className="aspect-[16/10] bg-gray-200" />
                <div className="space-y-4 p-6">
                  <div className="h-6 w-4/5 rounded bg-gray-200" />
                  <div className="h-4 w-full rounded bg-gray-100" />
                  <div className="h-4 w-2/3 rounded bg-gray-100" />
                </div>
              </div>
            )) : error ? (
              <div className={cardClass + " col-span-full p-8 text-center"}>
                <p role="alert" className="text-sm text-red-700">{error}</p>
                <button type="button" onClick={reload} className={buttonClass + " mt-4"}>Réessayer</button>
              </div>
            ) : data?.blogs.length ? data.blogs.map(article => <ArticleCard key={article.id} article={article} />) : (
              <p className={cardClass + " col-span-full p-8 text-center text-sm text-gray-600"}>
                {category ? "Aucun article pour cet animal pour le moment." : "Aucun article publié pour le moment."}
              </p>
            )}
          </div>
          {data && data.totalPages > 1 && (
            <nav aria-label="Pagination des articles" className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600">
              <button type="button" className={buttonClass} disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Précédent</button>
              <span>Page {data.page} sur {data.totalPages}</span>
              <button type="button" className={buttonClass} disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>Suivant</button>
            </nav>
          )}
        </section>

        <aside className="relative mt-14 overflow-hidden rounded-3xl bg-[#EAF2E2] px-6 py-8 text-center sm:mt-20 sm:px-12 sm:py-12">
          <PawPrint aria-hidden="true" className="pointer-events-none absolute -bottom-4 -right-3 h-32 w-32 -rotate-12 text-[#65D900]/15" />
          <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-[#438F00]"><Leaf size={23} aria-hidden="true" /></span>
          <h2 className="relative mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">La meilleure astuce ? Prendre du temps ensemble.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">Chaque compagnon a sa personnalité. Observez, partagez et savourez les petits moments : ce sont eux qui font les plus belles histoires.</p>
        </aside>
      </div>
    </div>
  );
}
