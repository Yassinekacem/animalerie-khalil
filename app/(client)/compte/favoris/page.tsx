import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import FavoritesClient from "./FavoritesClient";

export const metadata = { title: "Mes favoris | Animalerie Khalil" };
export const instant = false;

export default async function FavoritesPage() {
  if (!await getCurrentUser()) redirect("/connexion?next=/compte/favoris");
  return <FavoritesClient />;
}
