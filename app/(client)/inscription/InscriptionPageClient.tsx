"use client";

import { useToast } from "@/components/ToastProvider";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import TypewriterTitle from "@/components/TypewriterTitle";
import LocationSelects from "@/components/LocationSelects";
import { isValidLocation } from "@/lib/tunisia-locations";
import {
  UserRound,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Camera,
  Loader2,
} from "lucide-react";

const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
type Photo = { file: File; preview: string; uploadedUrl?: string };

export default function InscriptionPageClient() {
  const router = useRouter();
  const { register } = useAuth();
  const sending = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadController = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const preview = photo?.preview;
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [photo?.preview]);
  useEffect(() => () => uploadController.current?.abort(), []);

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || sending.current) return;
    setError("");
    if (!imageTypes.includes(file.type)) {
      setError("Choisissez une image JPG, PNG, WebP ou GIF."); return;
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      setError("Choisissez une image non vide de 5 Mo maximum."); return;
    }
    setPhoto({ file, preview: URL.createObjectURL(file) });
  }

  async function uploadPhoto(selected: Photo) {
    if (selected.uploadedUrl) return selected.uploadedUrl;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("L’envoi de photos est indisponible : la configuration Cloudinary est manquante. Vous pouvez vous inscrire sans photo.");
    const controller = new AbortController();
    uploadController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", selected.file);
      body.append("upload_preset", uploadPreset);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: "POST", body, signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error("L’envoi de la photo a échoué. Réessayez ou retirez-la pour vous inscrire sans photo.");
      if (typeof data?.secure_url !== "string" || !data.secure_url) throw new Error("La réponse Cloudinary ne contient pas de photo valide.");
      const url: string = data.secure_url;
      // Reuse this upload if account creation fails and the user retries.
      setPhoto(current => current?.file === selected.file ? { ...current, uploadedUrl: url } : current);
      return url;
    } finally {
      window.clearTimeout(timeout);
      setIsUploading(false);
    }
  }

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [sexe, setSexe] = useState<"HOMME" | "FEMME" | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gouvernorat: "",
    ville: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending.current || success) return;
    setError("");

    // Les données sont également validées par l’API.
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (sexe !== "HOMME" && sexe !== "FEMME") {
      setError("Veuillez sélectionner Homme ou Femme.");
      return;
    }

    if ((formData.gouvernorat || formData.ville) && !isValidLocation(formData.gouvernorat, formData.ville)) {
      setError("Sélectionnez une ville correspondant au gouvernorat choisi.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (new TextEncoder().encode(formData.password).length > 72) {
      setError("Le mot de passe ne doit pas dépasser 72 octets.");
      return;
    }
    if (`${formData.firstName.trim()} ${formData.lastName.trim()}`.trim().length > 200) {
      setError("Le nom complet ne doit pas dépasser 200 caractères.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!acceptTerms) {
      setError("Veuillez accepter les conditions d'utilisation.");
      return;
    }

    try {
      sending.current = true;
      setIsLoading(true);
      const image = photo ? await uploadPhoto(photo) : null;
      if (uploadController.current?.signal.aborted) return;
      await register({
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
        email: formData.email.trim(), phone: formData.phone.trim() || null,
        gouvernorat: formData.gouvernorat || null, ville: formData.ville || null,
        password: formData.password, sexe, image, acceptTerms: true,
      });
      setSuccess(true);
      toast("Votre compte a été créé. Connectez-vous pour accéder à votre compte.");
      setPhoto(null);
      setFormData(current => ({ ...current, password: "", confirmPassword: "" }));
    } catch (reason) {
      setError(reason instanceof DOMException && reason.name === "AbortError" ? "L’envoi de la photo a été interrompu. Réessayez ou retirez-la pour continuer sans photo." : reason instanceof TypeError ? "Impossible de contacter le serveur." : reason instanceof Error ? reason.message : "Une erreur est survenue. Veuillez réessayer.");
    } finally {
      sending.current = false;
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9F7] px-5 py-12 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center justify-center">

        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-black/5 lg:grid-cols-2">

          {/* Left presentation section */}
          <section className="relative hidden flex-col justify-center overflow-hidden bg-[#010101] p-10 lg:flex xl:p-14">

            {/* Decorative elements */}
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#65D900]/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#65D900]/10 blur-3xl" />

            <div className="relative z-10">
              <p className="mb-5 text-xs font-bold uppercase tracking-[3px] text-[#65D900]">
                Animalerie Khalil
              </p>

              <h1 className="text-4xl font-extrabold leading-tight text-white xl:text-5xl">
                Rejoignez notre{" "}
                <span className="text-[#65D900]">communauté.</span>
              </h1>

              <p className="mt-6 max-w-sm text-sm leading-7 text-gray-400">
                Créez votre compte et profitez d’une expérience
                personnalisée pour prendre soin de vos compagnons.
                Retrouvez vos produits préférés et suivez vos commandes
                facilement.
              </p>

              <div className="mt-10 flex flex-col gap-5">

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#65D900]">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Un espace personnel
                    </p>
                    <p className="text-xs text-gray-400">
                      Gérez vos informations et vos commandes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#65D900]">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Une expérience simplifiée
                    </p>
                    <p className="text-xs text-gray-400">
                      Accédez facilement à vos produits favoris.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* Registration form */}
          <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">

              {/* Heading */}
              <div className="mb-8">
                <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                  Bienvenue chez nous
                </p>

                <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                  <TypewriterTitle text="Créer un compte." />
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Remplissez les informations suivantes pour rejoindre
                  notre communauté.
                </p>
              </div>

              {success ? <div role="status" className="rounded-xl border border-[#65D900]/40 bg-[#65D900]/10 p-5 text-sm text-gray-800">

                <p className="mt-2">Connectez-vous pour accéder à votre compte.</p>
                <button type="button" onClick={() => { router.replace("/connexion"); router.refresh(); }} className="mt-4 rounded-xl bg-[#65D900] px-5 py-3 font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2">Se connecter</button>
              </div> : <form onSubmit={handleSubmit} aria-busy={isLoading}>
                <fieldset disabled={isLoading} className="min-w-0 space-y-4">

                <div className="flex flex-col items-center gap-3 border-b border-gray-100 pb-5">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo?.preview ?? "/Unknown.jpg"} alt="Aperçu de votre photo de profil" width={88} height={88}
                      onError={event => { if (!event.currentTarget.src.endsWith("/Unknown.jpg")) event.currentTarget.src = "/Unknown.jpg"; }}
                      className="h-22 w-22 rounded-full border-4 border-white bg-gray-100 object-cover ring-1 ring-gray-200" />
                    <button type="button" onClick={() => fileInput.current?.click()} disabled={isLoading}
                      aria-label="Choisir une photo de profil" title="Choisir une photo de profil"
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#65D900] text-black transition hover:bg-[#55B900] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#438F00] disabled:cursor-wait disabled:opacity-60">
                      {isUploading ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Camera size={15} aria-hidden="true" />}
                    </button>
                    <input ref={fileInput} type="file" accept={imageTypes.join(",")} onChange={selectPhoto} className="hidden" aria-label="Sélectionner une photo de profil" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-800">Photo de profil <span className="font-normal text-gray-500">(facultative)</span></p>
                    {photo && <button type="button" disabled={isLoading} onClick={() => { setPhoto(null); uploadController.current = null; setError(""); }} className="mt-2 rounded text-xs font-semibold text-gray-500 underline underline-offset-2 hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900]">Retirer la photo</button>}
                  </div>
                </div>

                {/* First name and Last name */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-bold text-gray-800"
                    >
                      Prénom
                    </label>

                    <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-3 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                      <UserRound size={18} className="shrink-0 text-gray-400" />

                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Votre prénom"
                        autoComplete="given-name"
                      maxLength={100}
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="h-12 min-w-0 w-full bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-bold text-gray-800"
                    >
                      Nom
                    </label>

                    <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-3 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                      <UserRound size={18} className="shrink-0 text-gray-400" />

                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Votre nom"
                        autoComplete="family-name"
                      maxLength={100}
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="h-12 min-w-0 w-full bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                <fieldset>
                  <legend className="mb-2 text-sm font-bold text-gray-800">Sexe <span className="font-normal text-gray-500">(obligatoire)</span></legend>
                  <div className="grid grid-cols-2 gap-3">
                    {([{ value: "HOMME", label: "Homme" }, { value: "FEMME", label: "Femme" }] as const).map(option => (
                      <label key={option.value}
                        className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm transition focus-within:ring-2 focus-within:ring-[#65D900]/15 ${sexe === option.value ? "border-[#65D900] bg-[#65D900]/10 font-semibold text-gray-900" : "border-gray-200 bg-[#F8F9F7] text-gray-600 hover:border-[#65D900]"}`}>
                        <input type="radio" name="sexe" value={option.value} checked={sexe === option.value}
                          onChange={() => setSexe(option.value)} required className="h-4 w-4 shrink-0 accent-[#65D900]" />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <LocationSelects gouvernorat={formData.gouvernorat} ville={formData.ville}
                    inputClass="mt-2 h-12 w-full rounded-xl border border-gray-200 bg-[#F8F9F7] px-3 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/15 disabled:opacity-50"
                    onChange={location => setFormData(current => ({ ...current, ...location }))} />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-gray-800"
                  >
                    Adresse e-mail
                  </label>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Mail size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="exemple@email.com"
                      autoComplete="email"
                      maxLength={254}
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="h-12 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-gray-800"
                  >
                    Numéro de téléphone (facultatif)
                  </label>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Phone size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Ex. : 20 123 456"
                      autoComplete="tel"
                      maxLength={32}
                      value={formData.phone}
                      onChange={handleChange}
                      className="h-12 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-gray-800"
                  >
                    Mot de passe
                  </label>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Lock size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 caractères"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-12 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="shrink-0 text-gray-400 transition hover:text-[#55B900]"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                {/* Confirm password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-bold text-gray-800"
                  >
                    Confirmer le mot de passe
                  </label>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Lock size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirmez votre mot de passe"
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className="h-12 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      className="shrink-0 text-gray-400 transition hover:text-[#55B900]"
                    >
                      {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#65D900]"
                  />

                  <label
                    htmlFor="acceptTerms"
                    className="cursor-pointer text-xs leading-5 text-gray-500"
                  >
                    J’accepte les{" "}
                    <Link
                      href="/conditions-utilisation"
                      className="font-semibold text-[#55B900] hover:underline"
                    >
                      conditions d’utilisation
                    </Link>{" "}
                    et la politique de confidentialité.
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#65D900] px-5 text-sm font-extrabold text-black shadow-lg shadow-[#65D900]/15 transition duration-300 hover:bg-[#55B900] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? "Envoi de la photo…" : isLoading ? "Création du compte..." : "Créer mon compte"}

                  {!isLoading && (
                    <ArrowRight
                      size={19}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  )}
                </button>
                </fieldset>
              </form>}

              {/* Login link */}
              <div className="mt-7 text-center">
                <p className="text-sm text-gray-500">
                  Vous avez déjà un compte ?
                </p>

                <Link
                  href="/connexion"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-[#55B900] transition hover:text-[#3E8900]"
                >
                  Se connecter
                  <ArrowRight size={16} />
                </Link>
              </div>

            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
