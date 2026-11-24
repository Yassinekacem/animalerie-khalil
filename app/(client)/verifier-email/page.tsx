"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#306900]";
const button = `inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors motion-reduce:transition-none ${focus} disabled:cursor-not-allowed disabled:opacity-60`;
const primaryButton = `${button} bg-[#65D900] text-black hover:bg-[#55BD00]`;
const secondaryButton = `${button} border border-gray-400 bg-white text-gray-900 hover:bg-gray-50`;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, loading, error: authError } = useAuth();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState<"verify" | "resend" | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const sending = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const shouldRedirect = !loading && !authError && Boolean(user?.emailVerifiedAt);

  useEffect(() => {
    if (shouldRedirect) router.replace("/");
  }, [router, shouldRedirect]);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  useEffect(() => {
    if (verified) titleRef.current?.focus();
  }, [verified]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const value = fragment.get("token");
      if (value) {
        window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
        if (/^[0-9a-f]{64}$/.test(value)) setToken(value);
        else setError("Ce lien de vérification est invalide. Demandez un nouveau lien ci-dessous.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(action: "verify" | "resend", event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (sending.current || (action === "resend" && cooldown > 0)) return;
    sending.current = true;
    setBusy(action); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/auth/${action === "verify" ? "verify-email" : "resend-verification"}`, {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "verify" ? { token } : { email: email.trim() }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 429) setCooldown(60);
      if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "La demande n’a pas pu être traitée. Réessayez.");
      if (typeof data?.message !== "string") throw new Error("La réponse du serveur est incorrecte.");
      setMessage(data.message);
      if (action === "verify") { setVerified(true); setToken(""); }
      else setCooldown(60);
    } catch (reason) {
      setError(reason instanceof TypeError ? "Impossible de contacter le serveur. Vérifiez votre connexion et réessayez." : reason instanceof Error ? reason.message : "Une erreur est survenue.");
    } finally { sending.current = false; setBusy(null); }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[#F7F8F6] px-4 py-12 sm:px-6 sm:py-20">
      {shouldRedirect ? (
        <p role="status" className="flex items-center gap-3 text-sm text-gray-700">
          <Loader2 size={20} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Redirection vers l’accueil…
        </p>
      ) : (
        <section aria-labelledby="verification-title" className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-10">
          <header className="text-center">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#65D900]/15 text-[#306900]" aria-hidden="true">
              {verified ? <CheckCircle2 size={30} strokeWidth={1.75} /> : <Mail size={30} strokeWidth={1.75} />}
            </div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#306900]">Animalerie Khalil</p>
            <h1 ref={titleRef} tabIndex={-1} id="verification-title" className={`rounded-lg text-2xl font-extrabold tracking-tight text-[#010101] sm:text-3xl ${focus}`}>
              {verified ? "Email vérifié" : "Vérifiez votre email"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              {verified ? "Votre adresse est confirmée. Vous pouvez maintenant vous connecter à votre compte." : token ? "Confirmez votre adresse email pour accéder à votre compte." : "Ouvrez l’email reçu et suivez le lien pour activer votre compte."}
            </p>
          </header>

          <div role="status" aria-atomic="true">
            {message && <p className="mt-6 break-words rounded-xl border border-[#65D900]/40 bg-[#65D900]/10 p-4 text-sm leading-6 text-gray-900">{message}</p>}
          </div>
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className={`mt-6 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800 ${focus}`}>{error}</p>}

          {token && !verified && (
            <div className="mt-7">
              <button type="button" disabled={Boolean(busy)} aria-busy={busy === "verify"} onClick={() => void submit("verify")} className={primaryButton}>
                {busy === "verify" && <Loader2 size={18} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
                {busy === "verify" ? "Vérification…" : "Confirmer mon adresse email"}
              </button>
            </div>
          )}

          {!verified && (
            <form onSubmit={event => void submit("resend", event)} aria-labelledby="resend-title" aria-busy={busy === "resend"} className="mt-8 space-y-5 border-t border-gray-200 pt-7">
              <div>
                <h2 id="resend-title" className="text-base font-bold text-gray-900">Recevoir un nouveau lien</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">Vous n’avez rien reçu ? Consultez vos courriers indésirables ou demandez un nouvel email.</p>
              </div>
              <div>
                <label htmlFor="verification-email" className="mb-2 block text-sm font-semibold text-gray-900">Adresse email <span className="font-normal text-gray-600">(obligatoire)</span></label>
                <input id="verification-email" name="email" type="email" inputMode="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby="resend-help" value={email} onChange={event => setEmail(event.target.value)} disabled={Boolean(busy)} className={`min-h-12 w-full rounded-xl border border-gray-400 bg-white px-4 py-3 text-base text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100 ${focus}`} />
              </div>
              <button type="submit" disabled={Boolean(busy) || cooldown > 0} className={token ? secondaryButton : primaryButton}>
                {busy === "resend" ? <><Loader2 size={18} className="shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />Envoi en cours…</> : cooldown > 0 ? `Réessayer dans ${cooldown} s` : "Renvoyer le lien de vérification"}
              </button>
              <p id="resend-help" className="text-xs leading-6 text-gray-600">Lien valable 24 heures, utilisable une seule fois. Chaque nouvel envoi remplace le lien précédent. Maximum cinq envois par heure.</p>
            </form>
          )}

          <footer className="mt-8 border-t border-gray-200 pt-5 text-center">
            <Link href="/connexion" className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-gray-700 underline decoration-gray-400 underline-offset-4 transition-colors hover:text-black motion-reduce:transition-none ${focus}`}>Se connecter</Link>
          </footer>
        </section>
      )}
    </div>
  );
}
