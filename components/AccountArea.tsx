"use client";

import { Fragment, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRound, ShoppingBag, Heart } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export const accountButton = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] disabled:cursor-not-allowed disabled:opacity-50";
export const accountInput = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/25";

export async function accountRequest<T>(url: string, options: RequestInit, refresh: () => Promise<void>): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  if (response.status === 401) void refresh();
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const issues = Array.isArray(data?.issues) ? data.issues.map((issue: { message: string }) => issue.message) : [];
    throw new Error([data?.error ?? "Impossible de contacter le serveur. Réessayez.", ...issues].join("\n"));
  }
  return data;
}

export default function AccountArea({ children }: { children: ReactNode }) {
  const { user, loading, error, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !error && !user) router.replace(`/connexion?next=${encodeURIComponent(pathname)}`);
  }, [user, loading, error, pathname, router]);

  if (error) return <div role="alert" className="p-8 text-center text-red-700"><p>{error}</p><button onClick={() => void refresh()} className={`${accountButton} mt-3 bg-white`}>Réessayer</button></div>;
  if (loading || !user) return <p role="status" className="p-8 text-center text-gray-600">Vérification de votre accès…</p>;
  return <div className="min-h-[60vh] bg-[#F7F8F6] px-4 py-8 sm:py-12 lg:px-8">
    <div className="mx-auto max-w-5xl">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#438F00]">Animalerie Khalil</p>
      <h1 className="text-3xl font-extrabold text-gray-900">Mon compte</h1>
      <nav aria-label="Espace client" className="my-6 flex flex-wrap gap-2">
        {[{ href: "/compte/profil", label: "Mon profil", Icon: UserRound }, { href: "/compte/commandes", label: "Mes commandes", Icon: ShoppingBag }, { href: "/compte/favoris", label: "Mes favoris", Icon: Heart }].map(({ href, label, Icon }) =>
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`${accountButton} ${pathname === href ? "bg-[#65D900] text-black" : "bg-white text-gray-600 hover:text-black"}`}><Icon size={18} aria-hidden="true" />{label}</Link>)}
      </nav>
      <Fragment key={user.id}>{children}</Fragment>
    </div>
  </div>;
}
