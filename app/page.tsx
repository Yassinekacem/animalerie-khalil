
"use client";

import Image from "next/image";
import Link from "next/link";
import { 
  Hand,
  ArrowRight,
  ShoppingCart,
  Heart,
  Star,
  Truck,
  ShieldCheck,
  Headphones,
  Gift,
  PawPrint,
  CheckCircle2,
  Mail,
} from "lucide-react";

// ================= DATA =================

const categories = [
  {
    name: "Chiens",
    description: "Tout pour votre fidèle compagnon",
    image:
      "https://images.unsplash.com/photo-1552053831-71594a27632d?w=700",
    href: "/products",
  },
  {
    name: "Chats",
    description: "Le bonheur de vos petits félins",
    image:
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=700",
    href: "/products",
  },
  {
    name: "Oiseaux",
    description: "Pour des compagnons pleins de vie",
    image:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=700",
    href: "/products",
  },
  {
    name: "Accessoires",
    description: "Le confort au quotidien",
    image:
      "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=700",
    href: "/products",
  },
];

const featuredProducts = [
  {
    id: 1,
    name: "Croquettes Premium pour chien",
    category: "Alimentation • Chiens",
    price: 89,
    oldPrice: 105,
    rating: 4.8,
    reviews: 124,
    image:
      "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=700",
    badge: "PROMO",
  },
  {
    id: 2,
    name: "Jouet interactif pour chat",
    category: "Jouets • Chats",
    price: 32,
    rating: 4.9,
    reviews: 56,
    image:
      "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=700",
    badge: "POPULAIRE",
  },
  {
    id: 3,
    name: "Accessoires pour animaux",
    category: "Accessoires",
    price: 45,
    rating: 4.7,
    reviews: 78,
    image:
      "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=700",
  },
  {
    id: 4,
    name: "Nourriture pour oiseaux",
    category: "Alimentation • Oiseaux",
    price: 25,
    rating: 4.6,
    reviews: 34,
    image:
      "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=700",
  },
];

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

// ================= HOME PAGE =================

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white">

      {/* ================= HERO ================= */}

      <section className="relative min-h-[570px] overflow-hidden bg-[#010101] sm:min-h-[650px]">

        {/* Background decoration */}
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[#65D900]/10 blur-[100px]" />

        <div className="relative mx-auto grid min-h-[570px] max-w-7xl items-center gap-8 px-5 py-14 sm:min-h-[650px] sm:py-20 lg:grid-cols-2 lg:px-8">

          {/* Hero text */}
          <div className="z-10 max-w-xl">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#65D900]/30 bg-[#65D900]/10 px-4 py-2">
              <PawPrint size={16} className="text-[#65D900]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#65D900]">
                Bienvenue chez Animalerie Khalil
              </span>
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.15] text-white sm:text-5xl lg:text-6xl">
              Parce qu'ils font partie de
              <span className="mt-2 block text-[#65D900]">
                notre famille.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-gray-400 sm:text-base">
              Découvrez notre sélection d'alimentation, accessoires
              et produits essentiels pour prendre soin de vos animaux
              avec amour.
            </p>

            {/* Buttons */}
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="group flex items-center gap-3 rounded-full bg-[#65D900] px-7 py-4 text-sm font-bold text-black transition hover:bg-[#55BD00]"
              >
                Découvrir la boutique
                <ArrowRight
                  size={19}
                  className="transition group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="/contact"
                className="rounded-full border border-white/30 px-7 py-4 text-sm font-semibold text-white transition hover:border-[#65D900] hover:text-[#65D900]"
              >
                Nous contacter
              </Link>
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

  {/* Green glow */}
  <div className="absolute -inset-6 rounded-[35px] bg-[#65D900]/15 blur-[70px]" />

  {/* Store image */}
  <div className="relative overflow-hidden rounded-3xl border border-[#65D900]/30 bg-[#171717] p-2 shadow-2xl shadow-black/40">

    <Image
      src="/boutique.png"
      alt="Bienvenue dans la boutique physique Animalerie Khalil"
      width={1648}
      height={928}
      priority
      sizes="(max-width: 1024px) 90vw, 600px"
      className="block h-auto w-full rounded-2xl"
    />

  </div>

  {/* Floating label */}
  <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-xl sm:-left-6">

    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#65D900]">
<Hand size={25} className="text-black" />    </div>

    <div>
      <p className="text-sm font-bold text-white">
     Bienvenue chez Animalerie Khalil
      </p>
      <p className="mt-1 text-xs font-medium text-[#65D900]">
       votre animalerie familiale au service du bien-être de vos compagnons !
      </p>
    </div>

  </div>

