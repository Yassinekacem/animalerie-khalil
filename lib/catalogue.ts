export type Animal = "chien" | "chat" | "oiseaux" | "poissons";

export const animals: Record<Animal, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseaux: "Oiseaux",
  poissons: "Poissons",
};

export const categories: Record<Animal, { id: string; name: string }[]> = {
  chien: [
    { id: "alimentation", name: "Alimentation" },
    { id: "colliers-laisses", name: "Colliers et laisses" },
    { id: "hygiene-soins", name: "Hygiène et soins" },
    { id: "jouets-divertissement", name: "Jouets et divertissement" },
    { id: "transport", name: "Transport" },
    { id: "couchage-niches", name: "Couchage et niches" },
    { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  chat: [
    { id: "alimentation", name: "Alimentation" },
    { id: "colliers-harnais", name: "Colliers" },
    { id: "hygiene-soins", name: "Hygiène et soins" },
    { id: "litieres-proprete", name: "Litières et propreté" },
    { id: "jouets-divertissement", name: "Jouets et divertissement" },
    { id: "transport", name: "Transport" },
    { id: "couchage", name: "Couchage" },
    { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  oiseaux: [
    { id: "alimentation", name: "Alimentation" },
    { id: "cages-accessoires", name: "Cages et accessoires" },
    { id: "sante-soins", name: "Santé et soins" },
  ],
  poissons: [
    { id: "alimentation", name: "Alimentation" },
    { id: "aquariums", name: "Aquariums" },
    { id: "equipements", name: "Équipements" },
    { id: "decorations", name: "Décorations" },
  ],
};

export const formatPrice = (price: string) =>
  `${Number(price).toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} TND`;

export const fallbackImage = "/logo-animalerie.png";
