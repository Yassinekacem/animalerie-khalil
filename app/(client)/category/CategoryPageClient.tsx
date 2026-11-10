
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Dog,
  Cat,
  Bird,
  Fish,
  type LucideIcon,
} from "lucide-react";

// ================= TYPES =================

type Animal = "chien" | "chat" | "oiseaux" | "poissons";

type Category = {
  name: string;
  type: string;
  description: string;
  image: string;
};

type AnimalOption = {
  id: Animal;
  name: string;
  icon: LucideIcon;
};

// ================= ANIMALS =================

const animals: AnimalOption[] = [
  { id: "chien", name: "Chiens", icon: Dog },
  { id: "chat", name: "Chats", icon: Cat },
  { id: "oiseaux", name: "Oiseaux", icon: Bird },
  { id: "poissons", name: "Poissons", icon: Fish },
];

// ================= CATEGORIES =================

const categoriesByAnimal: Record<Animal, Category[]> = {
  chien: [
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Des aliments adaptés aux besoins nutritionnels de votre chien.",
      image: "/images/chien/chien-alimentation.jpg",
    },
    {
      name: "Colliers et laisses",
      type: "colliers-laisses",
      description: "Des colliers et des laisses pour accompagner vos promenades.",
      image: "/images/chien/chien-colliers-laisses.jpg",
    },
    {
      name: "Hygiène et soins",
      type: "hygiene-soins",
      description: "Tout le nécessaire pour prendre soin de votre compagnon.",
      image: "/images/chien/chien-hygiene-soins.jpg",
    },
    {
      name: "Jouets et divertissement",
      type: "jouets-divertissement",
      description: "Des jouets pour stimuler et divertir votre chien.",
      image: "/images/chien/chien-jouets.jpg",
    },
    {
      name: "Transport",
      type: "transport",
      description: "Des solutions pratiques pour transporter votre chien en toute sécurité.",
      image: "/images/chien/chien-transport.jpg",
    },
    {
      name: "Couchage et niches",
      type: "couchage-niches",
      description: "Des espaces confortables pour le repos de votre chien.",
      image: "/images/chien/chien-couchage.png",
    },
    {
      name: "Gamelles et distributeurs",
      type: "gamelles-distributeurs",
      description: "Des équipements pratiques pour les repas et l'hydratation.",
      image: "/images/chien/chien-gamelles.webp",
    },
  ],

  chat: [
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Une sélection d'aliments adaptés aux besoins de votre chat.",
      image: "/images/chat/alimentation_chat.avif",
    },
    {
      name: "Colliers",
      type: "colliers-harnais",
      description: "Des colliers et harnais adaptés au confort de votre chat.",
      image: "/images/chat/chat-colliers.jpg",
    },
    {
      name: "Hygiène et soins",
      type: "hygiene-soins",
      description: "Les essentiels pour l'hygiène et le bien-être de votre chat.",
      image: "/images/chat/chat-hygiene-soins.webp",
    },
    {
      name: "Litières et propreté",
      type: "litieres-proprete",
      description: "Tout pour maintenir un environnement propre et agréable.",
      image: "/images/chat/chat-litieres.webp",
    },
    {
      name: "Jouets et divertissement",
      type: "jouets-divertissement",
      description: "Des jeux pour stimuler la curiosité et l'activité de votre chat.",
      image: "/images/chat/chat-jouets.jpg",
    },
    {
      name: "Transport",
      type: "transport",
      description: "Des accessoires pour transporter votre chat facilement.",
      image: "/images/chat/chat-transport.webp",
    },
    {
      name: "Couchage",
      type: "couchage",
      description: "Des couchages confortables pour les moments de repos.",
      image: "/images/chat/chat-couchage.jpg",
    },
    {
      name: "Gamelles et distributeurs",
      type: "gamelles-distributeurs",
      description: "Des gamelles et distributeurs pour ses repas quotidiens.",
      image: "/images/chat/chat-gamelles.jpg",
    },
  ],

  oiseaux: [
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Des aliments adaptés aux besoins de vos oiseaux.",
      image: "/images/oiseaux/oiseaux-alimentation.webp",
    },
    {
      name: "Cages et accessoires",
      type: "cages-accessoires",
      description: "Des cages et accessoires pour aménager leur espace de vie.",
      image: "/images/oiseaux/accessoires-oiseaux.jpg",
    },
    {
      name: "Santé et soins",
      type: "sante-soins",
      description: "Les produits essentiels pour prendre soin de vos oiseaux.",
      image: "/images/oiseaux/oiseaux-sante-soins.webp",
    },
  ],

  poissons: [
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Une alimentation adaptée aux différentes espèces de poissons.",
      image: "/images/poissons/poissons-alimentation.webp",
    },
    {
      name: "Aquariums",
      type: "aquariums",
      description: "Découvrez nos solutions pour créer un espace aquatique.",
      image: "/images/poissons/poissons-aquariums.jpg",
    },
    {
      name: "Équipements",
      type: "equipements",
      description: "Les équipements indispensables pour votre aquarium.",
      image: "/images/poissons/poissons-equipements.jpg",
    },
    {
      name: "Décorations",
      type: "decorations",
      description: "Des décorations pour aménager un aquarium à votre goût.",
      image: "/images/poissons/poissons-decorations.jpg",
    },
  ],
};

