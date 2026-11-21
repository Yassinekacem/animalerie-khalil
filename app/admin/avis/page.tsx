"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search, Trash2, X } from "lucide-react";
import { Stars } from "@/components/ProductRating";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/components/AuthProvider";
import { accountRequest } from "@/components/AccountArea";

type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: number; name: string };
  user: { id: number; name: string };
};
type ReviewList = { reviews: Review[]; total: number; page: number; totalPages: number };
const initialQuery = { q: "", rating: "", comment: "", sort: "newest", page: 1 };
const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101]";
const dateLabel = (date: string) => new Intl.DateTimeFormat("fr-TN", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Tunis" }).format(new Date(date));
const errorMessage = (reason: unknown) => reason instanceof TypeError ? "Impossible de contacter le serveur." : reason instanceof Error ? reason.message : "Une erreur est survenue. Veuillez réessayer.";

function ReviewStars({ rating }: { rating: number }) {
  return <span className="inline-flex flex-wrap items-center gap-2" role="img" aria-label={`Note : ${rating} sur 5`}><Stars value={rating} size={14} /><span aria-hidden="true" className="text-xs font-semibold tabular-nums">{rating}/5</span></span>;
}

function ReviewSkeleton() {
  return <>{Array.from({ length: 6 }, (_, row) => <tr key={row} aria-hidden="true">{Array.from({ length: 6 }, (_, column) => <td key={column} className="px-5 py-5"><span className={`block h-4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none ${column === 1 ? "w-48" : "w-24"}`} /></td>)}</tr>)}</>;
}

export default function ReviewsPage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data: ReviewList | null; error: string }>({ key: "", data: null, error: "" });
  const [selected, setSelected] = useState<Review | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const sending = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const params = new URLSearchParams({ page: String(query.page), pageSize: "12", sort: query.sort });
  if (query.q) params.set("q", query.q);
  if (query.rating) params.set("rating", query.rating);
  if (query.comment) params.set("comment", query.comment);
  const url = `/api/reviews?${params}`;
  const key = `${url}:${revision}`;
  const loading = result.key !== key;
  const data = !loading ? result.data : null;

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(current => current.q === search.trim() ? current : { ...current, q: search.trim(), page: 1 }), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    void accountRequest<ReviewList>(url, { signal: controller.signal }, refresh).then(payload => {
      if (!Array.isArray(payload.reviews) || !Number.isSafeInteger(payload.total) || !Number.isSafeInteger(payload.page) || !Number.isSafeInteger(payload.totalPages)) throw new Error("La réponse des avis est incorrecte.");
      if (!controller.signal.aborted) setResult({ key, data: payload, error: "" });
    }).catch(reason => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: errorMessage(reason) });
    });
    return () => controller.abort();
  }, [url, key, refresh]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selected) dialog?.showModal();
    else dialog?.close();
    return () => dialog?.close();
  }, [selected]);

  function closeDialog() {
    if (sending.current) return;
    setSelected(null);
    setDeleteError("");
  }

  async function deleteReview() {
    if (!selected || sending.current) return;
    sending.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/reviews/${selected.id}`, { method: "DELETE", cache: "no-store" });
      if (response.status === 401) void refresh();
      const payload = await response.json().catch(() => null);
      if (!response.ok && response.status !== 404) throw new Error(typeof payload?.error === "string" ? payload.error : "Impossible de supprimer cet avis.");
      toast(response.status === 404 ? "Cet avis a déjà été supprimé. La liste a été actualisée." : "L’avis a été supprimé.");
      setSelected(null);
      setRevision(value => value + 1);
    } catch (reason) {
      setDeleteError(errorMessage(reason));
    } finally {
      sending.current = false;
      setDeleting(false);
    }
  }

  return <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des avis</h1><p className="mt-3 text-sm text-gray-600">Consultez les avis produits et modérez les commentaires de votre boutique.</p></div>
      <div className="flex items-center gap-3 self-start rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm"><MessageSquare size={24} className="text-[#306900]" aria-hidden="true" /><div><p className="text-2xl font-bold tabular-nums">{data?.total ?? "—"}</p><p className="text-xs text-gray-500">Avis correspondant aux filtres</p></div></div>
    </header>

    <section aria-label="Recherche et filtres des avis" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
      <label className="text-sm font-medium">Rechercher un avis<span className="relative block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-5 text-gray-400" /><input type="search" value={search} maxLength={200} onChange={event => setSearch(event.target.value)} placeholder="Produit, auteur ou commentaire…" className={`${inputClass} pl-10`} /></span></label>
      <label className="text-sm font-medium">Note<select value={query.rating} onChange={event => setQuery(current => ({ ...current, rating: event.target.value, page: 1 }))} className={inputClass}><option value="">Toutes les notes</option>{[5, 4, 3, 2, 1].map(rating => <option key={rating} value={rating}>{rating} / 5</option>)}</select></label>
      <label className="text-sm font-medium">Commentaire<select value={query.comment} onChange={event => setQuery(current => ({ ...current, comment: event.target.value, page: 1 }))} className={inputClass}><option value="">Tous les avis</option><option value="with">Avec commentaire</option><option value="without">Sans commentaire</option></select></label>
      <label className="text-sm font-medium">Trier par<select value={query.sort} onChange={event => setQuery(current => ({ ...current, sort: event.target.value, page: 1 }))} className={inputClass}><option value="newest">Plus récents</option><option value="oldest">Plus anciens</option></select></label>
      <div className="flex flex-wrap gap-4 md:col-span-2 xl:col-span-4"><button type="button" onClick={() => { setSearch(""); setQuery(initialQuery); }} className="rounded text-xs font-semibold text-[#306900] underline underline-offset-4 focus-visible:outline-2">Réinitialiser les filtres</button><button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="rounded text-xs font-semibold text-gray-600 underline underline-offset-4 focus-visible:outline-2 disabled:opacity-50">Actualiser</button></div>
    </section>

    <section aria-labelledby="reviews-title" aria-busy={loading} className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5"><h2 id="reviews-title" className="font-bold">Liste des avis</h2><p aria-live="polite" role={loading ? "status" : undefined} className="mt-1 text-sm text-gray-500">{loading ? "Chargement des avis…" : data ? `${data.total} résultat${data.total > 1 ? "s" : ""}` : "Liste indisponible"}</p></div>
      <div className="overflow-x-auto" role="region" aria-label="Tableau des avis défilant horizontalement" tabIndex={0}>
        <table className="w-full min-w-[1000px] text-left text-sm">
          <caption className="sr-only">Avis produits, notes, auteurs et actions de modération</caption>
          <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Note", "Commentaire", "Produit", "Auteur", "Date", "Actions"].map(label => <th key={label} scope="col" className="px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <ReviewSkeleton /> : result.error ? <tr><td colSpan={6} className="px-5 py-12 text-center"><p role="alert" className="text-red-700">{result.error}</p><button type="button" onClick={() => setRevision(value => value + 1)} className={`${buttonClass} mt-3 bg-gray-100`}>Réessayer</button></td></tr> : data?.reviews.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-500">Aucun avis ne correspond à vos filtres.</td></tr> : data?.reviews.map(review => <tr key={review.id} className="align-top hover:bg-gray-50">
              <td className="px-5 py-4"><ReviewStars rating={review.rating} /></td>
              <th scope="row" className="max-w-md whitespace-pre-wrap break-words px-5 py-4 font-normal [overflow-wrap:anywhere]">{review.comment || <span className="italic text-gray-400">Sans commentaire</span>}</th>
              <td className="max-w-52 break-words px-5 py-4 [overflow-wrap:anywhere]"><Link href={`/boutique/${review.product.id}`} target="_blank" rel="noopener noreferrer" className="rounded font-medium text-[#306900] underline-offset-4 hover:underline focus-visible:outline-2">{review.product.name}<span className="sr-only"> (nouvel onglet)</span></Link></td>
              <td className="max-w-40 break-words px-5 py-4 [overflow-wrap:anywhere]">{review.user.name}</td>
              <td className="whitespace-nowrap px-5 py-4 text-xs leading-6 text-gray-500"><time dateTime={review.createdAt}>{dateLabel(review.createdAt)}</time>{review.updatedAt !== review.createdAt && <span className="block">Modifié le {dateLabel(review.updatedAt)}</span>}</td>
              <td className="px-5 py-4"><button type="button" onClick={() => { setDeleteError(""); setSelected(review); }} aria-label={`Supprimer l’avis de ${review.user.name} sur ${review.product.name}`} title="Supprimer l’avis" className="rounded-lg p-2.5 text-red-700 hover:bg-red-50 focus-visible:outline-2"><Trash2 size={18} aria-hidden="true" /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 0 && <nav aria-label="Pagination des avis" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm"><span>Page {data.page} sur {data.totalPages} · {data.total} résultats</span><div className="flex gap-2"><button type="button" disabled={data.page <= 1} onClick={() => setQuery(current => ({ ...current, page: data.page - 1 }))} className={`${buttonClass} bg-gray-100`}>Précédent</button><button type="button" disabled={data.page >= data.totalPages} onClick={() => setQuery(current => ({ ...current, page: data.page + 1 }))} className={`${buttonClass} bg-gray-100`}>Suivant</button></div></nav>}
    </section>

    <dialog ref={dialogRef} aria-labelledby="delete-review-title" onCancel={event => { event.preventDefault(); closeDialog(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6">
      {selected && <><div className="mb-5 flex items-center justify-between gap-3"><h2 id="delete-review-title" className="text-xl font-bold">Supprimer cet avis ?</h2><button type="button" disabled={deleting} onClick={closeDialog} aria-label="Fermer la confirmation" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 disabled:opacity-50"><X size={20} aria-hidden="true" /></button></div>
        <p className="text-sm leading-6 text-gray-600">Cette suppression est définitive. La note moyenne du produit tiendra compte des avis restants.</p>
        <div className="mt-5 min-w-0 rounded-xl bg-gray-50 p-4 text-sm"><p className="break-words font-semibold [overflow-wrap:anywhere]">{selected.product.name}</p><p className="mt-1 break-words text-gray-500 [overflow-wrap:anywhere]">{selected.user.name} · {dateLabel(selected.createdAt)}</p><div className="mt-3"><ReviewStars rating={selected.rating} /></div><p className="mt-3 whitespace-pre-wrap break-words leading-6 text-gray-600 [overflow-wrap:anywhere]">{selected.comment || "Sans commentaire"}</p></div>
        {deleteError && <p role="alert" className="mt-4 text-sm text-red-700">{deleteError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" autoFocus disabled={deleting} onClick={closeDialog} className={`${buttonClass} bg-gray-100`}>Annuler</button><button type="button" disabled={deleting} onClick={() => void deleteReview()} className={`${buttonClass} bg-red-600 text-white hover:bg-red-700`}><Trash2 size={16} aria-hidden="true" />{deleting ? "Suppression…" : "Confirmer la suppression"}</button></div>
      </>}
    </dialog>
  </div>;
}
