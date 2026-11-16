
"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import {
  ShoppingCart,
  UserRound,
  Menu,
  X,
  PawPrint,
  LogOut,
  LogIn,
  UserPlus,
  ChevronDown,
  ShoppingBag,
  Settings,
} from "lucide-react";

const navLinks = [
  { name: "Accueil", href: "/" }, 
      { name: "Astuces Khalil", href: "/khalil-astuces" },
  { name: "Boutique", href: "/boutique" },
  { name: "Chiens", href: "/category?cible=chien" },
  { name: "Chats", href: "/category?cible=chat" },
  { name: "Oiseaux", href: "/category?cible=oiseaux" },
  { name: "Poissons", href: "/category?cible=poissons" }, 

];

function NavigationReset({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  useEffect(() => { onNavigate(); }, [pathname, onNavigate]);
  return null;
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { count } = useCart();

  const { user, loading, error: sessionError, refresh, logout } = useAuth();
  const router = useRouter();
  const accountMenuId = useId();
  const accountMenu = useRef<HTMLDivElement>(null);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountContext = user?.id ?? "guest";
  const [previousContext, setPreviousContext] = useState(accountContext);
  if (previousContext !== accountContext) {
    setPreviousContext(accountContext);
    setAccountOpen(false);
    setIsMenuOpen(false);
  }
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const leaving = useRef(false);
  const closeMenus = useCallback(() => { setAccountOpen(false); setIsMenuOpen(false); }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const outside = (event: PointerEvent) => { if (!accountMenu.current?.contains(event.target as Node)) setAccountOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setAccountOpen(false); accountTrigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [accountOpen]);

  const accountLinks = [
    { href: "/compte/profil", label: "Mon profil", Icon: UserRound },
    { href: "/compte/commandes", label: "Mes commandes", Icon: ShoppingBag },
    ...(user?.role === "ADMIN" ? [{ href: "/admin", label: "Administration", Icon: Settings }] : []),
  ];

  async function handleLogout() {
    if (leaving.current) return;
    leaving.current = true;
    setLoggingOut(true); setLogoutError("");
    try {
      await logout();
      setIsMenuOpen(false);
      setAccountOpen(false);
      const path = window.location.pathname;
      router.replace(path.startsWith("/compte/") ? `/connexion?next=${encodeURIComponent(path)}` : "/");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof TypeError ? "Impossible de contacter le serveur." : error instanceof Error ? error.message : "La déconnexion a échoué.");
    } finally { leaving.current = false; setLoggingOut(false); }
  }

  return (
    <header className="sticky top-0 z-50 w-full">
      <Suspense fallback={null}><NavigationReset onNavigate={closeMenus} /></Suspense>
      {/* Announcement bar */}
      <div className="bg-[#65D900] px-3 py-2 text-center text-xs font-semibold text-black sm:text-sm">
        <PawPrint className="mr-2 inline-block h-4 w-4" />
        Tout pour le bonheur de vos animaux                                                                                                                                
        
      </div>

      {/* Main Navbar */}
      <div className="border-b border-white/10 bg-[#010101]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-animalerie.png"
              alt="Animalerie Khalil"
              width={230}
              height={70}
              priority
              className="h-auto w-[145px] object-contain sm:w-[190px] lg:w-[210px]"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-5 xl:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="whitespace-nowrap text-sm font-medium text-white transition duration-200 hover:text-[#65D900]"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {loading ? <span role="status" className="hidden text-xs text-gray-300 sm:block">Vérification de la session…</span> : user ? (
              <div ref={accountMenu} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAccountOpen(false); }} className="relative hidden text-white sm:block">
                <button ref={accountTrigger} type="button" onClick={() => setAccountOpen(value => !value)} aria-expanded={accountOpen} aria-controls={accountMenuId} className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#65D900]">
                  <UserRound size={19} aria-hidden="true" /><span className="max-w-28 truncate text-sm" title={user.name}>{user.name}</span><ChevronDown size={15} aria-hidden="true" className={accountOpen ? "rotate-180" : ""} />
                </button>
                {accountOpen && <div id={accountMenuId} className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-gray-100 bg-white p-2 text-gray-900 shadow-lg">
                  <nav aria-label="Mon compte">{accountLinks.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-[#65D900]/10 focus-visible:outline-2 focus-visible:outline-[#65D900]"><Icon size={18} aria-hidden="true" />{label}</Link>)}</nav>
                  <button type="button" onClick={handleLogout} disabled={loggingOut} className="mt-1 flex w-full items-center gap-3 rounded-lg border-t border-gray-100 px-3 py-3 text-sm font-semibold hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-[#65D900] disabled:opacity-50"><LogOut size={18} aria-hidden="true" />{loggingOut ? "Déconnexion…" : "Déconnexion"}</button>
                </div>}
              </div>
            ) : (
              <>
                <Link href="/connexion" className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:text-[#65D900] sm:flex">
                  <LogIn size={18} />Connexion
                </Link>
                <Link href="/inscription" className="hidden items-center gap-2 rounded-full bg-[#65D900] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#55B900] sm:flex">
                  <UserPlus size={18} />Créer un compte
                </Link>
              </>
            )}

            {/* Cart - Always visible */}
            <Link
              href="/panier"
              aria-label={`Mon panier (${count} article${count > 1 ? "s" : ""})`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black"
            >
              <ShoppingCart size={22} />
              <span aria-live="polite" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#65D900] px-1 text-[11px] font-bold text-black">
                {count}
              </span>
            </Link> 

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => { setIsMenuOpen(!isMenuOpen); setAccountOpen(false); }}
              aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black xl:hidden"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="border-t border-white/10 bg-[#010101] px-5 py-5 xl:hidden">

            {/* Mobile Navigation Links */}
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="border-b border-white/10 py-3 text-sm font-medium text-white transition hover:pl-2 hover:text-[#65D900]"
                >
                  {link.name}
                </Link>
              ))}
            </nav>

            {/* Mobile Account Actions */}
            {loading ? <p role="status" className="mt-5 text-sm text-gray-300">Vérification de la session…</p> : user ? (
              <div className="mt-5 flex flex-col gap-3">
                <p className="flex items-center gap-3 break-words rounded-lg bg-white/5 p-3 font-medium text-white"><UserRound size={20} className="shrink-0" aria-hidden="true" />{user.name}</p>
                {accountLinks.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3 rounded-lg bg-white/5 p-3 font-semibold text-white hover:text-[#65D900] focus-visible:outline-2 focus-visible:outline-[#65D900]"><Icon size={20} aria-hidden="true" />{label}</Link>)}
                <button type="button" onClick={handleLogout} disabled={loggingOut} className="flex items-center gap-3 rounded-lg bg-white/5 p-3 text-left font-semibold text-white disabled:opacity-50 focus-visible:outline-2">
                  <LogOut size={20} aria-hidden="true" />{loggingOut ? "Déconnexion…" : "Déconnexion"}
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-3">
                <Link href="/connexion" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 rounded-lg border border-white/15 p-3 font-semibold text-white transition hover:border-[#65D900] hover:text-[#65D900]">
                  <LogIn size={19} />Connexion
                </Link>
                <Link href="/inscription" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 rounded-lg bg-[#65D900] p-3 font-bold text-black transition hover:bg-[#55B900]">
                  <UserPlus size={19} />Créer un compte
                </Link>
              </div>
            )}

            {/* Mobile Cart - Always visible */}
            <Link
              href="/panier"
              onClick={() => setIsMenuOpen(false)}
              className="mt-3 flex items-center gap-3 rounded-lg bg-white/5 p-3 font-medium text-white transition hover:text-[#65D900]"
            >
              <ShoppingCart size={20} />
              Mon panier
              <span className="ml-auto rounded-full bg-[#65D900] px-2 py-1 text-xs font-bold text-black">
                {count}
              </span>
            </Link>
          </div>
        )}
      </div>
      {(logoutError || sessionError) && <div role="alert" className="bg-red-50 px-4 py-2 text-center text-xs text-red-700">{logoutError || sessionError}{sessionError && <button type="button" onClick={() => void refresh()} className="ml-3 rounded font-bold underline focus-visible:outline-2">Réessayer</button>}</div>}
    </header>
  );
}
