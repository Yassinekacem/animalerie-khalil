"use client";

import { useToast } from "@/components/ToastProvider";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, Mail, Phone, Save, UserRound } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { accountButton, accountInput, accountRequest } from "@/components/AccountArea";
import LocationSelects from "@/components/LocationSelects";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  gouvernorat: string | null;
  ville: string | null;
  image: string | null;
  sexe: "HOMME" | "FEMME" | null;
  updatedAt: string;
};
type ProfileChanges = Partial<Omit<Profile, "updatedAt">>;
const fallbackImage = "/Unknown.jpg";
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const maxImageSize = 5 * 1024 * 1024;

export default function ProfileClient() {
  const { refresh } = useAuth();
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; profile?: Profile; error?: string }>({ key: -1 });

  useEffect(() => {
    const controller = new AbortController();
    accountRequest<Profile>("/api/users/me", { signal: controller.signal }, refresh)
      .then(profile => { if (!controller.signal.aborted) setResult({ key: retry, profile }); })
      .catch(error => {
        if (!controller.signal.aborted) setResult({ key: retry, error: error instanceof Error ? error.message : "Profil indisponible." });
      });
    return () => controller.abort();
  }, [retry, refresh]);

  if (result.key !== retry) return (
    <section aria-busy="true" className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8">
      <p role="status" className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={18} className="animate-spin" aria-hidden="true" />Chargement de votre profil…</p>
      <div aria-hidden="true" className="mt-6 animate-pulse space-y-6">
        <div className="h-24 w-24 rounded-full bg-gray-100" />
        <div className="grid gap-5 sm:grid-cols-2">{[0, 1, 2, 3].map(key => <div key={key} className="h-16 rounded-xl bg-gray-100" />)}</div>
      </div>
    </section>
  );
  if (result.error) return (
    <section role="alert" className="rounded-2xl border border-red-100 bg-white p-6">
      <p className="text-sm text-red-700">{result.error}</p>
      <button onClick={() => setRetry(value => value + 1)} className={`${accountButton} mt-4 bg-gray-100`}>Réessayer</button>
    </section>
  );
  return result.profile ? <ProfileForm key={`${retry}:${result.profile.updatedAt}`} profile={result.profile} onReload={() => setRetry(value => value + 1)} /> : null;
}

