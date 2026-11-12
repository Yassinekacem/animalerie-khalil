import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  Package,
  Plus,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react";

const statistics = [
  { label: "Clients", value: "248", detail: "Clients inscrits", icon: Users },
  { label: "Produits", value: "126", detail: "Références au catalogue", icon: Package },
  { label: "Commandes", value: "384", detail: "Commandes au total", icon: ShoppingBag },
  { label: "Commandes en attente", value: "12", detail: "À prendre en charge", icon: Clock3 },
];

const orders = [
  { id: "CMD-0384", client: "Amira Ben Ali", date: "12/11/2026", total: "125,000 TND", status: "En attente" },
  { id: "CMD-0383", client: "Mohamed Trabelsi", date: "12/11/2026", total: "78,500 TND", status: "En préparation" },
  { id: "CMD-0382", client: "Inès Mansour", date: "11/11/2026", total: "214,000 TND", status: "Livrée" },
  { id: "CMD-0381", client: "Youssef Gharbi", date: "11/11/2026", total: "42,900 TND", status: "Livrée" },
  { id: "CMD-0380", client: "Sarra Ayari", date: "10/11/2026", total: "96,000 TND", status: "En attente" },
];

const statusStyles: Record<string, string> = {
  "En attente": "bg-amber-50 text-amber-800",
  "En préparation": "bg-blue-50 text-blue-800",
  "Livrée": "bg-[#65D900]/15 text-[#306900]",
};

const lowStockProducts = [
  { name: "Croquettes chat stérilisé", category: "Alimentation · Sac de 2 kg", stock: 3 },
  { name: "Litière agglomérante", category: "Hygiène · Sac de 10 L", stock: 2 },
  { name: "Jouet à mâcher pour chien", category: "Accessoires · Taille M", stock: 4 },
  { name: "Graines pour perruches", category: "Alimentation · Sachet de 1 kg", stock: 1 },
];

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101] sm:space-y-8">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
            Animalerie Khalil
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tableau de bord</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Bienvenue ! Retrouvez un aperçu de votre boutique et des dernières commandes.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row xl:shrink-0">
          <Link
            href="/admin/produits/ajouter"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#65D900] px-4 py-3 text-sm font-semibold transition hover:bg-[#58bf00] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010101]"
          >
            <Plus size={18} aria-hidden="true" />
            Ajouter un produit
          </Link>
          <Link
            href="/admin/commandes"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#010101] px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#010101]"
          >
            Voir les commandes
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <p className="text-xs text-gray-500">Aperçu de démonstration · Données fictives</p>

      <section aria-label="Chiffres clés" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {statistics.map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-gray-600">{label}</h2>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#010101] text-[#65D900]">
                <Icon size={21} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid min-w-0 grid-cols-1 items-start gap-6 2xl:grid-cols-3">
        <section aria-labelledby="recent-orders" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm 2xl:col-span-2">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <h2 id="recent-orders" className="text-lg font-bold">Dernières commandes</h2>
            <p className="mt-1 text-sm text-gray-500">Les 5 commandes les plus récentes de la boutique.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Dernières commandes fictives : référence, client, date, montant en TND et statut.</caption>
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th scope="col" className="px-5 py-4 font-semibold">Commande</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Client</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Date</th>
                  <th scope="col" className="px-5 py-4 text-right font-semibold">Montant</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <th scope="row" className="whitespace-nowrap px-5 py-5 font-semibold">{order.id}</th>
                    <td className="whitespace-nowrap px-5 py-5 text-gray-600">{order.client}</td>
                    <td className="px-5 py-5 text-gray-500">{order.date}</td>
                    <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums">{order.total}</td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${statusStyles[order.status]}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="low-stock" className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <TriangleAlert size={20} className="shrink-0 text-amber-600" aria-hidden="true" />
              <h2 id="low-stock" className="text-lg font-bold">Produits en faible stock</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">Moins de 5 unités disponibles.</p>
          </div>
          <ul className="divide-y divide-gray-100 px-5 sm:px-6">
            {lowStockProducts.map((product) => (
              <li key={product.name} className="flex items-center gap-3 py-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                  <Package size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{product.category}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
                  {product.stock} {product.stock === 1 ? "unité" : "unités"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
