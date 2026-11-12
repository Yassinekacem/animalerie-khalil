"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Eye, ImageOff, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type Animal = "chien" | "chat" | "oiseaux" | "poissons";
type Feature = { name: string; value: string };
type Product = { id: number; name: string; description: string; image: string; animal: Animal; category: string; price: number; stock: number; features: Feature[] };
type Draft = Omit<Product, "id" | "animal" | "price" | "stock"> & { id: number | null; animal: Animal | ""; price: string; stock: string };
const animals: Record<Animal, string> = { chien: "Chien", chat: "Chat", oiseaux: "Oiseaux", poissons: "Poissons" };
// Identifiants et libellés repris de app/(client)/category/CategoryPageClient.tsx.
const categories: Record<Animal, { id: string; name: string }[]> = {
  chien: [
    { id: "alimentation", name: "Alimentation" }, { id: "colliers-laisses", name: "Colliers et laisses" },
    { id: "hygiene-soins", name: "Hygiène et soins" }, { id: "jouets-divertissement", name: "Jouets et divertissement" },
    { id: "transport", name: "Transport" }, { id: "couchage-niches", name: "Couchage et niches" }, { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  chat: [
    { id: "alimentation", name: "Alimentation" }, { id: "colliers-harnais", name: "Colliers" },
    { id: "hygiene-soins", name: "Hygiène et soins" }, { id: "litieres-proprete", name: "Litières et propreté" },
    { id: "jouets-divertissement", name: "Jouets et divertissement" }, { id: "transport", name: "Transport" },
    { id: "couchage", name: "Couchage" }, { id: "gamelles-distributeurs", name: "Gamelles et distributeurs" },
  ],
  oiseaux: [{ id: "alimentation", name: "Alimentation" }, { id: "cages-accessoires", name: "Cages et accessoires" }, { id: "sante-soins", name: "Santé et soins" }],
  poissons: [{ id: "alimentation", name: "Alimentation" }, { id: "aquariums", name: "Aquariums" }, { id: "equipements", name: "Équipements" }, { id: "decorations", name: "Décorations" }],
};
const initialProducts: Product[] = [
  { id: 1, name: "Croquettes chien adulte", description: "Aliment complet pour les chiens adultes.", image: "/images/chien/chien-alimentation.jpg", animal: "chien", category: "alimentation", price: 65000, stock: 24, features: [{ name: "Poids", value: "3 kg" }, { name: "Saveur", value: "Poulet" }] },
  { id: 2, name: "Laisse réglable", description: "Une laisse pratique pour les promenades quotidiennes.", image: "/images/chien/chien-colliers-laisses.jpg", animal: "chien", category: "colliers-laisses", price: 22500, stock: 5, features: [{ name: "Matière", value: "Nylon" }, { name: "Couleur", value: "Noir" }] },
  { id: 3, name: "Balle à mâcher", description: "Jouet pour les moments de jeu de votre chien.", image: "/images/chien/chien-jouets.jpg", animal: "chien", category: "jouets-divertissement", price: 12900, stock: 0, features: [] },
  { id: 4, name: "Croquettes chat stérilisé", description: "Alimentation adaptée aux chats stérilisés.", image: "/images/chat/alimentation_chat.avif", animal: "chat", category: "alimentation", price: 48500, stock: 16, features: [{ name: "Poids", value: "2 kg" }, { name: "Saveur", value: "Saumon" }] },
  { id: 5, name: "Souris en peluche", description: "Un jouet léger pour stimuler la curiosité du chat.", image: "/images/chat/chat-jouets.jpg", animal: "chat", category: "jouets-divertissement", price: 8900, stock: 3, features: [{ name: "Matière", value: "Peluche" }] },
  { id: 6, name: "Gamelle en inox", description: "Gamelle facile à nettoyer pour les repas du chat.", image: "/images/chat/chat-gamelles.jpg", animal: "chat", category: "gamelles-distributeurs", price: 15900, stock: 12, features: [{ name: "Taille", value: "250 ml" }] },
  { id: 7, name: "Graines pour perruches", description: "Mélange de graines pour les perruches.", image: "/images/oiseaux/oiseaux-alimentation.webp", animal: "oiseaux", category: "alimentation", price: 14750, stock: 4, features: [{ name: "Poids", value: "1 kg" }] },
  { id: 8, name: "Mangeoire pour oiseaux", description: "Accessoire pour distribuer les graines dans la cage.", image: "/images/oiseaux/accessoires-oiseaux.jpg", animal: "oiseaux", category: "cages-accessoires", price: 22500, stock: 0, features: [] },
  { id: 9, name: "Flocons pour poissons", description: "Nourriture en flocons pour poissons d’aquarium.", image: "/images/poissons/poissons-alimentation.webp", animal: "poissons", category: "alimentation", price: 12750, stock: 20, features: [{ name: "Poids", value: "100 g" }] },
  { id: 10, name: "Épuisette pour aquarium", description: "Épuisette légère pour l’entretien de votre aquarium.", image: "/images/poissons/poissons-equipements.jpg", animal: "poissons", category: "equipements", price: 9500, stock: 1, features: [{ name: "Taille", value: "10 cm" }] },
];
const inputClass = "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101]";
const money = (price: number) => `${(price / 1000).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
const categoryName = (animal: Animal, id: string) => categories[animal].find((item) => item.id === id)?.name || id;
const stockState = (stock: number) => stock === 0 ? "rupture" : stock <= 5 ? "faible" : "disponible";
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function ProductImage({ src, name }: { src: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
    {src && failedSrc !== src ? (
      // Les URL facultatives sont affichées directement, sans service d’images.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} onError={() => setFailedSrc(src)} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
    ) : <ImageOff size={24} className="text-gray-400" role="img" aria-label="Image indisponible" />}
  </span>;
}

function StockBadge({ stock }: { stock: number }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${stock === 0 ? "bg-red-50 text-red-700" : stock <= 5 ? "bg-amber-50 text-amber-800" : "bg-[#65D900]/15 text-[#306900]"}`}>{stock} · {stock === 0 ? "Rupture" : stock <= 5 ? "Faible stock" : "Disponible"}</span>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby="product-modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6">
    <div className="mb-6 flex items-center justify-between gap-3"><h2 id="product-modal-title" className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Fermer la fenêtre" className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2"><X size={20} aria-hidden="true" /></button></div>
    {children}
  </dialog>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState(initialProducts);
  const nextId = useRef(11);
  const [search, setSearch] = useState("");
  const [animal, setAnimal] = useState<Animal | "">("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [mode, setMode] = useState<"details" | "form" | "delete" | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filterCategories = animal ? categories[animal] : Array.from(new Map(Object.values(categories).flat().map((item) => [item.id, item])).values());
  const visible = products.filter((product) => normalize(product.name).includes(normalize(search.trim())) && (!animal || product.animal === animal) && (!category || product.category === category) && (!stock || stockState(product.stock) === stock));

  function openForm(product?: Product) {
    setDraft(product ? { ...product, price: (product.price / 1000).toFixed(3), stock: String(product.stock), features: product.features.map((item) => ({ ...item })) } : { id: null, name: "", description: "", image: "", animal: "", category: "", price: "", stock: "0", features: [] });
    setError("");
    setMode("form");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    const price = Number(draft.price);
    const quantity = Number(draft.stock);
    if (!draft.name.trim() || !draft.animal || !categories[draft.animal].some((item) => item.id === draft.category)) { setError("Renseignez le nom, l’animal et une catégorie adaptée."); return; }
    if (!draft.price.trim() || !Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(price * 1000))) { setError("Saisissez un prix positif avec trois décimales maximum."); return; }
    if (!draft.stock.trim() || !Number.isSafeInteger(quantity) || quantity < 0) { setError("Le stock doit être un entier supérieur ou égal à zéro."); return; }
    if (draft.features.some((item) => Boolean(item.name.trim()) !== Boolean(item.value.trim()))) { setError("Complétez le nom et la valeur de chaque caractéristique, ou retirez la ligne."); return; }
    const product: Product = { ...draft, id: draft.id ?? nextId.current++, name: draft.name.trim(), description: draft.description.trim(), image: draft.image.trim(), animal: draft.animal, price: Math.round(price * 1000), stock: quantity, features: draft.features.filter((item) => item.name.trim() && item.value.trim()).map((item) => ({ name: item.name.trim(), value: item.value.trim() })) };
    setProducts((current) => draft.id === null ? [...current, product] : current.map((item) => item.id === product.id ? product : item));
    setNotice(`Produit « ${product.name} » ${draft.id === null ? "ajouté" : "modifié"}.`);
    setMode(null);
  }

  return <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
    <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Animalerie Khalil</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des produits</h1><p className="mt-3 text-sm text-gray-600">Gérez votre catalogue et les stocks de la boutique.</p></div>
      <div className="flex flex-wrap items-center gap-3"><span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm"><Package size={20} className="text-[#306900]" aria-hidden="true" /><strong>{products.length}</strong> produits au total</span><button type="button" onClick={() => openForm()} className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}><Plus size={18} aria-hidden="true" />Ajouter un produit</button></div>
    </header>
    <p className="text-xs text-gray-500">Données fictives · Les modifications disparaissent au rechargement.</p>
    <p role="status" className="text-sm text-[#306900]">{notice}</p>
    <section aria-label="Recherche et filtres" className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-medium">Rechercher par nom<span className="relative block"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-5 text-gray-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom du produit…" className={`${inputClass} pl-10`} /></span></label>
      <label className="text-sm font-medium">Animal cible<select value={animal} onChange={(event) => { setAnimal(event.target.value as Animal | ""); setCategory(""); }} className={inputClass}><option value="">Tous les animaux</option>{Object.entries(animals).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm font-medium">Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="">Toutes les catégories</option>{filterCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm font-medium">État du stock<select value={stock} onChange={(event) => setStock(event.target.value)} className={inputClass}><option value="">Tous les stocks</option><option value="disponible">Disponible (6 et plus)</option><option value="faible">Faible stock (1 à 5)</option><option value="rupture">Rupture (0)</option></select></label>
    </section>
    <section aria-labelledby="products-title" className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-5"><h2 id="products-title" className="font-bold">Catalogue des produits</h2><p aria-live="polite" className="mt-1 text-sm text-gray-500">{visible.length} résultat{visible.length > 1 ? "s" : ""}</p></div>
      <div className="overflow-x-auto" role="region" aria-label="Tableau des produits défilant horizontalement" tabIndex={0}>
        <table className="w-full min-w-[1050px] text-left text-sm"><caption className="sr-only">Produits fictifs, prix en TND et actions de gestion</caption>
          <thead className="bg-gray-50 text-xs text-gray-500"><tr>{["Image", "Nom", "Animal cible", "Catégorie", "Prix", "Quantité en stock", "Actions"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">{visible.map((product) => <tr key={product.id} className="hover:bg-gray-50">
            <td className="px-5 py-4"><ProductImage src={product.image} name={product.name} /></td><th scope="row" className="px-5 py-4 font-semibold">{product.name}</th><td className="px-5 py-4">{animals[product.animal]}</td><td className="px-5 py-4 text-gray-600">{categoryName(product.animal, product.category)}</td><td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{money(product.price)}</td><td className="px-5 py-4"><StockBadge stock={product.stock} /></td>
            <td className="px-5 py-4"><div className="flex gap-1"><button type="button" onClick={() => { setSelected(product); setMode("details"); }} aria-label={`Consulter ${product.name}`} title="Consulter les détails" className="rounded-lg p-2.5 hover:bg-gray-200 focus-visible:outline-2"><Eye size={18} aria-hidden="true" /></button><button type="button" onClick={() => openForm(product)} aria-label={`Modifier ${product.name}`} title="Modifier" className="rounded-lg p-2.5 hover:bg-[#65D900]/20 focus-visible:outline-2"><Pencil size={18} aria-hidden="true" /></button><button type="button" onClick={() => { setSelected(product); setMode("delete"); }} aria-label={`Supprimer ${product.name}`} title="Supprimer" className="rounded-lg p-2.5 text-red-700 hover:bg-red-50 focus-visible:outline-2"><Trash2 size={18} aria-hidden="true" /></button></div></td>
          </tr>)}{visible.length === 0 && <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-500">Aucun produit ne correspond à vos filtres.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    {mode === "details" && selected && <Modal title="Détails du produit" onClose={() => setMode(null)}>
      <div className="mb-5 flex items-center gap-4"><ProductImage src={selected.image} name={selected.name} /><div><h3 className="text-lg font-bold">{selected.name}</h3><p className="mt-1 font-semibold">{money(selected.price)}</p></div></div>
      <p className="mb-5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">{selected.description || "Aucune description renseignée."}</p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Animal cible</dt><dd className="mt-1 font-medium">{animals[selected.animal]}</dd></div><div><dt className="text-gray-500">Catégorie</dt><dd className="mt-1 font-medium">{categoryName(selected.animal, selected.category)}</dd></div><div><dt className="mb-2 text-gray-500">Quantité en stock</dt><dd><StockBadge stock={selected.stock} /></dd></div></dl>
      <h3 className="mb-3 mt-6 text-sm font-bold">Caractéristiques</h3>{selected.features.length ? <dl className="grid gap-3 text-sm sm:grid-cols-2">{selected.features.map((item, index) => <div key={index} className="break-words rounded-xl bg-gray-50 p-3"><dt className="text-gray-500">{item.name}</dt><dd className="mt-1 font-medium">{item.value}</dd></div>)}</dl> : <p className="text-sm text-gray-500">Aucune caractéristique renseignée.</p>}
      <div className="mt-6 flex justify-end"><button type="button" onClick={() => openForm(selected)} className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}><Pencil size={16} aria-hidden="true" />Modifier</button></div>
    </Modal>}

    {mode === "form" && draft && <Modal title={draft.id === null ? "Ajouter un produit" : "Modifier le produit"} onClose={() => setMode(null)}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-gray-500">Les champs marqués d’un * sont obligatoires.</p>
        <label className="block text-sm font-medium">Nom *<input required maxLength={150} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></label>
        <label className="block text-sm font-medium">Description<textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={inputClass} /></label>
        <label className="block text-sm font-medium">URL de l’image (facultative)<input type="text" inputMode="url" pattern="https?://.*|/.*" title="Une URL HTTP(S) ou un chemin local commençant par /" placeholder="https://exemple.com/produit.jpg" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} className={inputClass} /></label>
        <div className="flex items-center gap-3"><ProductImage src={draft.image} name={draft.name || "Aperçu du produit"} /><span className="text-xs text-gray-500">Aperçu · Image de remplacement si absente ou indisponible.</span>{draft.image && <button type="button" onClick={() => setDraft({ ...draft, image: "" })} className="text-xs underline">Retirer</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Animal cible *<select required value={draft.animal} onChange={(event) => setDraft({ ...draft, animal: event.target.value as Animal | "", category: "" })} className={inputClass}><option value="">Choisir un animal</option>{Object.entries(animals).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-sm font-medium">Catégorie *<select required disabled={!draft.animal} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className={`${inputClass} disabled:bg-gray-100`}><option value="">Choisir une catégorie</option>{draft.animal && categories[draft.animal].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium">Prix en TND *<input required type="number" min="0.001" step="0.001" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} className={inputClass} /></label>
          <label className="text-sm font-medium">Quantité en stock *<input required type="number" min="0" step="1" value={draft.stock} onChange={(event) => setDraft({ ...draft, stock: event.target.value })} className={inputClass} /></label>
        </div>
        <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4"><legend className="px-1 text-sm font-semibold">Caractéristiques (facultatives)</legend><p className="text-xs text-gray-500">Exemples : poids, saveur, taille, couleur, matière.</p>
          {draft.features.map((feature, index) => <div key={index} className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-medium">Nom<input aria-label={`Nom de la caractéristique ${index + 1}`} value={feature.name} onChange={(event) => setDraft({ ...draft, features: draft.features.map((item, i) => i === index ? { ...item, name: event.target.value } : item) })} className={inputClass} /></label>
            <label className="min-w-0 flex-1 text-xs font-medium">Valeur<input aria-label={`Valeur de la caractéristique ${index + 1}`} value={feature.value} onChange={(event) => setDraft({ ...draft, features: draft.features.map((item, i) => i === index ? { ...item, value: event.target.value } : item) })} className={inputClass} /></label>
            <button type="button" onClick={() => setDraft({ ...draft, features: draft.features.filter((_, i) => i !== index) })} aria-label={`Retirer la caractéristique ${index + 1}`} className="rounded-lg p-3 text-red-700 hover:bg-red-50 focus-visible:outline-2"><Trash2 size={17} aria-hidden="true" /></button>
          </div>)}
          <button type="button" onClick={() => setDraft({ ...draft, features: [...draft.features, { name: "", value: "" }] })} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}><Plus size={16} aria-hidden="true" />Ajouter une caractéristique</button>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" onClick={() => setMode(null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>Annuler</button><button type="submit" className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}>{draft.id === null ? "Ajouter le produit" : "Enregistrer"}</button></div>
      </form>
    </Modal>}

    {mode === "delete" && selected && <Modal title="Supprimer le produit" onClose={() => setMode(null)}>
      <p className="text-sm leading-6 text-gray-600">Voulez-vous supprimer <strong className="text-[#010101]">{selected.name}</strong> du catalogue local ?</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setMode(null)} className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}>Annuler</button><button type="button" onClick={() => { setProducts((current) => current.filter((item) => item.id !== selected.id)); setNotice(`Produit « ${selected.name} » supprimé.`); setMode(null); }} className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}>Confirmer la suppression</button></div>
    </Modal>}
  </div>;
}
