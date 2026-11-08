"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  PawPrint,
  Dog,
  Cat,
  Bird,
  Fish,
  type LucideIcon,
} from "lucide-react";

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

const animals: AnimalOption[] = [
  { id: "chien", name: "Chiens", icon: Dog },
  { id: "chat", name: "Chats", icon: Cat },
  { id: "oiseaux", name: "Oiseaux", icon: Bird },
  { id: "poissons", name: "Poissons", icon: Fish },
];

const categoriesByAnimal: Record<Animal, Category[]> = {
  chien: [
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Une alimentation adaptée à votre chien.",
      image:
        "/images/alimentation_chien.jpg",
    },
    {
      name: "Accessoires",
      type: "accessoire",
      description: "Tout pour le confort et le plaisir de votre compagnon.",
      image:
        "/images/accessoires-chien.webp",
    },
  ],

chat: [
  {
    name: "Alimentation",
    type: "alimentation",
    description: "Des produits pour bien nourrir votre chat.",
    image: "/images/alimentation_chat.avif",
  },
  {
    name: "Accessoires",
    type: "accessoire",
    description: "Des accessoires pour son confort et ses loisirs.",
    image: "/images/accessoires-chat.avif",
  },
],

  oiseaux: [ 
     {
      name: "Oiseaux",
      type: "oiseaux",
      description: "Découvrez notre univers dédié aux oiseaux.",
      image:
        "/images/oiseaux.webp",
    },
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Une sélection d'aliments pour vos oiseaux.",
      image:
        "/images/alimentation_oiseaux.webp",
    },
    {
      name: "Accessoires",
      type: "accessoire",
      description: "Les accessoires indispensables pour vos oiseaux.",
      image:
        "/images/accessoires-oiseaux.jpg",
    }
   
  ],

  poissons: [ 
        {
      name: "Poissons",
      type: "poissons",
      description: "Découvrez notre univers aquatique.",
      image:
        "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=700",
    },
    {
      name: "Alimentation",
      type: "alimentation",
      description: "Des aliments adaptés à vos poissons.",
      image:
      "/images/alimentation_poissons.webp",
    },
    {
      name: "Accessoires",
      type: "accessoire",
      description: "Tout pour aménager et entretenir votre aquarium.",
      image:
        "/images/accessoires-poissons.jpg",
    },

  ],
};

function isAnimal(value: string | null): value is Animal {
  return (
    value !== null &&
    animals.some((animal) => animal.id === value)
  );
}

export default function CategoryPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cibleParam = searchParams.get("cible");

  const selectedAnimal: Animal = isAnimal(cibleParam)
    ? cibleParam
    : "chien";

  const categories = categoriesByAnimal[selectedAnimal];

  const handleAnimalChange = (animal: Animal) => {
    router.push(`/category?cible=${animal}`, {
      scroll: false,
    });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-white"> 
    <section className="relative overflow-hidden bg-[#010101] px-5 py-14 sm:py-20 lg:px-8">
        <div className="absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full bg-[#65D900]/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-2xl">


            <h1 className="text-3xl font-extrabold text-white sm:text-5xl">
              Explorez nos 
              <span className="text-[#65D900]"> catégories.</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">
   Découvrez nos univers et trouvez les catégories adaptées à vos compagnons.
            </p>
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

          {/* Animal buttons */}

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
                  <Icon
                    size={24}
                    strokeWidth={2}
                    aria-hidden="true"
                  />

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

          <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[3px] text-[#55B900]">
                Explorez nos univers
              </p>

              <h2 className="text-3xl font-extrabold text-[#111111] sm:text-4xl">
                Catégories pour{" "}
                <span className="text-[#65D900]">
                  {
                    animals.find(
                      (animal) => animal.id === selectedAnimal
                    )?.name
                  }
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
            {categories.map((category) => (
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

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

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