function ProfileForm({ profile, onReload }: { profile: Profile; onReload: () => void }) {
  const { refresh } = useAuth();
  const [form, setForm] = useState(profile);
  const [savedProfile, setSavedProfile] = useState(profile);
  const [operation, setOperation] = useState<"" | "profile" | "upload" | "photo">("");
  const [error, setError] = useState("");
  const setSuccess = useToast();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const sending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const busy = operation !== "";
  const avatar = form.image && failedImage !== form.image ? form.image : fallbackImage;
  const changes: ProfileChanges = {
    ...(form.name.trim() !== savedProfile.name ? { name: form.name.trim() } : {}),
    ...(form.email.trim().toLowerCase() !== savedProfile.email ? { email: form.email.trim().toLowerCase() } : {}),
    ...((form.phone?.trim() || null) !== savedProfile.phone ? { phone: form.phone?.trim() || null } : {}),
    ...(form.sexe !== savedProfile.sexe ? { sexe: form.sexe } : {}),
    ...(form.gouvernorat !== savedProfile.gouvernorat || form.ville !== savedProfile.ville
      ? { gouvernorat: form.gouvernorat, ville: form.ville } : {}),
  };
  const hasChanges = Object.keys(changes).length > 0;

  useEffect(() => () => controller.current?.abort(), []);

  async function patchProfile(data: ProfileChanges, signal: AbortSignal) {
    return accountRequest<Profile>("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, updatedAt: savedProfile.updatedAt }),
      signal,
    }, refresh);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !hasChanges) return;
    sending.current = true;
    const request = new AbortController();
    controller.current = request;
    setOperation("profile"); setError(""); setSuccess("");
    try {
      const saved = await patchProfile(changes, request.signal);
      if (request.signal.aborted) return;
      setForm(saved); setSavedProfile(saved);
      setSuccess("Vos informations ont été enregistrées.");
      await refresh();
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : "Impossible d’enregistrer le profil.");
    } finally {
      sending.current = false;
      if (!request.signal.aborted) setOperation("");
    }
  }

  async function uploadPhoto(file: File) {
    if (sending.current) return;
    setError(""); setSuccess("");
    if (!allowedImageTypes.includes(file.type)) {
      setError("Choisissez une image JPG, PNG, WebP ou GIF."); return;
    }
    if (file.size === 0 || file.size > maxImageSize) {
      setError("Choisissez une image non vide de 5 Mo maximum."); return;
    }
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setError("L’envoi de photos est indisponible : la configuration Cloudinary est manquante."); return;
    }

    sending.current = true;
    const request = new AbortController();
    controller.current = request;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; request.abort(); }, 60_000);
    setOperation("upload");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", uploadPreset);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: "POST", body, signal: request.signal,
      });
      const uploaded = await response.json().catch(() => null);
      if (!response.ok) throw new Error("L’envoi vers Cloudinary a échoué. Veuillez réessayer.");
      if (typeof uploaded?.secure_url !== "string" || !uploaded.secure_url) throw new Error("La réponse Cloudinary ne contient pas d’image valide.");
      window.clearTimeout(timeout);
      setOperation("photo");
      const saved = await patchProfile({ image: uploaded.secure_url }, request.signal);
      if (request.signal.aborted) return;
      // Saving a photo must preserve the other fields currently being edited.
      setForm(current => ({ ...current, image: saved.image, updatedAt: saved.updatedAt }));
      setSavedProfile(saved);
      setFailedImage(null);
      setSuccess("Votre photo de profil a été mise à jour.");
      await refresh();
    } catch (reason) {
      if (!request.signal.aborted || timedOut) {
        setError(timedOut ? "L’envoi a pris trop de temps. Veuillez réessayer." : reason instanceof Error ? reason.message : "Impossible d’enregistrer la photo.");
      }
    } finally {
      window.clearTimeout(timeout);
      sending.current = false;
      if (!request.signal.aborted || timedOut) setOperation("");
    }
  }

  function change(field: "name" | "email" | "phone" | "sexe", value: string) {
    setForm(current => ({
      ...current,
      [field]: field === "sexe" ? (value === "HOMME" || value === "FEMME" ? value : null) : value,
    }));
    setSuccess("");
  }

  return (
    <section aria-busy={busy} className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm shadow-black/[0.02]">
      <div className="border-b border-gray-100 px-5 py-6 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#438F00]">Informations personnelles</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-950">Mon profil</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">Gérez votre photo et vos coordonnées en quelques instants.</p>
      </div>

      <div className="px-5 sm:px-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 py-7 sm:flex-row sm:items-center sm:gap-6">
          <div className="relative w-fit shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar} alt={`Photo de profil de ${savedProfile.name}`}
              width={104} height={104}
              onError={() => { if (form.image) setFailedImage(form.image); }}
              className="h-26 w-26 rounded-full border-4 border-white bg-gray-100 object-cover ring-1 ring-gray-200" />
            <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}
              aria-label="Modifier ma photo de profil" title="Modifier ma photo de profil"
              className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-[#65D900] text-black shadow-sm transition hover:bg-[#59C200] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#438F00] disabled:cursor-wait disabled:opacity-60">
              {operation === "upload" || operation === "photo" ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Camera size={17} aria-hidden="true" />}
            </button>
            <input ref={fileInput} type="file" accept={allowedImageTypes.join(",")} disabled={busy}
              aria-label="Sélectionner une photo de profil" className="hidden"
              onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void uploadPhoto(file);
              }} />
          </div>
          <div className="min-w-0">
            <h3 className="break-words text-lg font-bold text-gray-950">{savedProfile.name}</h3>
            <p className="mt-1 break-all text-sm text-gray-500">{savedProfile.email}</p>
            <p className="mt-3 text-xs leading-5 text-gray-500">Cliquez sur la caméra pour modifier votre photo.<br />JPG, PNG, WebP ou GIF · 5 Mo maximum.</p>
            {(operation === "upload" || operation === "photo") && <p role="status" className="mt-2 text-xs font-semibold text-[#438F00]">{operation === "upload" ? "Envoi de votre photo…" : "Enregistrement de votre photo…"}</p>}
          </div>
        </div>

        <form onSubmit={save} className="py-7">
          <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-2 sm:gap-6">
            <legend className="sr-only">Modifier mes informations personnelles</legend>
            <label className="min-w-0 text-sm font-semibold text-gray-800">
              <span className="flex items-center gap-2"><UserRound size={16} className="text-gray-400" aria-hidden="true" />Nom complet</span>
              <input name="name" autoComplete="name" required minLength={2} maxLength={200} value={form.name} onChange={event => change("name", event.target.value)} className={accountInput} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-gray-800">
              <span className="flex items-center gap-2"><Mail size={16} className="text-gray-400" aria-hidden="true" />Adresse e-mail</span>
              <input name="email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={event => change("email", event.target.value)} className={accountInput} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-gray-800">
              <span className="flex flex-wrap items-center gap-2"><Phone size={16} className="text-gray-400" aria-hidden="true" />Téléphone <span className="text-xs font-normal text-gray-400">(facultatif)</span></span>
              <input name="phone" type="tel" autoComplete="tel" maxLength={32} placeholder="Votre numéro de téléphone" value={form.phone ?? ""} onChange={event => change("phone", event.target.value)} className={accountInput} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-gray-800">
              <span className="flex items-center gap-2">Sexe <span className="text-xs font-normal text-gray-400">(facultatif)</span></span>
              <select name="sexe" value={form.sexe ?? ""} onChange={event => change("sexe", event.target.value)} className={accountInput}>
                <option value="">Non renseigné</option><option value="HOMME">Homme</option><option value="FEMME">Femme</option>
              </select>
            </label>
            <LocationSelects gouvernorat={form.gouvernorat ?? ""} ville={form.ville ?? ""} inputClass={accountInput}
              onChange={location => {
                setForm(current => ({ ...current, gouvernorat: location.gouvernorat || null, ville: location.ville || null }));
                setSuccess("");
              }} />
          </fieldset>

          {error && <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            <p className="whitespace-pre-line">{error}</p>
            <button type="button" onClick={onReload} disabled={busy} className="mt-2 rounded font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50">Recharger les dernières informations</button>
          </div>}


          <div className="mt-7 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-gray-500">{hasChanges ? "Des modifications attendent d’être enregistrées." : "Vos informations sont à jour."}</p>
            <button disabled={busy || !hasChanges} type="submit" className={`${accountButton} w-full bg-[#65D900] text-black transition hover:bg-[#59C200] sm:w-auto`}>
              {operation === "profile" ? <Loader2 size={17} className="animate-spin" aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}
              {operation === "profile" ? "Enregistrement…" : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
