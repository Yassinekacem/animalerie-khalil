// app/(client)/compte/commandes/page.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "Mes commandes | Animalerie Khalil" };

export const instant = false;

export default async function CustomerOrdersPage() {
  if (!await getCurrentUser()) redirect("/connexion?next=/compte/commandes");
  return <OrdersClient />;
}