// ================= HELPERS =================

function isAnimal(value: string | null): value is Animal {
  return value !== null && animals.some((animal) => animal.id === value);
}

// ================= ANIMATIONS =================

const containerVariants: Variants = {
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
        ease: "easeOut",
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
      ease: "easeOut",
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
      ease: "easeOut",
    },
  },
};

// ================= CATEGORY PAGE =================

export default function CategoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cibleParam = searchParams.get("cible");

  const selectedAnimal: Animal = isAnimal(cibleParam)
    ? cibleParam
    : "chien";

  const categories = categoriesByAnimal[selectedAnimal];

  // Change animal and update URL
  const handleAnimalChange = (animal: Animal) => {
    router.push(`/category?cible=${animal}`, {
      scroll: false,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white">

      {/* ================= HERO SECTION ================= */}

      <section className="relative overflow-hidden bg-[#010101] px-5 py-14 sm:py-20 lg:px-8">
        <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[#65D900]/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl">

            <motion.h1
              className="text-3xl font-extrabold leading-[1.15] text-white sm:text-5xl"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <span className="block">
                {["Explorez", "nos"].map((word) => (
                  <motion.span
                    key={word}
                    variants={wordVariants}
                    className="mr-[0.28em] inline-block"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>

              <span className="mt-2 block">
                <motion.span
                  variants={accentWordVariants}
                  className="inline-block text-[#65D900]"
                >
                  catégories.
                </motion.span>
              </span>
            </motion.h1>

            {/* Animated green underline */}
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
              className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.9,
                ease: "easeOut",
              }}
            >
              Découvrez nos univers et trouvez les catégories adaptées à vos
              compagnons.
            </motion.p>

          </div>
        </div>
      </section>

      {/* ================= ANIMAL SELECTOR ================= */}

      <section className="bg-white px-5 py-10 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-7xl">

          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
              Choisissez votre compagnon
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
            {animals.map((animal) => {
              const isSelected = selectedAnimal === animal.id;
              const Icon = animal.icon;

              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => handleAnimalChange(animal.id)}
                  aria-pressed={isSelected}
                  className={`flex items-center justify-center gap-3 rounded-2xl border px-4 py-5 text-sm font-extrabold transition duration-300 sm:py-6 sm:text-base ${
                    isSelected
                      ? "border-[#65D900] bg-[#65D900] text-black shadow-lg shadow-[#65D900]/20"
                      : "border-gray-100 bg-[#F8F9F7] text-gray-800 hover:border-[#65D900] hover:bg-[#65D900]/10"
                  }`}
                >
                  <Icon size={24} strokeWidth={2} aria-hidden="true" />
                  {animal.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CATEGORY CARDS ================= */}

      <section className="bg-[#F8F9F7] px-5 py-12 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">

          {/* Section heading */}
          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                Explorez nos univers
              </p>

              <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                Catégories pour{" "}
                <span className="text-[#65D900]">
                  {animals.find((animal) => animal.id === selectedAnimal)?.name}
                </span>
              </h2>

              <p className="mt-3 text-sm text-gray-500">
                Retrouvez les produits adaptés à votre compagnon.
              </p>
            </div>

            <span className="text-sm font-semibold text-gray-500">
              {categories.length} catégories disponibles
            </span>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => (
              <Link
                key={category.type}
                href={`/boutique?cible=${selectedAnimal}&type=${category.type}`}
                className="group relative overflow-hidden rounded-2xl bg-[#111111]"
              >
                <div className="relative aspect-[16/10] overflow-hidden sm:aspect-[5/3]">

                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-110"
                  />

                  {/* Image overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                  {/* Category content */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">

                    <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
                      {category.name}
                    </h3>

                    <p className="mt-2 max-w-sm text-xs leading-6 text-gray-300 sm:text-sm">
                      {category.description}
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#65D900] text-black transition group-hover:translate-x-2">
                        <ArrowRight size={19} />
                      </span>

                      <span className="text-sm font-bold text-white transition group-hover:text-[#65D900]">
                        Découvrir la catégorie
                      </span>
                    </div>

                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>
    </main>
  );
}
