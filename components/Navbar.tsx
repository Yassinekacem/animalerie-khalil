
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  ShoppingCart,
  UserRound,
  Menu,
  X,
  PawPrint,
} from "lucide-react";

const navLinks = [
  { name: "Accueil", href: "/" },
  { name: "Boutique", href: "/boutique" },
  { name: "Chiens", href: "/category?cible=chien" },
  { name: "Chats", href: "/category?cible=chat" },
  { name: "Oiseaux", href: "/category?cible=oiseaux" },
  { name: "Poissons", href: "/category?cible=poissons" },
];

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full">

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

          {/* Search */}
          <div className="hidden max-w-[220px] flex-1 items-center rounded-full border border-white/15 bg-[#1B1B1B] px-4 py-2 lg:flex">
            <input
              type="text"
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
            />
            <Search className="h-5 w-5 shrink-0 text-[#65D900]" />
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Account */}
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="hidden h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black sm:flex"
            >
              <UserRound size={21} />
            </Link>

            {/* Cart */}
            <Link
              href="/panier"
              aria-label="Mon panier"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-[#65D900] hover:text-black"
            >
              <ShoppingCart size={22} />

              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#65D900] text-[11px] font-bold text-black">
                0
              </span>
            </Link>

            {/* Mobile Menu */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
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

            {/* Mobile Search */}
            <div className="mb-5 flex items-center rounded-full border border-white/15 bg-[#1B1B1B] px-4 py-3">
              <input
                type="text"
                placeholder="Rechercher un produit..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
              />
              <Search size={19} className="text-[#65D900]" />
            </div>

            {/* Mobile Links */}
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

            {/* Mobile Account */}
            <Link
              href="/compte"
              onClick={() => setIsMenuOpen(false)}
              className="mt-5 flex items-center gap-3 rounded-lg bg-[#65D900]/10 p-3 font-medium text-[#65D900]"
            >
              <UserRound size={20} />
              Mon compte
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
