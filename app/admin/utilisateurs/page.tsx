"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Eye, Pencil, Search, ShieldCheck, UserCheck, UserRound, UserX, Users, X } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  sexe: "" | "HOMME" | "FEMME";
  image: string;
  role: "ADMIN" | "CLIENT";
  isActif: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiUser = Omit<User, "phone" | "sexe" | "image"> & { phone: string | null; sexe: "HOMME" | "FEMME" | null; image: string | null };
type UserList = { users: ApiUser[]; total: number; page: number; totalPages: number };
const normalizeUser = (user: ApiUser): User => ({ ...user, phone: user.phone ?? "", sexe: user.sexe ?? "", image: user.image ?? "" });
const dateLabel = (value: string) => new Date(value).toLocaleString("fr-TN", { timeZone: "Africa/Tunis" });
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) {
    const issues = Array.isArray(data.issues) ? data.issues.map((issue: { message: string }) => issue.message) : [];
    throw new ApiError([data.error || "La requête a échoué.", ...issues].join("\n"), response.status);
  }
  return data;
}
const errorMessage = (error: unknown) => error instanceof TypeError ? "Impossible de contacter le serveur." :
  error instanceof SyntaxError ? "Réponse du serveur incorrecte." : error instanceof Error ? error.message : "Une erreur est survenue.";

const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101]";

