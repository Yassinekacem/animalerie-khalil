
"use client";

import { Suspense, useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/components/WishlistProvider";
import {
  ShoppingCart,
  UserRound,
  Menu,
  X,
  MapPin,
  Phone,
  Clock,
  Truck,
  LogOut,
  LogIn,
  UserPlus,
  ShoppingBag,
  Settings,
  Heart,
} from "lucide-react";

const announcementItems = [
  { Icon: MapPin, label: "41 Rue de la Paix, Dar Chaabane Al Fehri" },
  { Icon: Phone, label: "+216 96 766 945", href: "tel:+21696766945" },
  { Icon: Clock, label: "Tous les jours de 9h à 20h" },
  { Icon: Truck, label: "Livraison à domicile" },
];

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

function AccountAvatar({ src, className = "h-10 w-10" }: { src: string | null; className?: string }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const validSource = src && (/^\/(?!\/)/.test(src) || /^https?:\/\//i.test(src));
  return <span className={`relative block shrink-0 overflow-hidden rounded-full bg-[#65D900]/10 ring-2 ring-[#65D900]/70 ring-offset-2 ring-offset-[#010101] ${className}`}>
    <Image src={validSource && failedSource !== src ? src : "/Unknown.jpg"} alt="" fill sizes="56px" unoptimized
      onError={() => setFailedSource(src)} className="object-cover" />
  </span>;
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { count } = useCart();
  const { count: wishlistCount, loading: wishlistLoading } = useWishlist();

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
    { href: "/compte/favoris", label: "Mes favoris", Icon: Heart },
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
      <div className="announcement-ticker bg-[#65D900] py-2 text-xs font-semibold text-black sm:text-sm">
        <div className="announcement-ticker-track">
          {[false, true].map((isCopy) => (
            <ul
              key={isCopy ? "copy" : "original"}
              className="announcement-ticker-list"
              aria-hidden={isCopy || undefined}
              role="list"
            >
              {announcementItems.map(({ Icon, label, href }) => (
                <li key={label} className="announcement-ticker-item">
                  {href ? (
                    <a
                      href={href}
                      tabIndex={isCopy ? -1 : undefined}
                      className="announcement-ticker-label hover:underline focus-visible:underline"
                      onFocus={({ currentTarget }) => {
                        if (currentTarget.matches(":focus-visible")) {
                          currentTarget.scrollIntoView({ block: "nearest", inline: "center" });
                        }
                      }}
                    >
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </a>
                  ) : (
                    <span className="announcement-ticker-label">
                      <Icon size={16} aria-hidden="true" />
                      {label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="border-b border-white/10 bg-[#010101]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1 px-4 py-3 sm:gap-4 lg:px-8">

          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image
              src="/logo-animalerie.png"
              alt="Animalerie Khalil"
              width={230}
              height={70}
              priority
              className={user ? "h-auto w-[100px] object-contain min-[360px]:w-[125px] sm:w-[170px] lg:w-[190px]" : "h-auto w-[145px] object-contain sm:w-[190px] lg:w-[210px]"}
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
          <div className={user ? "flex shrink-0 items-center gap-1 sm:gap-2.5" : "flex shrink-0 items-center gap-2 sm:gap-3"}>

            {loading ? <span role="status" className="hidden text-xs text-gray-300 sm:block">Vérification de la session…</span> : user ? (
              <div ref={accountMenu} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAccountOpen(false); }} className="relative order-1 ml-1 text-white sm:ml-1.5 sm:border-l sm:border-white/15 sm:pl-3">
                <button ref={accountTrigger} type="button" onClick={() => setAccountOpen(value => !value)} aria-label={`Mon compte : ${user.name}`} aria-expanded={accountOpen} aria-controls={accountMenuId} className={`flex h-10 w-10 items-center justify-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65D900] sm:h-12 sm:w-12 ${accountOpen ? "bg-white/10" : "hover:bg-white/10"}`}>
                  <AccountAvatar src={user.image} className="h-8 w-8 sm:h-10 sm:w-10" />
                </button>
                {accountOpen && <div id={accountMenuId} className="absolute -right-[8.25rem] top-full z-50 mt-4 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-100 bg-white text-gray-900 shadow-2xl shadow-black/20 sm:-right-[9.875rem] xl:-right-[6.75rem]">
                  <div className="flex items-center gap-4 border-b border-gray-100 bg-[#F7F8F6] px-5 py-5">
                    <AccountAvatar src={user.image} className="h-11 w-11 !ring-offset-[#F7F8F6]" />
                    <div className="min-w-0"><p className="truncate text-sm font-bold" title={user.name}>{user.name}</p><p className="mt-1 truncate text-xs text-gray-500" title={user.email}>{user.email}</p></div>
                  </div>
                  <nav aria-label="Mon compte" className="space-y-1 p-2">{accountLinks.map(({ href, label, Icon }) => <Link key={href} href={href} onClick={() => setAccountOpen(false)} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[#65D900]/10 focus-visible:outline-2 focus-visible:outline-[#65D900]"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition-colors group-hover:bg-[#65D900]/20 group-hover:text-[#438F00]"><Icon size={17} aria-hidden="true" /></span>{label}</Link>)}</nav>
                  <div className="border-t border-gray-100 p-2"><button type="button" onClick={handleLogout} disabled={loggingOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-[#65D900] disabled:opacity-50"><span className="flex h-8 w-8 items-center justify-center"><LogOut size={17} aria-hidden="true" /></span>{loggingOut ? "Déconnexion…" : "Déconnexion"}</button></div>
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

            <Link
              href={!loading && !user ? "/connexion" : "/compte/favoris"}
              aria-label={wishlistCount === null || wishlistLoading ? "Mes favoris" : `Mes favoris (${wishlistCount} produit${wishlistCount > 1 ? "s" : ""})`}
              aria-busy={wishlistLoading}
              onClick={closeMenus}
              className={user ? "relative order-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:border-[#65D900] hover:bg-[#65D900] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] sm:h-11 sm:w-11" : "relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black focus-visible:outline-2 focus-visible:outline-[#65D900]"}
            >
              <Heart size={22} aria-hidden="true" />
              {!wishlistLoading && wishlistCount !== null && <span aria-live="polite" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#65D900] px-1 text-[11px] font-bold text-black">{wishlistCount}</span>}
            </Link>

            {/* Cart - Always visible */}
            <Link
              href="/panier"
              aria-label={`Mon panier (${count} article${count > 1 ? "s" : ""})`}
              className={user ? "relative order-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-200 transition hover:border-[#65D900] hover:bg-[#65D900] hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] sm:h-11 sm:w-11" : "relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black"}
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
              className={user ? "order-4 flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10 hover:text-[#65D900] focus-visible:outline-2 focus-visible:outline-[#65D900] xl:hidden" : "flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black xl:hidden"}
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
            {loading ? <p role="status" className="mt-5 text-sm text-gray-300">Vérification de la session…</p> : user ? null : (
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
