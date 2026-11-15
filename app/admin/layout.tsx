
import type { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administration | Animalerie Khalil",
  description: "Espace d'administration d'Animalerie Khalil",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status" className="p-8 text-sm text-gray-600">Vérification de votre accès…</p>}>
    <AuthorizedAdmin>{children}</AuthorizedAdmin>
  </Suspense>;
}

async function AuthorizedAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (user.role !== "ADMIN") redirect("/");
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminSidebar />  

      {/* Main Content */}
      <main className="min-h-screen pt-16 lg:ml-[280px] lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
