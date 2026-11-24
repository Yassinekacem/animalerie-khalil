"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#306900]";
const input = `mt-2 min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base font-normal text-gray-900 ${focus}`;

export default function ForgotPasswordPage() {
  const { refresh } = useAuth();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const sending = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const value = fragment.get("token");
      if (fragment.has("token")) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        if (value && /^[0-9a-f]{64}$/.test(value)) setToken(value);
        else setError("Ce lien est invalide. Demandez un nouveau lien ci-dessous.");
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (done) titleRef.current?.focus(); }, [done]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || (!token && cooldown > 0)) return;
    setError(""); setMessage("");
    if (token && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      setError("Le mot de passe doit contenir au moins 8 caractères et ne pas dépasser 72 octets."); return;
    }
    if (token && password !== confirmation) { setError("Les mots de passe ne correspondent pas."); return; }
    sending.current = true; setBusy(true);
    try {
      const response = await fetch(`/api/auth/${token ? "reset-password" : "forgot-password"}`, {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password } : { email: email.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 429 && !token) setCooldown(60);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "La demande n’a pas pu être traitée. Réessayez.");
      if (typeof data?.message !== "string") throw new Error("La réponse du serveur est incorrecte.");
      setMessage(data.message);
      if (token) {
        setDone(true); setToken(""); setPassword(""); setConfirmation("");
        // Clear the local account display after the backend invalidates sessions.
        void refresh();
      } else setCooldown(60);
    } catch (reason) {
      setError(reason instanceof TypeError ? "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez." : reason instanceof Error ? reason.message : "Une erreur est survenue.");
    } finally { sending.current = false; setBusy(false); }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F8F6] px-4 py-12 sm:px-6 sm:py-20">
      <section aria-labelledby="password-title" className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="text-center">
          <div aria-hidden="true" className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#65D900]/15 text-[#306900]">{done ? <CheckCircle2 size={30} /> : <KeyRound size={30} />}</div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#306900]">Animalerie Khalil</p>
          <h1 ref={titleRef} tabIndex={-1} id="password-title" className={`rounded-lg text-2xl font-extrabold tracking-tight text-black sm:text-3xl ${focus}`}>{done ? "Mot de passe réinitialisé" : token ? "Nouveau mot de passe" : "Mot de passe oublié ?"}</h1>
          {!done && <p className="mt-4 text-sm leading-7 text-gray-600">{token ? "Choisissez un nouveau mot de passe pour sécuriser votre compte." : "Indiquez votre adresse email pour recevoir un lien de réinitialisation."}</p>}
        </header>
        <div role="status" aria-atomic="true">{message && <p className="mt-6 break-words rounded-xl border border-[#65D900]/40 bg-[#65D900]/10 p-4 text-sm leading-6 text-gray-900">{message}</p>}</div>
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className={`mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 ${focus}`}>{error}</p>}
        {!ready ? <p role="status" className="mt-6 text-center text-sm text-gray-600">Chargement…</p> : !done && (
          <form onSubmit={event => void submit(event)} aria-busy={busy} className="mt-7">
            <fieldset disabled={busy} className="min-w-0 space-y-5 disabled:opacity-70">
              {token ? <>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-semibold text-gray-900">Nouveau mot de passe</label>
                  <div className="relative">
                    <input id="new-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-help" value={password} onChange={event => setPassword(event.target.value)} className={`${input} pr-14`} />
                    <button type="button" aria-label={showPassword ? "Masquer les mots de passe" : "Afficher les mots de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className={`absolute right-1 top-3 flex size-11 items-center justify-center rounded-lg text-gray-600 ${focus}`}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                  <p id="password-help" className="mt-2 text-xs leading-6 text-gray-600">Au moins 8 caractères, maximum 72 octets. Utilisez un mot de passe unique.</p>
                </div>
                <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-900">Confirmer le mot de passe
                  <input id="confirm-password" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={input} />
                </label>
              </> : <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-900">Adresse email
                <input id="reset-email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className={input} />
              </label>}
              <button type="submit" disabled={busy || (!token && cooldown > 0)} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black hover:bg-[#55BD00] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`}>
                {busy && <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {busy ? "Traitement en cours…" : token ? "Réinitialiser mon mot de passe" : cooldown ? `Réessayer dans ${cooldown} s` : "Envoyer le lien de réinitialisation"}
              </button>
            </fieldset>
            {token ? <button type="button" disabled={busy} onClick={() => { setToken(""); setPassword(""); setConfirmation(""); setError(""); setMessage(""); }} className={`mt-4 min-h-11 w-full rounded-md text-sm text-gray-700 underline underline-offset-4 ${focus}`}>Demander un nouveau lien</button> : <p className="mt-4 text-xs leading-6 text-gray-600">Lien valable 30 minutes et utilisable une seule fois. Patientez une minute entre deux demandes. Maximum cinq envois par heure.</p>}
          </form>
        )}
        <footer className="mt-8 border-t border-gray-200 pt-5 text-center"><Link href="/connexion" className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-gray-700 underline underline-offset-4 ${focus}`}>Se connecter</Link></footer>
      </section>
    </div>
  );
}
