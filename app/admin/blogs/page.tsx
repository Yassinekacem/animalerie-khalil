"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Eye, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import CloudinaryUpload from "@/components/CloudinaryUpload";
import { useToast } from "@/components/ToastProvider";
import { animals, type Animal } from "@/lib/catalogue";
import { readBlogResponse, useBlogs, type BlogArticle } from "@/lib/blogs";

const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const secondary = buttonClass + " bg-gray-100 hover:bg-gray-200";
const primary = buttonClass + " bg-[#65D900] text-[#010101] hover:bg-[#55BD00]";
const iconButton = "rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2";
const dateFormat = new Intl.DateTimeFormat("fr-TN", { dateStyle: "medium", timeZone: "Africa/Tunis" });

type Dialog = { mode: "create" } | { mode: "view" | "edit" | "delete"; blog: BlogArticle };
type Draft = { title: string; category: Animal | ""; image: string; content: string };

function animalOptions() {
  return Object.entries(animals).map(([value, label]) => <option key={value} value={value}>{label}</option>);
}

function BlogDialog({ dialog, onClose, onSaved }: {
  dialog: Dialog;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const blog = dialog.mode === "create" ? null : dialog.blog;
  const { mode } = dialog;
  const hasForm = mode === "create" || mode === "edit";
  const [draft, setDraft] = useState<Draft>(() => ({
    title: blog?.title ?? "",
    category: blog?.category ?? "",
    image: blog?.image ?? "",
    content: blog?.content ?? "",
  }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = saving || uploading;
  const heading = { create: "Ajouter un article", edit: "Modifier l’article", delete: "Supprimer l’article", view: "Consulter l’article" }[mode];

  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || mode === "view") return;
    if (hasForm && !draft.image) {
      setError("Ajoutez une image avant d’enregistrer.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = blog ? "/api/blogs?id=" + blog.id : "/api/blogs";
      const response = await fetch(url, {
        method: mode === "delete" ? "DELETE" : mode === "edit" ? "PUT" : "POST",
        ...(hasForm && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) }),
      });
      await readBlogResponse(response);
      onSaved(mode === "delete" ? "Article supprimé." : mode === "edit" ? "Article modifié." : "Article publié.");
    } catch (error) {
      setError(error instanceof TypeError ? "Connexion au serveur impossible. Réessayez." : error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={ref} aria-labelledby="blog-dialog-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="blog-dialog-title" className="text-xl font-bold">{heading}</h2>
        <button type="button" className={iconButton} onClick={onClose} disabled={busy} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {mode === "view" && blog ? (
        <article className="space-y-4">
          <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-gray-100">
            <Image src={blog.image} alt="" fill sizes="(max-width: 700px) 100vw, 620px" unoptimized className="object-cover" />
          </div>
          <h3 className="break-words text-xl font-bold">{blog.title}</h3>
          <p className="text-sm text-gray-600">{animals[blog.category]} · Publié le <time dateTime={blog.createdAt}>{dateFormat.format(new Date(blog.createdAt))}</time></p>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">{blog.content}</p>
        </article>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {hasForm ? (
            <fieldset disabled={saving} inert={saving} className="space-y-4">
              <label className="block text-sm font-medium">
                Titre
                <input required maxLength={180} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} className={inputClass} />
              </label>
              <label className="block text-sm font-medium">
                Animal
                <select required value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Draft["category"] })} className={inputClass}>
                  <option value="">Sélectionner un animal</option>
                  {animalOptions()}
                </select>
              </label>
              <CloudinaryUpload label="Image de l’article" value={draft.image}
                onChange={image => setDraft(previous => ({ ...previous, image }))} onUploadingChange={setUploading} />
              <label className="block text-sm font-medium">
                Contenu
                <textarea required rows={9} maxLength={20000} value={draft.content}
                  onChange={event => setDraft({ ...draft, content: event.target.value })} className={inputClass} />
              </label>
            </fieldset>
          ) : (
            <p className="break-words text-sm leading-6 text-gray-700">Confirmez la suppression de l’article « {blog?.title} ».</p>
          )}
          {error && <p role="alert" className="whitespace-pre-line text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className={secondary} disabled={busy}>Annuler</button>
            <button type="submit" disabled={busy} className={mode === "delete" ? buttonClass + " bg-red-700 text-white hover:bg-red-800" : primary}>
              {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {mode === "delete" ? (saving ? "Suppression…" : "Supprimer") : saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default function BlogsAdminPage() {
  const [category, setCategory] = useState<Animal | "">("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const setNotice = useToast();
  const { data, loading, error, reload } = useBlogs(category, page, query);

  useEffect(() => {
    if (search.trim() === query) return;
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des blogs</h1>
        <button type="button" className={primary} onClick={() => setDialog({ mode: "create" })}>
          <Plus size={18} aria-hidden="true" /> Ajouter un article
        </button>
      </header>

      <section aria-label="Recherche et filtres" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="text-sm font-medium">
          Rechercher un article
          <span className="relative block">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-5 text-gray-400" />
            <input type="search" maxLength={200} value={search} onChange={event => setSearch(event.target.value)}
              placeholder="Titre ou contenu…" className={inputClass + " pl-10"} />
          </span>
        </label>
        <label className="text-sm font-medium">
          Animal
          <select value={category} onChange={event => { setCategory(event.target.value as Animal | ""); setPage(1); }} className={inputClass}>
            <option value="">Tous les animaux</option>
            {animalOptions()}
          </select>
        </label>
      </section>

      <section aria-labelledby="blog-list-title" aria-busy={loading} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 id="blog-list-title" className="font-bold">Liste des articles</h2>
          <p role="status" className="mt-1 text-sm text-gray-500">
            {loading ? "Chargement des articles…" : data ? data.total + (data.total === 1 ? " résultat" : " résultats") : "Articles indisponibles"}
          </p>
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Tableau des articles" tabIndex={0}>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>{["Article", "Animal", "Publication", "Actions"].map(label => (
                <th key={label} scope="col" className="px-5 py-4 font-semibold">{label}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? Array.from({ length: 5 }, (_, index) => (
                <tr key={index} aria-hidden="true" className="animate-pulse">
                  {[ "w-36", "w-16", "w-20", "w-24" ].map(width => (
                    <td key={width} className="px-5 py-5"><span className={"block h-4 rounded bg-gray-200 " + width} /></td>
                  ))}
                </tr>
              )) : error ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center">
                  <p role="alert" className="text-red-700">{error}</p>
                  <button type="button" onClick={reload} className={secondary + " mt-4"}>Réessayer</button>
                </td></tr>
              ) : data?.blogs.length ? data.blogs.map(blog => (
                <tr key={blog.id} className="hover:bg-gray-50">
                  <th scope="row" className="max-w-sm break-words px-5 py-4 font-semibold">{blog.title}</th>
                  <td className="px-5 py-4">{animals[blog.category]}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                    <time dateTime={blog.createdAt}>{dateFormat.format(new Date(blog.createdAt))}</time>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button type="button" title="Consulter" aria-label={"Consulter " + blog.title} className={iconButton} onClick={() => setDialog({ mode: "view", blog })}><Eye size={17} aria-hidden="true" /></button>
                      <button type="button" title="Modifier" aria-label={"Modifier " + blog.title} className={iconButton} onClick={() => setDialog({ mode: "edit", blog })}><Pencil size={17} aria-hidden="true" /></button>
                      <button type="button" title="Supprimer" aria-label={"Supprimer " + blog.title} className={iconButton + " text-red-700"} onClick={() => setDialog({ mode: "delete", blog })}><Trash2 size={17} aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-gray-500">
                  {category || query ? "Aucun article ne correspond à vos filtres." : "Aucun article publié pour le moment."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <nav aria-label="Pagination des blogs" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm">
            <p className="text-gray-500">Page {data.page} sur {data.totalPages} · {data.total} résultats</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={secondary} disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Précédent</button>
              <button type="button" className={secondary} disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>Suivant</button>
            </div>
          </nav>
        )}
      </section>

      {dialog && <BlogDialog dialog={dialog} onClose={() => setDialog(null)} onSaved={message => {
        setDialog(null);
        setNotice(message);
        reload();
      }} />}
    </div>
  );
}
