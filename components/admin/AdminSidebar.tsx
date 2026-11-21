
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Package,
  ShoppingBag,
  MessageSquare,
  ChartNoAxesCombined,
  LogOut, 
  LayoutDashboard ,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";

const dashboardLink = {
  name: "Tableau de bord",
  href: "/admin",
  icon: LayoutDashboard,
};

const adminSections = [
  {
    title: "Gestion",
    links: [
      { name: "Utilisateurs", href: "/admin/utilisateurs", icon: Users },
      { name: "Produits", href: "/admin/produits", icon: Package },
      { name: "Commandes", href: "/admin/commandes", icon: ShoppingBag },
      { name: "Gestion des avis", href: "/admin/avis", icon: MessageSquare },
    ],
  },
  {
    title: "Statistiques",
    links: [
      { name: "Utilisateurs", href: "/admin/statistiques/utilisateurs", icon: Users },
      { name: "Produits", href: "/admin/statistiques/produits", icon: Package },
      { name: "Commandes", href: "/admin/statistiques/commandes", icon: ChartNoAxesCombined },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { logout, user, loading, error: sessionError } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const leaving = useRef(false);
  const [notifications, setNotifications] = useState({ userId: 0, count: 0 });
  useEffect(() => {
    if (loading || sessionError || user?.role !== "ADMIN") return;
    const userId = user.id;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/orders?unseen=true", { cache: "no-store", signal: request.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (!request.signal.aborted && Number.isSafeInteger(data.count) && data.count >= 0) {
          setNotifications({ userId, count: data.count });
        }
      } catch {
        // Conserver le dernier compteur connu ; le prochain passage réessaiera.
      }
    };
    const update = () => { void refresh(); };
    update();
    const timer = window.setInterval(update, 15_000);
    window.addEventListener("orders-seen", update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("orders-seen", update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [loading, sessionError, user?.id, user?.role]);
  const unseenCount = !loading && !sessionError && user?.role === "ADMIN" && notifications.userId === user.id
    ? notifications.count : 0;
  useEffect(() => {
    if (!loading && !sessionError && (!user || user.role !== "ADMIN")) {
      router.replace(user ? "/" : "/connexion");
      router.refresh();
    }
  }, [loading, sessionError, user, router]);
  const handleLogout = async () => {
    if (leaving.current) return;
    leaving.current = true;
    setLoggingOut(true); setLogoutError("");
    try {
      await logout();
      router.replace("/connexion");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof TypeError ? "Impossible de contacter le serveur." : error instanceof Error ? error.message : "La déconnexion a échoué.");
    } finally { leaving.current = false; setLoggingOut(false); }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed left-0 top-0 z-50 flex w-full items-center justify-between border-b border-white/10 bg-[#010101] px-4 py-3 lg:hidden">
        <Link href="/admin">
          <Image
            src="/logo-animalerie.png"
            alt="Animalerie Khalil"
            width={180}
            height={60}
            className="h-auto w-[145px] object-contain"
            priority
          />
        </Link>

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-white/10 bg-[#010101] transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex min-h-[110px] items-center justify-center border-b border-white/10 px-5">
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="flex flex-col items-center"
          >
            <Image
              src="/logo-animalerie.png"
              alt="Animalerie Khalil"
              width={220}
              height={75}
              priority
              className="h-auto w-[200px] object-contain"
            />
          </Link>
        </div>

        {/* Admin Label */}
        <div className="px-6 pb-3 pt-7">
          <p className="text-xs font-bold uppercase tracking-[2px] text-[#65D900]">
            Administration
          </p>
          {user && <p className="mt-2 truncate text-xs text-gray-400" title={user.name}>{user.name}</p>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-2">
          {[dashboardLink].map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[#65D900] text-black shadow-lg shadow-[#65D900]/10"
                    : "text-gray-300 hover:bg-white/5 hover:text-[#65D900]"
                }`}
              >
                <Icon
                  size={20}
                  className={`shrink-0 transition ${
                    isActive
                      ? "text-black"
                      : "text-gray-400 group-hover:text-[#65D900]"
                  }`}
                />

                <span>{link.name}</span>
              </Link>
            );
          })}
          {adminSections.map((section) => (
            <section key={section.title} aria-label={section.title}>
              <h2 className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[#65D900] text-black shadow-lg shadow-[#65D900]/10"
                          : "text-gray-300 hover:bg-white/5 hover:text-[#65D900]"
                      }`}
                    >
                      <Icon
                        size={20}
                        className={`shrink-0 transition ${
                          isActive
                            ? "text-black"
                            : "text-gray-400 group-hover:text-[#65D900]"
                        }`}
                      />
                      <span>{link.name}</span>
                      {link.href === "/admin/commandes" && unseenCount > 0 && (
                        <span role="status" aria-label={`${unseenCount} nouvelle(s) commande(s)`}
                          className="ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold tabular-nums text-white">
                          {unseenCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

 {/* Bottom Section */}
<div className="border-t border-white/10 px-4 pt-4 pb-10">
<Link
  href="/"
  target="_blank"
  rel="noopener noreferrer"
  className="mb-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-[#65D900]"
>
  <ExternalLink size={20} />
  Voir la boutique
</Link>
  {/* Logout */}
  <button
    type="button"
    disabled={loggingOut}
    onClick={handleLogout}
    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 focus-visible:outline-2"
  >
    <LogOut size={20} />
    {loggingOut ? "Déconnexion…" : "Déconnexion"}
  </button>
  {logoutError && <p role="alert" className="mt-2 px-4 text-xs text-red-300">{logoutError}</p>}
</div>
      </aside>
    </>
  );
}
