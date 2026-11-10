
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

export default function ConnexionPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    try {
      setIsLoading(true);

      const response = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Adresse e-mail ou mot de passe incorrect.");
        return;
      }

      router.push("/");
      router.refresh();

    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
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

            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#65D900]/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#65D900]/10 blur-3xl" />

            <div className="relative z-10">
   

              <h1 className="text-4xl font-extrabold leading-tight text-white xl:text-5xl">
                Bienvenue dans votre{" "}
                <span className="text-[#65D900]">espace.</span>
              </h1>

              <p className="mt-6 max-w-sm text-sm leading-7 text-gray-400">
                Connectez-vous pour retrouver vos favoris,
                consulter vos commandes et profiter pleinement
                de notre boutique dédiée à vos animaux.
              </p>

              <div className="mt-10 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#65D900] text-black">
                  <Lock size={21} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    Connexion sécurisée
                  </p>
                  <p className="text-xs text-gray-400">
                    Votre espace personnel
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Login form */}
          <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
            <div className="w-full max-w-md">

              <div className="mb-9">
                <p className="mb-3 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                  Votre espace personnel
                </p>

                <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                  Connexion<span className="text-[#65D900]">.</span>
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Heureux de vous revoir ! Connectez-vous à votre compte.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

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
                      className="h-14 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-bold text-gray-800"
                    >
                      Mot de passe
                    </label>

                    <Link
                      href="/mot-de-passe-oublie"
                      className="text-xs font-semibold text-[#55B900] transition hover:text-[#3E8900]"
                    >
                      Mot de passe oublié ?
                    </Link>
                  </div>

                  <div className="flex items-center rounded-xl border border-gray-200 bg-[#F8F9F7] px-4 transition focus-within:border-[#65D900] focus-within:ring-2 focus-within:ring-[#65D900]/15">
                    <Lock size={19} className="shrink-0 text-gray-400" />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Entrez votre mot de passe"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="h-14 w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="shrink-0 text-gray-400 transition hover:text-[#55B900]"
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me */}
                <div className="flex items-center gap-2">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 cursor-pointer accent-[#65D900]"
                  />

                  <label
                    htmlFor="rememberMe"
                    className="cursor-pointer text-sm text-gray-600"
                  >
                    Se souvenir de moi
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
                  {isLoading ? "Connexion en cours..." : "Se connecter"}

                  {!isLoading && (
                    <ArrowRight
                      size={19}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  )}
                </button>
              </form>

              {/* Register */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Vous n'avez pas encore de compte ?
                </p>

                <Link
                  href="/inscription"
                  className="mt-2 inline-flex items-center gap-2 text-sm font-extrabold text-[#55B900] transition hover:text-[#3E8900]"
                >
                  Créer un compte
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
