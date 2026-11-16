"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { accountButton, accountInput, accountRequest } from "@/components/AccountArea";

type Profile = { name: string; email: string; phone: string | null; sexe: "HOMME" | "FEMME" | null; updatedAt: string };

export default function ProfileClient() {
  const { refresh } = useAuth();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; profile?: Profile; error?: string }>({ key: -1 });
  useEffect(() => {
    const controller = new AbortController();
    accountRequest<Profile>("/api/users/me", { signal: controller.signal }, refresh)
      .then(profile => { if (!controller.signal.aborted) setResult({ key: retry, profile }); })
      .catch(error => { if (!controller.signal.aborted) setResult({ key: retry, error: error instanceof Error ? error.message : "Profil indisponible." }); });
    return () => controller.abort();
  }, [retry, refresh]);

  return <section className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-8">
    <h2 className="text-xl font-extrabold">Mon profil</h2>
    <p className="mt-2 text-sm text-gray-500">Vos informations personnelles et vos coordonnées de contact.</p>
    {result.key !== retry ? <p role="status" className="py-8 text-sm text-gray-500">Chargement du profil…</p> : result.error ?
      <div role="alert" className="mt-6 text-sm text-red-700"><p>{result.error}</p><button onClick={() => setRetry(v => v + 1)} className={`${accountButton} mt-3 bg-gray-100`}>Réessayer</button></div> : result.profile &&
      <ProfileForm key={`${retry}:${result.profile.updatedAt}`} profile={result.profile} onReload={() => setRetry(v => v + 1)} />}
  </section>;
}

function ProfileForm({ profile, onReload }: { profile: Profile; onReload: () => void }) {
  const { refresh } = useAuth();
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const sending = useRef(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setSuccess(false);
    try {
      const saved = await accountRequest<Profile>("/api/users/me", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone?.trim() || null, sexe: form.sexe, updatedAt: form.updatedAt }),
      }, refresh);
      setForm(saved); setSuccess(true);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer le profil."); }
    finally { sending.current = false; setBusy(false); }
  }
  const change = (field: keyof Profile, value: string | null) => { setForm(current => ({ ...current, [field]: value })); setSuccess(false); };
  return <form onSubmit={save} aria-busy={busy} className="mt-7">
    <fieldset disabled={busy} className="grid gap-5 sm:grid-cols-2">
      <legend className="sr-only">Informations personnelles</legend>
      <label className="text-sm font-semibold">Nom complet<input name="name" autoComplete="name" required minLength={2} maxLength={200} value={form.name} onChange={e => change("name", e.target.value)} className={accountInput} /></label>
      <label className="text-sm font-semibold">E-mail<input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={e => change("email", e.target.value)} className={accountInput} /></label>
      <label className="text-sm font-semibold">Téléphone <span className="font-normal text-gray-500">(facultatif)</span><input name="phone" type="tel" autoComplete="tel" maxLength={32} value={form.phone ?? ""} onChange={e => change("phone", e.target.value)} className={accountInput} /></label>
      <label className="text-sm font-semibold">Sexe <span className="font-normal text-gray-500">(facultatif)</span><select name="sexe" value={form.sexe ?? ""} onChange={e => change("sexe", e.target.value || null)} className={accountInput}><option value="">Non renseigné</option><option value="HOMME">Homme</option><option value="FEMME">Femme</option></select></label>
    </fieldset>
    {error && <div role="alert" className="mt-5 whitespace-pre-line text-sm text-red-700"><p>{error}</p><button type="button" onClick={onReload} disabled={busy} className="mt-2 rounded underline focus-visible:outline-2 focus-visible:outline-[#65D900]">Recharger le profil</button></div>}
    {success && <p role="status" className="mt-5 text-sm font-semibold text-[#438F00]">Vos informations ont été enregistrées.</p>}
    <button disabled={busy} type="submit" className={`${accountButton} mt-6 bg-[#65D900] text-black hover:bg-[#55BD00]`}>{busy ? "Enregistrement…" : "Enregistrer les modifications"}</button>
  </form>;
}