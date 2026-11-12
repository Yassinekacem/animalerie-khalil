
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  Package,
  ShoppingBag,
  ChartNoAxesCombined,
  ChartPie,
  LogOut, 
  LayoutDashboard ,
  Menu,
  X,
  PawPrint,
  ExternalLink,
} from "lucide-react";

const adminLinks = [ 
    { 
    name: "Tableau de bord",
    href: "/admin",
    icon: LayoutDashboard,
  },
  { 
    
    name: "Gestion utilisateurs",
    href: "/admin/utilisateurs",
    icon: Users,
  },
  {
    name: "Gestion produits",
    href: "/admin/produits",
    icon: Package,
  },
  {
    name: "Gestion commandes",
    href: "/admin/commandes",
    icon: ShoppingBag,
  },
  {
    name: "Statistiques",
    href: "/admin/statistiques",
    icon: ChartNoAxesCombined,
  }
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    // Ajouter ici la logique de déconnexion
    router.push("/connexion");
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-2">
          {adminLinks.map((link) => {
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
    onClick={handleLogout}
    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
  >
    <LogOut size={20} />
    Déconnexion
  </button> 
  
</div>
      </aside>
    </>
  );
}
