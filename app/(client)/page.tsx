"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useWishlist } from "@/components/WishlistProvider";
import { animals, categories as productCategories, fallbackImage, formatPrice, type Animal } from "@/lib/catalogue";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { 
  ArrowRight,
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  Headphones,
  Gift,
  PawPrint,
} from "lucide-react";

// ================= DATA =================

const categories = [
  {
    name: "Chiens",
    description: "Alimentation et accessoires pour le bien-être de votre chien.",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=700",
    href: "/category?cible=chien",
  },
  {
    name: "Chats",
    description: "Tout pour nourrir, divertir et prendre soin de votre chat.",
    image:
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=700",
    href: "/category?cible=chat",
  },
  {
    name: "Oiseaux",
    description: "Aliments et accessoires pour le confort de vos oiseaux.",
    image:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=700",
    href: "/category?cible=oiseaux",
  },
  {
    name: "Poissons",
    description: "Alimentation et accessoires pour vos poissons et aquariums.",
    image:
      "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?q=80&w=712&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D",
    href: "/category?cible=poissons",
  },
];

type Product = {
  id: number;
  name: string;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
};

const advantages = [
  {
    icon: Truck,
    title: "Livraison disponible",
    description: "Recevez vos produits directement chez vous.",
  },
  {
    icon: ShieldCheck,
    title: "Qualité garantie",
    description: "Une sélection de produits pour vos animaux.",
  },
  {
    icon: Headphones,
    title: "À votre écoute",
    description: "Notre équipe vous accompagne et vous conseille.",
  },
  {
    icon: Gift,
    title: "Offres spéciales",
    description: "Profitez régulièrement de nos promotions.",
  },
];

// ================= ANIMATION VARIANTS =================

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.13,
      delayChildren: 0.2,
    },
  },
};

const wordVariants: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: {
        duration: 1.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.2,
      },
      opacity: {
        duration: 0.3,
        delay: 0.2,
      },
    },
  },
};

const accentWordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(10px)",
    textShadow: "0px 0px 0px rgba(101, 217, 0, 0)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    textShadow: "0px 0px 20px rgba(101, 217, 0, 0.3)",
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const underlineVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 10,
    filter: "blur(5px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

// ================= HOME PAGE =================

