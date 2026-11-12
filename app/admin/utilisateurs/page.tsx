"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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
};

const initialUsers: User[] = [
  { id: 1, name: "Khalil Ben Salem", email: "khalil@example.com", phone: "+216 22 345 678", sexe: "HOMME", image: "", role: "ADMIN", isActif: true },
  { id: 2, name: "Amira Ben Ali", email: "amira@example.com", phone: "+216 55 123 456", sexe: "FEMME", image: "", role: "CLIENT", isActif: true },
  { id: 3, name: "Mohamed Trabelsi", email: "mohamed@example.com", phone: "+216 98 456 789", sexe: "HOMME", image: "", role: "CLIENT", isActif: false },
  { id: 4, name: "Inès Mansour", email: "ines@example.com", phone: "+216 26 789 012", sexe: "FEMME", image: "", role: "CLIENT", isActif: true },
  { id: 5, name: "Sarra Ayari", email: "sarra@example.com", phone: "", sexe: "", image: "", role: "ADMIN", isActif: false },
];

const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101]";

function Avatar({ user }: { user: User }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#010101] text-sm font-bold text-[#65D900]">
      {user.image ? (
        // Local uploaded images are data URLs, displayed without an image service.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt={`Portrait de ${user.name}`} className="h-full w-full object-cover" />
      ) : user.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
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
        <button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2"><X size={20} aria-hidden="true" /></button>
      </div>
      {children}
    </dialog>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<"details" | "edit" | "confirm" | null>(null);
  const [draft, setDraft] = useState<User | null>(null);
  const [fromEdit, setFromEdit] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const query = normalize(search.trim());
  const filteredUsers = users.filter((user) =>
    (normalize(user.name).includes(query) || normalize(user.email).includes(query)) &&
    (!role || user.role === role) &&
    (!status || user.isActif === (status === "active"))
  );

  function open(user: User, nextMode: "details" | "edit" | "confirm") {
    setDraft(nextMode === "confirm" ? { ...user, isActif: !user.isActif } : { ...user });
    setError("");
    setFromEdit(false);
    setMode(nextMode);
  }

  function save(user: User) {
    setUsers((current) => current.map((item) => item.id === user.id ? user : item));
    setNotice(`Les informations de ${user.name} ont été mises à jour.`);
    setMode(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const updated = { ...draft, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim() };
    if (!updated.name) { setError("Veuillez saisir un nom."); return; }
    if (users.some((user) => user.id !== updated.id && user.email.toLowerCase() === updated.email.toLowerCase())) {
      setError("Cette adresse email est déjà utilisée.");
      return;
    }
    setDraft(updated);
    if (users.find((user) => user.id === updated.id)?.isActif !== updated.isActif) {
      setFromEdit(true);
      setMode("confirm");
    } else save(updated);
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
          <div><p className="text-2xl font-bold">{users.length}</p><p className="text-xs text-gray-500">Utilisateurs au total</p></div>
        </div>
      </header>
      <p className="text-xs text-gray-500">Données fictives · Les modifications sont conservées jusqu’au rechargement.</p>
      <p role="status" className="text-sm text-[#306900]">{notice}</p>

      <section aria-label="Recherche et filtres" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-[2fr_1fr_1fr]">
        <label className="text-sm font-medium">Rechercher un utilisateur
          <span className="relative block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-5 text-gray-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou email…" className={`${inputClass} pl-10`} />
          </span>
        </label>
        <label className="text-sm font-medium">Rôle
          <select value={role} onChange={(event) => setRole(event.target.value)} className={inputClass}><option value="">Tous les rôles</option><option value="ADMIN">ADMIN</option><option value="CLIENT">CLIENT</option></select>
        </label>
        <label className="text-sm font-medium">Statut
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}><option value="">Tous les statuts</option><option value="active">Actif</option><option value="inactive">Désactivé</option></select>
        </label>
      </section>

      <section aria-labelledby="users-title" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5"><h2 id="users-title" className="font-bold">Liste des utilisateurs</h2><p aria-live="polite" className="mt-1 text-sm text-gray-500">{filteredUsers.length} résultat{filteredUsers.length > 1 ? "s" : ""}</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <caption className="sr-only">Utilisateurs fictifs et actions de gestion</caption>
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Profil", "Nom", "Email", "Téléphone", "Rôle", "Statut", "Actions"].map((label) => <th scope="col" key={label} className="px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4"><Avatar user={user} /></td>
                  <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold">{user.name}</th>
                  <td className="px-5 py-4 text-gray-600">{user.email}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-600">{user.phone || "Non renseigné"}</td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold">{user.role === "ADMIN" ? <ShieldCheck size={14} aria-hidden="true" /> : <UserRound size={14} aria-hidden="true" />}{user.role}</span></td>
                  <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-medium ${user.isActif ? "bg-[#65D900]/15 text-[#306900]" : "bg-gray-100 text-gray-600"}`}>{user.isActif ? "Actif" : "Désactivé"}</span></td>
                  <td className="px-5 py-4"><div className="flex gap-1">
                    <button onClick={() => open(user, "details")} aria-label={`Consulter les détails de ${user.name}`} title="Consulter les détails" className="rounded-lg p-2.5 hover:bg-gray-200 focus-visible:outline-2"><Eye size={18} aria-hidden="true" /></button>
                    <button onClick={() => open(user, "edit")} aria-label={`Modifier ${user.name}`} title="Modifier" className="rounded-lg p-2.5 hover:bg-[#65D900]/20 focus-visible:outline-2"><Pencil size={18} aria-hidden="true" /></button>
                    <button onClick={() => open(user, "confirm")} aria-label={`${user.isActif ? "Désactiver" : "Activer"} ${user.name}`} title={user.isActif ? "Désactiver" : "Activer"} className={`rounded-lg p-2.5 focus-visible:outline-2 ${user.isActif ? "text-amber-700 hover:bg-amber-50" : "text-[#306900] hover:bg-[#65D900]/20"}`}>{user.isActif ? <UserX size={18} aria-hidden="true" /> : <UserCheck size={18} aria-hidden="true" />}</button>
                  </div></td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Aucun utilisateur ne correspond à vos filtres.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {mode && draft && (
        <Modal title={mode === "details" ? "Détails de l’utilisateur" : mode === "edit" ? "Modifier l’utilisateur" : `${draft.isActif ? "Activer" : "Désactiver"} l’utilisateur`} onClose={() => setMode(null)}>
          {mode === "details" && <>
            <div className="mb-6 flex items-center gap-3"><Avatar user={draft} /><p className="font-semibold">{draft.name}</p></div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              {[["Nom", draft.name], ["Email", draft.email], ["Téléphone", draft.phone || "Non renseigné"], ["Sexe", draft.sexe === "HOMME" ? "Homme" : draft.sexe === "FEMME" ? "Femme" : "Non renseigné"], ["Rôle", draft.role], ["Statut", draft.isActif ? "Actif" : "Désactivé"]].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}
            </dl>
            <div className="mt-6 flex justify-end"><button onClick={() => { setError(""); setMode("edit"); }} className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}><Pencil size={16} aria-hidden="true" />Modifier</button></div>
          </>}

          {mode === "edit" && <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">Nom<input required maxLength={100} autoComplete="name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
            <label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} className={inputClass} /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">Téléphone<input type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} className={inputClass} /></label>
              <label className="text-sm font-medium">Sexe<select value={draft.sexe} onChange={(event) => setDraft({ ...draft, sexe: event.target.value as User["sexe"] })} className={inputClass}><option value="">Non renseigné</option><option value="HOMME">Homme</option><option value="FEMME">Femme</option></select></label>
              <label className="text-sm font-medium">Rôle<select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as User["role"] })} className={inputClass}><option value="ADMIN">ADMIN</option><option value="CLIENT">CLIENT</option></select></label>
              <label className="text-sm font-medium">Statut<select value={String(draft.isActif)} onChange={(event) => setDraft({ ...draft, isActif: event.target.value === "true" })} className={inputClass}><option value="true">Actif</option><option value="false">Désactivé</option></select></label>
            </div>
            <label className="block text-sm font-medium">Image (facultative)
              <input type="file" accept="image/png,image/jpeg,image/webp" className={inputClass} onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) { setError("Choisissez une image PNG, JPEG ou WebP de 2 Mo maximum."); event.target.value = ""; return; }
                setError("");
                const reader = new FileReader();
                reader.onload = () => setDraft((current) => current?.id === draft.id ? { ...current, image: String(reader.result) } : current);
                reader.onerror = () => setError("Impossible de lire cette image.");
                reader.readAsDataURL(file);
              }} />
              <span className="mt-1 block text-xs font-normal text-gray-500">PNG, JPEG ou WebP · 2 Mo maximum</span>
            </label>
            {draft.image && <div className="flex items-center gap-3"><Avatar user={draft} /><button type="button" onClick={() => setDraft({ ...draft, image: "" })} className="text-sm underline">Retirer l’image</button></div>}
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setMode(null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>Annuler</button>
              <button type="submit" className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}>Enregistrer</button>
            </div>
          </form>}

          {mode === "confirm" && <>
            <p className="text-sm leading-6 text-gray-600">Voulez-vous vraiment {draft.isActif ? "activer" : "désactiver"} le compte de <strong className="text-[#010101]">{draft.name}</strong> ? Vous pourrez changer à nouveau son statut à tout moment.</p>
            {fromEdit && <p className="mt-3 text-sm text-gray-500">Les autres modifications du formulaire seront également enregistrées.</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setMode(fromEdit ? "edit" : null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>{fromEdit ? "Revenir au formulaire" : "Annuler"}</button>
              <button type="button" onClick={() => save(draft)} className={`${buttonClass} ${draft.isActif ? "bg-[#65D900] hover:bg-[#58bf00]" : "bg-[#010101] text-white hover:bg-gray-800"}`}>Confirmer {draft.isActif ? "l’activation" : "la désactivation"}</button>
            </div>
          </>}
        </Modal>
      )}
    </div>
  );
}
