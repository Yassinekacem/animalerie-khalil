"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState("2026"); 

  useEffect(() => {
    setCurrentYear(String(new Date().getFullYear()));
  }, []);

  return (
    <footer className="bg-[#010101] px-5 pb-8 pt-14 text-white lg:px-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

        {/* Brand */}
        <div>
          <Link href="/">
            <Image
              src="/logo-animalerie.png"
              alt="Animalerie Khalil"
              width={220}
              height={70}
              className="h-auto w-[180px] object-contain"
            />
          </Link>

          <p className="mt-5 max-w-xs text-sm leading-7 text-gray-400">
            Tout pour le bonheur et le bien-être de vos animaux. Merci de faire
            confiance à Animalerie Khalil !
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href="https://www.facebook.com/profile.php?id=100066969746968"
              aria-label="Facebook"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#65D900] hover:text-black"
            >
              <FaFacebook size={18} />
            </a>

            <a
              href="https://www.instagram.com/animaleriekhalil/"
              aria-label="Instagram"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#65D900] hover:text-black"
            >
              <FaInstagram size={18} />
            </a>
          </div>
        </div>

        {/* Navigation */}
        <div>
          <h3 className="mb-5 font-bold text-[#65D900]">
            Navigation
          </h3>

          <div className="flex flex-col gap-3 text-sm text-gray-400">
            <Link href="/" className="hover:text-[#65D900]">
              Accueil
            </Link>

            <Link href="/products" className="hover:text-[#65D900]">
              Boutique
            </Link>


            <a
              href="https://wa.me/21696766945?text=Bonjour%20Animalerie%20Khalil%2C%20je%20souhaite%20vous%20contacter."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#65D900]"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="mb-5 font-bold text-[#65D900]">
            Nos catégories
          </h3>

          <div className="flex flex-col gap-3 text-sm text-gray-400">
            <Link href="/category?cible=chien" className="hover:text-[#65D900]">
              Chiens
            </Link>

            <Link href="/category?cible=chat" className="hover:text-[#65D900]">
              Chats
            </Link>

            <Link href="/category?cible=oiseaux" className="hover:text-[#65D900]">
              Oiseaux
            </Link>

            <Link href="/category?cible=poissons" className="hover:text-[#65D900]">
              Poissons
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="mb-5 font-bold text-[#65D900]">
            Contact
          </h3>

          <div className="space-y-4 text-sm text-gray-400">
            <p>
              <span className="block font-semibold text-white">
                Téléphone
              </span>
              99 434 597
            </p>

            <p>
              <span className="block font-semibold text-white">
                Disponibilité
              </span>
              Contactez-nous pour connaître nos horaires.
            </p>

            <a
              href="https://wa.me/21696766945?text=Bonjour%20Animalerie%20Khalil%2C%20je%20souhaite%20vous%20contacter."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-semibold text-[#65D900] hover:underline"
            >
              Nous contacter
              <ArrowRight size={16} />
            </a>
          </div>
        </div>

      </div>

      {/* Copyright */}
      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-7 text-center">
        <p className="text-xs text-gray-500">
          © {currentYear} Animalerie Khalil. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}