function PawDecorations({ marks, dark = false }: { marks: string[]; dark?: boolean }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 select-none overflow-hidden ${dark ? "text-[#65D900]/[0.055]" : "text-[#416533]/[0.045]"}`}>
      {marks.map((position, index) => (
        <PawPrint key={index} focusable="false" fill="currentColor" strokeWidth={0} className={`absolute ${position}`} />
      ))}
    </div>
  );
}

// Reuse the existing home product card with the real catalogue fields.
function ProductCard({ product }: { product: Product }) {
  const { isFavorite, isPending, loading: wishlistLoading, toggleFavorite } = useWishlist();
  const favorite = isFavorite(product.id);
  const favoritePending = isPending(product.id);
  const [imageFailed, setImageFailed] = useState(false);
  const validImage =
    /^\/(?!\/)/.test(product.image) || /^https?:\/\//i.test(product.image);
  const image = !imageFailed && validImage ? product.image : fallbackImage;
  const hasPromo = product.promoPrice !== null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Image : ratio fixe */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link
          href={`/boutique/${product.id}`}
          aria-label={`Voir ${product.name}`}
          className="relative block h-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#65D900]"
        >
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            unoptimized={/^https?:\/\//i.test(image)}
            onError={() => setImageFailed(true)}
            className={
              image === fallbackImage
                ? "object-contain p-6"
                : "object-cover transition duration-500 group-hover:scale-110"
            }
          />
        </Link>

        {hasPromo && (
          <span className="absolute left-2 top-2 rounded-full bg-[#65D900] px-2 py-0.5 text-[9px] font-extrabold text-black sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[10px]">
            PROMO
          </span>
        )}

        <button
          type="button"
          onClick={() => void toggleFavorite(product.id)}
          disabled={wishlistLoading || favoritePending}
          aria-label={favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={favorite}
          aria-busy={wishlistLoading || favoritePending}
          title={wishlistLoading || favoritePending ? "Chargement des favoris…" : favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow transition hover:bg-[#65D900] disabled:cursor-wait disabled:opacity-60 sm:right-3 sm:top-3 sm:h-9 sm:w-9"
        >
          <Heart size={15} className={`sm:hidden ${favorite ? "fill-red-500 text-red-500" : ""}`} />
          <Heart size={17} className={`hidden sm:block ${favorite ? "fill-red-500 text-red-500" : ""}`} />
        </button>
      </div>

      {/* Détails : colonne flex, bouton poussé en bas */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-4">
        {/* Catégorie + animal : 1 ligne max */}
        <p className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wider text-[#55B900] sm:text-xs">
          {productCategories[product.targetAnimal]?.find(
            category => category.id === product.category
          )?.name ?? product.category}{" "}
          • {animals[product.targetAnimal]}
        </p>

        {/* Nom : 2 lignes réservées */}
        <h3 className="mt-1.5 line-clamp-2 h-9 text-xs font-bold leading-[1.125rem] text-gray-900 sm:mt-2 sm:h-[3.25rem] sm:text-base sm:leading-[1.625rem]">
          <Link
            href={`/boutique/${product.id}`}
            className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-[#65D900]"
          >
            {product.name}
          </Link>
        </h3>

        {/* Prix : hauteur fixe, prix barré visible si promo */}
        <div className="mt-2 flex h-6 flex-nowrap items-center gap-1.5 overflow-hidden sm:mt-3 sm:h-7 sm:gap-2">
          <span className="shrink-0 whitespace-nowrap text-sm font-extrabold text-gray-900 sm:text-base">
            {formatPrice(product.promoPrice ?? product.price)}
          </span>

          {hasPromo ? (
            <span className="truncate text-[10px] text-gray-400 line-through sm:text-xs">
              {formatPrice(product.price)}
            </span>
          ) : (
            <span aria-hidden="true" className="invisible text-[10px] sm:text-xs">
              &nbsp;
            </span>
          )}
        </div>

        {/* ✅ Espace garanti entre prix et bouton */}
        <div className="mt-auto pt-4 sm:pt-5">
          <Link
            href={`/boutique/${product.id}`}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#65D900] px-2 py-2.5 text-[11px] font-bold text-black transition hover:bg-[#55BD00] sm:gap-2 sm:rounded-xl sm:py-3 sm:text-sm"
          >
            <ShoppingCart size={14} className="sm:hidden" />
            <ShoppingCart size={16} className="hidden sm:block" />
            Découvrir le produit
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [retry, setRetry] = useState(0);
  const [featured, setFeatured] = useState<{ key: number; products: Product[]; error: string }>({ key: -1, products: [], error: "" });
  const loading = featured.key !== retry;

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/products?sort=newest&pageSize=4&page=1", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossible de charger les produits.");
        if (!Array.isArray(data.products)) throw new Error("Réponse du serveur incorrecte.");
        if (!controller.signal.aborted) setFeatured({ key: retry, products: data.products, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setFeatured({
          key: retry, products: [],
          error: error instanceof TypeError ? "Impossible de contacter le serveur." :
            error instanceof SyntaxError ? "Réponse du serveur incorrecte." :
              error instanceof Error ? error.message : "Impossible de charger les produits.",
        });
      }
    })();
    return () => controller.abort();
  }, [retry]);

  return (
    <main className="overflow-hidden bg-white">

      {/* ================= HERO ================= */}

      <section className="relative min-h-[570px] overflow-hidden bg-[#010101] sm:min-h-[650px]">

        {/* Background decoration */}
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#65D900]/10 blur-[100px]" />
        <PawDecorations dark marks={[
          "right-5 top-7 h-16 w-16 rotate-[22deg] sm:right-[8%] sm:h-24 sm:w-24",
          "bottom-5 left-4 hidden h-20 w-20 -rotate-[18deg] lg:block",
        ]} />

        <div className="relative z-10 mx-auto grid min-h-[570px] max-w-7xl items-center gap-8 px-5 py-14 sm:min-h-[650px] sm:py-20 lg:grid-cols-2 lg:px-8">

          {/* Hero text */}
          <div className="z-10 max-w-xl">

            {/* Titre animé mot par mot */}
            <motion.h1
              className="text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl lg:text-6xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Première ligne : "Parce qu'ils font partie de" */}
              <span className="block">
                {["Parce", "qu'ils", "font", "partie", "de"].map((word) => (
                  <motion.span
                    key={word}
                    variants={wordVariants}
                    className="mr-[0.28em] inline-block will-change-[transform,filter,opacity]"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>

              {/* Deuxième ligne : "notre famille." en vert avec halo */}
              <span className="mt-2 block">
                {["notre", "famille."].map((word) => (
                  <motion.span
                    key={word}
                    variants={accentWordVariants}
                    className="mr-[0.28em] inline-block text-[#65D900] will-change-[transform,filter,opacity,text-shadow]"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
            </motion.h1>

            {/* Trait vert dessiné sous le slogan */}
            <motion.svg
              viewBox="0 0 220 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mt-4 h-3 w-[140px] sm:w-[180px] lg:w-[220px]"
              initial="hidden"
              animate="visible"
              aria-hidden="true"
            >
              <motion.path
                d="M2 8 Q 60 2, 110 7 T 218 5"
                stroke="#65D900"
                strokeWidth="3"
                strokeLinecap="round"
                variants={underlineVariants}
              />
            </motion.svg>

            <motion.p
              className="mt-6 max-w-md text-sm leading-7 text-gray-400 sm:text-base"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.9,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              Découvrez notre sélection d’alimentation, accessoires
              et produits essentiels pour prendre soin de vos animaux
              avec amour.
            </motion.p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/boutique"
                className="group flex items-center gap-3 rounded-full bg-[#65D900] px-7 py-4 text-sm font-bold text-black transition hover:bg-[#55BD00]"
              >
                Découvrir la boutique
                <ArrowRight
                  size={19}
                  className="transition group-hover:translate-x-1"
                />
              </Link>

              {/* WhatsApp */}
              <a
                href="https://wa.me/21696766945?text=Bonjour%20Animalerie%20Khalil%2C%20je%20souhaite%20vous%20contacter."
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 rounded-full border border-white/30 px-7 py-4 text-sm font-semibold text-white transition hover:border-[#65D900] hover:text-[#65D900]"
              >
                {/* Icône WhatsApp */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5 text-[#65D900]"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                </svg>
                Nous contacter sur WhatsApp
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-2xl font-extrabold text-[#65D900]">
                  100%
                </p>
                <p className="text-xs text-gray-400">
                  Amour des animaux
                </p>
              </div>

              <div className="h-10 w-px bg-white/20" />

              <div>
                <p className="text-2xl font-extrabold text-white">
                  +100
                </p>
                <p className="text-xs text-gray-400">
                  Produits disponibles
                </p>
              </div>

              <div className="h-10 w-px bg-white/20" />

              <div>
                <p className="text-2xl font-extrabold text-white">
                  7j/7
                </p>
                <p className="text-xs text-gray-400">
                  Pour vos compagnons
                </p>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative mx-auto w-full max-w-[600px] lg:ml-auto">

            {/* Halo vert doux derrière */}
            <div className="absolute -inset-8 rounded-full bg-[#65D900]/20 blur-[90px]" />

            {/* Image boutique légèrement inclinée, effet carte postale */}
            <div className="relative -rotate-2 transition duration-500 hover:rotate-0">
              <div className="overflow-hidden rounded-[28px] border-[6px] border-white bg-white shadow-2xl shadow-black/50">
                <Image
                  src="/boutique.png"
                  alt="Bienvenue dans la boutique physique Animalerie Khalil"
                  width={1648}
                  height={928}
                  priority
                  sizes="(max-width: 1024px) 90vw, 600px"
                  className="block h-auto w-full rounded-[22px]"
                />
              </div>

              {/* Petit ruban / étiquette "Notre boutique" en haut à droite */}
              <div className="absolute -right-3 -top-3 rotate-6 rounded-full bg-[#65D900] px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider text-black shadow-lg">
                Notre boutique
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ================= CATEGORIES ================= */}

      <section className="relative overflow-hidden bg-[#F8F9F7] px-5 py-16 sm:py-20 lg:px-8">
        <PawDecorations marks={[
          "right-[14%] top-3 hidden h-14 w-14 rotate-[28deg] sm:block",
          "-right-3 bottom-2 h-20 w-20 -rotate-[16deg] sm:right-4 sm:h-28 sm:w-28",
          "bottom-4 left-[7%] h-10 w-10 rotate-[18deg]",
        ]} />

        <div className="relative z-10 mx-auto max-w-7xl">

          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                Explorez nos univers
              </p>
              <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                Nos catégories
                <span className="text-[#65D900]">.</span>
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Tout ce dont vos compagnons ont besoin, au même endroit.
              </p>
            </div>

            <Link
              href="/category"
              className="flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-[#55B900]"
            >
              Toutes les catégories
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="group relative overflow-hidden rounded-2xl bg-[#111111]"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition duration-700 group-hover:scale-110"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <h3 className="text-lg font-extrabold text-white sm:text-2xl">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-[11px] text-gray-300 sm:text-sm">
                      {category.description}
                    </p>

                    <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#65D900] text-black transition group-hover:translate-x-2">
                      <ArrowRight size={18} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FEATURED PRODUCTS ================= */}

      <section className="relative overflow-hidden bg-white px-5 py-16 sm:py-20 lg:px-8">
        <PawDecorations marks={[
          "right-3 top-4 h-14 w-14 rotate-[18deg] sm:right-[4%] sm:h-20 sm:w-20",
          "bottom-3 left-[3%] hidden h-14 w-14 -rotate-[26deg] sm:block",
          "bottom-4 right-[10%] h-10 w-10 rotate-[24deg]",
        ]} />

        <div className="relative z-10 mx-auto max-w-7xl">

          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                Les dernières arrivées
              </p>
              <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                Nos nouveautés
                <span className="text-[#65D900]">.</span>
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Découvrez les derniers produits ajoutés à notre boutique.
              </p>
            </div>

            <Link
              href="/boutique"
              className="flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-[#55B900]"
            >
              Voir tous les produits
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

            {loading ? (
              <p role="status" className="col-span-full py-12 text-center text-sm text-gray-500">Chargement des produits…</p>
            ) : featured.error ? (
              <div role="alert" className="col-span-full py-12 text-center">
                <p className="text-sm text-red-700">{featured.error}</p>
                <button type="button" onClick={() => setRetry(value => value + 1)}
                  className="mt-4 rounded-xl bg-[#65D900] px-5 py-3 text-sm font-bold text-black hover:bg-[#55BD00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">Réessayer</button>
              </div>
            ) : featured.products.length === 0 ? (
              <p className="col-span-full py-12 text-center text-sm text-gray-500">Aucun produit disponible pour le moment.</p>
            ) : featured.products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* ================= PROMO BANNER ================= */}

      <section className="px-5 pb-16 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#010101]">

          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#65D900]/20 blur-[80px]" />
          <PawDecorations dark marks={[
            "left-[44%] top-5 hidden h-16 w-16 rotate-[32deg] lg:block",
            "bottom-4 left-[6%] hidden h-12 w-12 -rotate-[20deg] sm:block",
          ]} />

          <div className="relative z-10 grid items-center gap-8 px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-2">

            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#65D900] px-4 py-2 text-xs font-extrabold text-black">
                <Gift size={15} />
                OFFRES SPÉCIALES
              </span>

              <h2 className="mt-6 text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
                Faites plaisir à vos compagnons
                <span className="text-[#65D900]"> !</span>
              </h2>

              <p className="mt-4 max-w-md text-sm leading-7 text-gray-400">
                Découvrez nos promotions et trouvez les meilleurs
                produits pour leur bien-être.
              </p>

              <Link
                href="/boutique?promotion=true"
                className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#65D900] px-7 py-4 text-sm font-bold text-black transition hover:bg-[#55BD00]"
              >
                Voir les promotions
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="relative mx-auto aspect-[5/4] w-full max-w-md overflow-hidden rounded-2xl">
              <Image
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900"
                alt="Deux chiens heureux"
                fill
                sizes="(max-width: 1024px) 90vw, 450px"
                className="object-cover"
              />
            </div>

          </div>
        </div>
      </section>

      {/* ================= WHY CHOOSE US ================= */}

      <section className="relative overflow-hidden bg-[#F8F9F7] px-5 py-16 sm:py-20 lg:px-8">
        <PawDecorations marks={[
          "left-4 top-6 h-12 w-12 -rotate-[24deg] sm:left-[5%] sm:h-16 sm:w-16",
          "bottom-1 right-[5%] h-20 w-20 rotate-[20deg] sm:h-24 sm:w-24",
          "right-[7%] top-8 hidden h-12 w-12 -rotate-[14deg] md:block",
        ]} />

        <div className="relative z-10 mx-auto max-w-7xl">

          <div className="mx-auto mb-12 max-w-xl text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
              Notre engagement
            </p>

            <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
              Pourquoi choisir
              <span className="text-[#65D900]"> Khalil ?</span>
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-500">
              Parce que vos animaux méritent toute notre attention,
              nous faisons de leur bien-être notre priorité.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {advantages.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-100 bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#65D900]/15 text-[#4FA900]">
                    <Icon size={27} />
                  </div>

                  <h3 className="text-base font-extrabold text-gray-900">
                    {item.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-500">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

  

    </main>
  );
}
