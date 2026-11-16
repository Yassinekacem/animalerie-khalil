import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const instant = false;

async function GuestOnly({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/compte/profil");
  return children;
}

export default function RegistrationLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#F8F9F7] p-6"><p role="status" className="text-sm text-gray-600">Vérification de votre session…</p></main>}>
    <GuestOnly>{children}</GuestOnly>
  </Suspense>;
}
