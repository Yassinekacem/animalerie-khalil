// app/(client)/compte/profil/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import ProfileClient from "./ProfileClient";

export const metadata = { title: "Mon profil | Animalerie Khalil" };

// Opt-out de la validation instant-navigation pour ce segment
export const instant = false;

export default async function ProfilePage() {
  if (!await getCurrentUser()) redirect("/connexion?next=/compte/profil");
  return <ProfileClient />;
}