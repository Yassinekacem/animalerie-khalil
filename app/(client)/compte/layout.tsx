import type { ReactNode } from "react";
import AccountArea from "@/components/AccountArea";

export const metadata = { title: "Mon compte | Animalerie Khalil" };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountArea>{children}</AccountArea>;
}