</div>

        </div>
      </section>

      {/* ================= CATEGORIES ================= */}

      <section className="bg-[#F8F9F7] px-5 py-16 sm:py-20 lg:px-8">

        <div className="mx-auto max-w-7xl">

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
              href="/products"
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

      <section className="bg-white px-5 py-16 sm:py-20 lg:px-8">

        <div className="mx-auto max-w-7xl">

          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                Nos coups de cœur
              </p>
              <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                Produits populaires
                <span className="text-[#65D900]">.</span>
              </h2>
              <p className="mt-3 text-sm text-gray-500">
                Découvrez les produits préférés de nos clients.
              </p>
            </div>

            <Link
              href="/products"
              className="flex items-center gap-2 text-sm font-bold text-gray-900 transition hover:text-[#55B900]"
            >
              Voir tous les produits
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

            {featuredProducts.map((product) => (
              <article
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >

                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />

                  {product.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#65D900] px-3 py-1 text-[10px] font-extrabold text-black">
                      {product.badge}
                    </span>
                  )}

                  <button
                    aria-label="Ajouter aux favoris"
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow transition hover:bg-[#65D900]"
                  >
                    <Heart size={17} />
                  </button>
                </div>

                {/* Details */}
                <div className="p-3 sm:p-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#55B900] sm:text-xs">
                    {product.category}
                  </p>

                  <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-gray-900 sm:text-base">
                    {product.name}
                  </h3>

                  <div className="mt-2 flex items-center gap-1">
                    <Star
                      size={13}
                      className="fill-yellow-400 text-yellow-400"
                    />
                    <span className="text-xs font-semibold text-gray-700">
                      {product.rating}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      ({product.reviews})
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-gray-900">
                      {product.price} DT
                    </span>

                    {product.oldPrice && (
                      <span className="text-xs text-gray-400 line-through">
                        {product.oldPrice} DT
                      </span>
                    )}
                  </div>

                  <Link
                    href="/products"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#65D900] px-2 py-3 text-xs font-bold text-black transition hover:bg-[#55BD00] sm:text-sm"
                  >
                    <ShoppingCart size={16} />
                    Découvrir le produit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROMO BANNER ================= */}

      <section className="px-5 pb-16 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#010101]">

          <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#65D900]/20 blur-[80px]" />

          <div className="relative grid items-center gap-8 px-7 py-12 sm:px-12 sm:py-16 lg:grid-cols-2">

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
                href="/products"
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

      <section className="bg-[#F8F9F7] px-5 py-16 sm:py-20 lg:px-8">

        <div className="mx-auto max-w-7xl">

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

      {/* ================= NEWSLETTER ================= */}

      <section className="bg-white px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-[#101010] px-6 py-12 text-center sm:px-12">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#65D900]">
            <Mail size={26} className="text-black" />
          </div>

          <h2 className="mt-6 text-2xl font-extrabold text-white sm:text-3xl">
            Restez au courant !
          </h2>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-gray-400">
            Inscrivez-vous pour découvrir nos nouveautés, conseils
            et prochaines promotions.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Merci ! La newsletter sera bientôt disponible.");
            }}
            className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="Votre adresse e-mail"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/10 px-5 py-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-[#65D900]"
            />

            <button
              type="submit"
              className="rounded-full bg-[#65D900] px-7 py-4 text-sm font-bold text-black transition hover:bg-[#55BD00]"
            >
              S'inscrire
            </button>
          </form>
        </div>
      </section>

      {/* ================= FOOTER ================= */}

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
              Tout pour le bonheur et le bien-être de vos animaux.
              Merci de faire confiance à Animalerie Khalil !
            </p>

            <div className="mt-5 flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#65D900] hover:text-black"
              >
           
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-[#65D900] hover:text-black"
              >
    
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-5 font-bold text-[#65D900]">
              Navigation
            </h3>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <Link href="/" className="hover:text-[#65D900]">Accueil</Link>
              <Link href="/products" className="hover:text-[#65D900]">Boutique</Link>
              <Link href="/products" className="hover:text-[#65D900]">Nos produits</Link>
              <Link href="/contact" className="hover:text-[#65D900]">Contact</Link>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-5 font-bold text-[#65D900]">
              Nos catégories
            </h3>
            <div className="flex flex-col gap-3 text-sm text-gray-400">
              <Link href="/products" className="hover:text-[#65D900]">Chiens</Link>
              <Link href="/products" className="hover:text-[#65D900]">Chats</Link>
              <Link href="/products" className="hover:text-[#65D900]">Oiseaux</Link>
              <Link href="/products" className="hover:text-[#65D900]">Accessoires</Link>
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

              <Link
                href="/contact"
                className="inline-flex items-center gap-2 font-semibold text-[#65D900] hover:underline"
              >
                Nous contacter
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-7 text-center">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} Animalerie Khalil. Tous droits réservés.
          </p>
        </div>
      </footer>

    </main>
  );
}