function Avatar({ user }: { user: User }) {
  const [failed, setFailed] = useState(false);
  const valid = /^\/(?!\/)/.test(user.image) || /^https?:\/\//i.test(user.image) || /^data:image\/(png|jpeg|webp);base64,/.test(user.image);
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#010101] text-sm font-bold text-[#65D900]">
      {valid && !failed ? (
        // Profile images can be URLs or uploaded data URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt={`Portrait de ${user.name}`} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
    </span>
  );
}

function Modal({ title, onClose, children, busy }: { title: string; onClose: () => void; children: ReactNode; busy: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog ref={ref} aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="modal-title" className="text-xl font-bold">{title}</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Fermer la fenêtre" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2"><X size={20} aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}

export default function UsersPage() {
  const { user: signedInUser, refresh } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({ q: "", role: "", status: "", page: 1 });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; data: UserList | null; error: string }>({ key: "", data: null, error: "" });
  const [mode, setMode] = useState<"details" | "edit" | "confirm" | null>(null);
  const [draft, setDraft] = useState<User | null>(null);
  const [original, setOriginal] = useState<User | null>(null);
  const [fromEdit, setFromEdit] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailFailed, setDetailFailed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageReading, setImageReading] = useState(false);
  const sending = useRef(false);
  const detailController = useRef<AbortController | null>(null);
  const params = new URLSearchParams({ page: String(query.page), pageSize: "20" });
  if (query.q) params.set("q", query.q);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  const url = `/api/users?${params}`;
  const key = `${url}:${revision}`;
  const loading = result.key !== key;
  const data = !loading ? result.data : null;
  const role = query.role;
  const status = query.status;

  useEffect(() => {
    const timer = setTimeout(() => setQuery(current => current.q === search.trim() ? current : { ...current, q: search.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    void apiRequest<UserList>(url, { signal: controller.signal }).then(payload => {
      if (!controller.signal.aborted) setResult({ key, data: payload, error: "" });
    }).catch(reason => {
      if (!controller.signal.aborted) setResult({ key, data: null, error: errorMessage(reason) });
    });
    return () => controller.abort();
  }, [url, key]);
  useEffect(() => () => detailController.current?.abort(), []);

  function close() {
    if (sending.current || imageReading) return;
    detailController.current?.abort();
    setMode(null);
  }
  async function open(user: User, nextMode: "details" | "edit" | "confirm") {
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDraft(user); setMode(nextMode); setFromEdit(false); setError(""); setConflict(false);
    setDetailLoading(true); setDetailFailed(false);
    try {
      const current = normalizeUser(await apiRequest<ApiUser>(`/api/users/${user.id}`, { signal: controller.signal }));
      if (!controller.signal.aborted) {
        setOriginal(current);
        setDraft(nextMode === "confirm" ? { ...current, isActif: !current.isActif } : current);
      }
    } catch (reason) {
      if (!controller.signal.aborted) { setDetailFailed(true); setError(errorMessage(reason)); }
    } finally { if (!controller.signal.aborted) setDetailLoading(false); }
  }

  async function save(user: User) {
    if (sending.current || imageReading) return;
    sending.current = true; setSaving(true); setError(""); setConflict(false);
    try {
      const updated = await apiRequest<ApiUser>(`/api/users/${user.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name.trim(), email: user.email.trim(), phone: user.phone.trim() || null,
          sexe: user.sexe || null, image: user.image || null, role: user.role, isActif: user.isActif, updatedAt: user.updatedAt }),
      });
      setNotice(`Les informations de ${updated.name} ont été mises à jour.`);
      setMode(null); setRevision(value => value + 1);
      if (updated.id === signedInUser?.id) await refresh();
    } catch (reason) {
      setError(errorMessage(reason)); setConflict(reason instanceof ApiError && reason.status === 409);
    } finally { sending.current = false; setSaving(false); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || imageReading) return;
    if (!draft.name.trim()) { setError("Veuillez saisir un nom."); return; }
    if (original?.isActif !== draft.isActif) { setFromEdit(true); setMode("confirm"); }
    else void save(draft);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des utilisateurs</h1>
          <p className="mt-3 text-sm text-gray-600">Consultez les profils et gérez les accès à votre boutique.</p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <Users size={24} className="text-[#306900]" aria-hidden="true" />
          <div><p className="text-2xl font-bold">{data?.total ?? "—"}</p><p className="text-xs text-gray-500">Utilisateurs correspondant aux filtres</p></div>
        </div>
      </header>
      {notice && <p role="status" className="text-sm text-[#306900]">{notice}</p>}

      <section aria-label="Recherche et filtres" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[2fr_1fr_1fr]">
        <label className="text-sm font-medium">Rechercher un utilisateur
          <span className="relative block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-5 text-gray-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={200} placeholder="Nom ou email…" className={`${inputClass} pl-10`} />
          </span>
        </label>
        <label className="text-sm font-medium">Rôle
          <select value={role} onChange={(event) => setQuery(current => ({ ...current, role: event.target.value, page: 1 }))} className={inputClass}><option value="">Tous les rôles</option><option value="ADMIN">ADMIN</option><option value="CLIENT">CLIENT</option></select>
        </label>
        <label className="text-sm font-medium">Statut
          <select value={status} onChange={(event) => setQuery(current => ({ ...current, status: event.target.value, page: 1 }))} className={inputClass}><option value="">Tous les statuts</option><option value="active">Actif</option><option value="inactive">Désactivé</option></select>
        </label>
      </section>

      <section aria-labelledby="users-title" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5"><h2 id="users-title" className="font-bold">Liste des utilisateurs</h2><p aria-live="polite" className="mt-1 text-sm text-gray-500">{loading ? "Chargement…" : data ? `${data.total} résultat${data.total > 1 ? "s" : ""}` : "Liste indisponible"}</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <caption className="sr-only">Utilisateurs et actions de gestion</caption>
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Profil", "Nom", "Email", "Téléphone", "Rôle", "Statut", "Actions"].map((label) => <th scope="col" key={label} className="px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading && <tr><td colSpan={7} role="status" className="px-5 py-12 text-center text-gray-500">Chargement des utilisateurs…</td></tr>}
              {!loading && result.error && <tr><td colSpan={7} className="px-5 py-12 text-center"><p role="alert" className="text-red-700">{result.error}</p><button type="button" onClick={() => setRevision(value => value + 1)} className={`${buttonClass} mt-3 bg-gray-100`}>Réessayer</button></td></tr>}
              {data?.users.map(normalizeUser).map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4"><Avatar key={user.image} user={user} /></td>
                  <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold">{user.name}</th>
                  <td className="px-5 py-4 text-gray-600">{user.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">{user.phone || "Non renseigné"}</td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold">{user.role === "ADMIN" ? <ShieldCheck size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}{user.role}</span></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-medium ${user.isActif ? "bg-[#65D900]/15 text-[#306900]" : "bg-gray-100 text-gray-600"}`}>{user.isActif ? "Actif" : "Désactivé"}</span></td>
                  <td className="px-5 py-4"><div className="flex gap-1">
                    <button onClick={() => open(user, "details")} aria-label={`Consulter les détails de ${user.name}`} title="Consulter les détails" className="rounded-lg p-2.5 hover:bg-gray-200 focus-visible:outline-2"><Eye size={18} aria-hidden="true" /></button>
                    <button onClick={() => open(user, "edit")} aria-label={`Modifier ${user.name}`} title="Modifier" className="rounded-lg p-2.5 hover:bg-[#65D900]/20 focus-visible:outline-2"><Pencil size={18} aria-hidden="true" /></button>
                    <button disabled={user.id === signedInUser?.id} onClick={() => open(user, "confirm")} aria-label={`${user.isActif ? "Désactiver" : "Activer"} ${user.name}`} title={user.isActif ? "Désactiver" : "Activer"} className={`rounded-lg p-2.5 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40 ${user.isActif ? "text-amber-700 hover:bg-amber-50" : "text-[#306900] hover:bg-[#65D900]/20"}`}>{user.isActif ? <UserX size={18} aria-hidden="true" /> : <UserCheck size={18} aria-hidden="true" />}</button>
                  </div></td>
                </tr>
              ))}
              {data?.users.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Aucun utilisateur ne correspond à vos filtres.</td></tr>}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 0 && <nav aria-label="Pagination des utilisateurs" className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm">
          <span>Page {data.page} sur {data.totalPages} · {data.total} résultats</span>
          <div className="flex gap-2">
            <button type="button" disabled={data.page <= 1} onClick={() => setQuery(current => ({ ...current, page: data.page - 1 }))} className={`${buttonClass} bg-gray-100`}>Précédent</button>
            <button type="button" disabled={data.page >= data.totalPages} onClick={() => setQuery(current => ({ ...current, page: data.page + 1 }))} className={`${buttonClass} bg-gray-100`}>Suivant</button>
          </div>
        </nav>}
      </section>

      {mode && draft && (
        <Modal busy={saving || imageReading} title={mode === "details" ? "Détails de l’utilisateur" : mode === "edit" ? "Modifier l’utilisateur" : `${draft.isActif ? "Activer" : "Désactiver"} l’utilisateur`} onClose={close}>
          {detailLoading && <p role="status" className="text-sm text-gray-500">Chargement du profil…</p>}
          {detailFailed && <div role="alert"><p className="text-sm text-red-700">{error}</p><button type="button" onClick={() => void open(draft, mode)} className={`${buttonClass} mt-3 bg-gray-100`}>Réessayer</button></div>}
          {conflict && <button type="button" disabled={saving} onClick={() => void open(draft, fromEdit ? "edit" : mode)} className={`${buttonClass} mb-4 bg-gray-100`}>Recharger le profil</button>}
          {!detailLoading && !detailFailed && mode === "details" && <>
            <div className="mb-6 flex items-center gap-3"><Avatar key={draft.image} user={draft} /><p className="font-semibold">{draft.name}</p></div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[["Nom", draft.name], ["Email", draft.email], ["Téléphone", draft.phone || "Non renseigné"], ["Sexe", draft.sexe === "HOMME" ? "Homme" : draft.sexe === "FEMME" ? "Femme" : "Non renseigné"], ["Rôle", draft.role], ["Statut", draft.isActif ? "Actif" : "Désactivé"], ["Inscrit le", dateLabel(draft.createdAt)], ["Modifié le", dateLabel(draft.updatedAt)]].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
            </dl>
            <div className="mt-6 flex justify-end"><button onClick={() => { setError(""); setMode("edit"); }} className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}><Pencil size={16} aria-hidden="true" />Modifier</button></div>
          </>}

          {!detailLoading && !detailFailed && mode === "edit" && <form onSubmit={submit} aria-busy={saving}>
            <fieldset disabled={saving} className="min-w-0 space-y-4">
            <label className="block text-sm font-medium">Nom<input required maxLength={200} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
            <label className="block text-sm font-medium">Email<input required type="email" maxLength={254} autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Téléphone<input type="tel" maxLength={32} autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium">Sexe<select value={draft.sexe} onChange={(event) => setDraft({ ...draft, sexe: event.target.value as User["sexe"] })} className={inputClass}><option value="">Non renseigné</option><option value="HOMME">Homme</option><option value="FEMME">Femme</option></select></label>
              <label className="text-sm font-medium">Rôle<select disabled={draft.id === signedInUser?.id} value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as User["role"] })} className={inputClass}><option value="ADMIN">ADMIN</option><option value="CLIENT">CLIENT</option></select></label>
              <label className="text-sm font-medium">Statut<select disabled={draft.id === signedInUser?.id} value={String(draft.isActif)} onChange={(event) => setDraft({ ...draft, isActif: event.target.value === "true" })} className={inputClass}><option value="true">Actif</option><option value="false">Désactivé</option></select></label>
            </div>
            <label className="block text-sm font-medium">Image (facultative)
              <input type="file" accept="image/png,image/jpeg,image/webp" className={inputClass} onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Choisissez une image PNG, JPEG ou WebP de 2 Mo maximum."); event.target.value = ""; return; }
                setError(""); setImageReading(true);
                const reader = new FileReader();
                reader.onload = () => { setImageReading(false); setDraft((current) => current?.id === draft.id ? { ...current, image: String(reader.result) } : current); };
                reader.onerror = () => { setImageReading(false); setError("Impossible de lire cette image."); };
                reader.readAsDataURL(file);
              }} />
              <span className="mt-1 block text-xs font-normal text-gray-500">PNG, JPEG ou WebP · 2 Mo maximum</span>
            </label>
            {draft.image && <div className="flex items-center gap-3"><Avatar key={draft.image} user={draft} /><button type="button" onClick={() => setDraft({ ...draft, image: "" })} className="text-sm underline">Retirer l’image</button></div>}
            {imageReading && <p role="status" className="text-sm text-gray-500">Lecture de l’image…</p>}
            {error && <p role="alert" className="whitespace-pre-line text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={close} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>Annuler</button>
              <button type="submit" disabled={imageReading || saving} className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
            </fieldset>
          </form>}

          {!detailLoading && !detailFailed && mode === "confirm" && <>
            <p className="text-sm leading-6 text-gray-600">Voulez-vous vraiment {draft.isActif ? "activer" : "désactiver"} le compte de <strong className="text-[#010101]">{draft.name}</strong> ? Vous pourrez changer à nouveau son statut à tout moment.</p>
            {fromEdit && <p className="mt-3 text-sm text-gray-500">Les autres modifications du formulaire seront également enregistrées.</p>}
            {error && <p role="alert" className="mt-3 whitespace-pre-line text-sm text-red-700">{error}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" disabled={saving} onClick={() => setMode(fromEdit ? "edit" : null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>{fromEdit ? "Revenir au formulaire" : "Annuler"}</button>
              <button type="button" disabled={saving || imageReading} onClick={() => void save(draft)} className={`${buttonClass} ${draft.isActif ? "bg-[#65D900] hover:bg-[#58bf00]" : "bg-[#010101] text-white hover:bg-gray-800"}`}>{saving ? "Enregistrement…" : `Confirmer ${draft.isActif ? "l’activation" : "la désactivation"}`}</button>
            </div>
          </>}
        </Modal>
      )}
    </div>
  );
}
