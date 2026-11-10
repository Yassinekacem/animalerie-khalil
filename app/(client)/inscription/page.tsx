
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserRound,
  Mail,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function InscriptionPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
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
    setError("");

    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
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
      setIsLoading(true);

      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Une erreur est survenue lors de l'inscription.");
        return;
      }

      router.push("/connexion");
      router.refresh();

    } catch {
      setError("Impossible de contacter le serveur. Veuillez réessayer.");
    } finally {
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
                Créez votre compte et profitez d'une expérience
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
                  Créer un compte
                  <span className="text-[#65D900]">.</span>
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Remplissez les informations suivantes pour rejoindre
                  notre communauté.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

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
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="h-12 min-w-0 w-full bg-transparent px-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
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
                    Numéro de téléphone
                  </label>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Phone size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Ex. : 20 123 456"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
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
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
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
                    J'accepte les{" "}
                    <Link
                      href="/conditions-utilisation"
                      className="font-semibold text-[#55B900] hover:underline"
                    >
                      conditions d'utilisation
                    </Link>{" "}
                    et la politique de confidentialité.
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
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
                  {isLoading ? "Création du compte..." : "Créer mon compte"}

                  {!isLoading && (
                    <ArrowRight
                      size={19}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

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
