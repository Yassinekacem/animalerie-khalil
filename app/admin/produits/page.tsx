"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Eye, ImageOff, Loader2, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";

/* ============================================================
   Types
   ============================================================ */

type Animal = "chien" | "chat" | "oiseaux" | "poissons";
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Product = {
  id: number;
  name: string;
  description: string;
  brand: string | null;
  targetAnimal: Animal;
  category: string;
  image: string;
  price: string;
  promoPrice: string | null;
  characteristics: Record<string, JsonValue>;
  createdAt: string;
  updatedAt: string;
};
type ProductList = { products: Product[]; total: number; page: number; totalPages: number };
type Feature = { name: string; value: string; originalValue?: JsonValue };
type Draft = {
  id: number | null;
  name: string;
  description: string;
  brand: string;
  targetAnimal: Animal | "";
  category: string;
  image: string;
  price: string;
  hasPromotion: boolean;
  promoPrice: string;
  features: Feature[];
};
type Mode = "details" | "form" | "delete";

/* ============================================================
   Constantes
   ============================================================ */

const animals: Record<Animal, string> = {
  chien: "Chien",
  chat: "Chat",
  oiseaux: "Oiseaux",
  poissons: "Poissons",
};

const categories: Record<Animal, { id: string; name: string }[]> = {
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

const allCategoriesUnique = Array.from(
  new Map(Object.values(categories).flat().map(item => [item.id, item])).values()
);

const inputClass =
  "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101] disabled:cursor-not-allowed disabled:opacity-50";
const money = (price: string) =>
  `${Number(price).toLocaleString("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`;
const categoryName = (animal: Animal, id: string) =>
  categories[animal].find(item => item.id === id)?.name || id;
const dateLabel = (value: string) => new Date(value).toLocaleString("fr-TN");

/* ============================================================
   Helpers
   ============================================================ */

function describeValue(value: JsonValue): string {
  if (value === null) return "Non renseigné";
  if (Array.isArray(value)) return value.length ? value.map(describeValue).join(", ") : "Aucune valeur";
  if (typeof value === "object") {
    const entries = Object.entries(value);
    return entries.length
      ? entries.map(([name, item]) => `${name} : ${describeValue(item)}`).join(" ; ")
      : "Aucune valeur";
  }
  return String(value);
}

function makeDraft(product?: Product): Draft {
  return product
    ? {
        id: product.id,
        name: product.name,
        description: product.description,
        brand: product.brand ?? "",
        targetAnimal: product.targetAnimal,
        category: product.category,
        image: product.image,
        price: product.price,
        hasPromotion: product.promoPrice !== null,
        promoPrice: product.promoPrice ?? "",
        features: Object.entries(product.characteristics).map(([name, value]) => ({
          name,
          value: describeValue(value),
          originalValue: value,
        })),
      }
    : {
        id: null,
        name: "",
        description: "",
        brand: "",
        targetAnimal: "",
        category: "",
        image: "",
        price: "",
        hasPromotion: false,
        promoPrice: "",
        features: [],
      };
}

function productPayload(draft: Draft) {
  if (
    !draft.name.trim() ||
    !draft.description.trim() ||
    !draft.targetAnimal ||
    !categories[draft.targetAnimal].some(item => item.id === draft.category)
  ) {
    throw new Error("Renseignez le nom, la description, l’animal et une catégorie adaptée.");
  }
  const validPrice = (value: string) =>
    /^\d+(?:\.\d{1,3})?$/.test(value) && Number(value) <= 9999999.999;
  const price = draft.price.trim();
  const promoPrice = draft.promoPrice.trim();
  if (!validPrice(price) || Number(price) <= 0) {
    throw new Error("Saisissez un prix strictement positif avec trois décimales maximum.");
  }
  if (draft.hasPromotion && (!validPrice(promoPrice) || Number(promoPrice) >= Number(price))) {
    throw new Error(
      "Le prix promotionnel doit être positif ou nul, avec trois décimales maximum et inférieur au prix normal."
    );
  }
  const rows = draft.features.filter(item => item.name.trim() || item.value.trim());
  if (rows.some(item => !item.name.trim() || !item.value.trim())) {
    throw new Error("Complétez le nom et la valeur de chaque caractéristique, ou retirez la ligne.");
  }
  if (new Set(rows.map(item => item.name.trim())).size !== rows.length) {
    throw new Error("Chaque caractéristique doit avoir un nom unique.");
  }
  const characteristics = Object.fromEntries(
    rows.map(item => [
      item.name.trim(),
      item.originalValue !== undefined && item.value === describeValue(item.originalValue)
        ? item.originalValue
        : item.value.trim(),
    ])
  );
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    brand: draft.brand.trim() || null,
    targetAnimal: draft.targetAnimal,
    category: draft.category,
    image: draft.image.trim(),
    price,
    promoPrice: draft.hasPromotion ? promoPrice : null,
    characteristics,
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const labels: Record<string, string> = {
      name: "Nom",
      description: "Description",
      targetAnimal: "Animal",
      category: "Catégorie",
      brand: "Marque",
      price: "Prix",
      promoPrice: "Promotion",
      characteristics: "Caractéristiques",
    };
    const issues: { path?: (string | number)[]; message: string }[] = Array.isArray(data?.issues)
      ? data.issues
      : [];
    const details = issues.map(issue => {
      const field = String(issue.path?.[0] ?? "");
      return `${labels[field] ?? field}${field ? " : " : ""}${issue.message}`;
    });
    throw new Error([data?.error ?? "La demande a échoué.", ...details].join("\n"));
  }
  if (data === null) throw new Error("Réponse invalide du serveur. Réessayez.");
  return data as T;
}

function errorMessage(error: unknown) {
  return error instanceof TypeError
    ? "Connexion au serveur impossible. Réessayez."
    : error instanceof Error
      ? error.message
      : "Une erreur est survenue. Réessayez.";
}

/* ============================================================
   Hook : valeur debouncée
   ============================================================ */

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ============================================================
   Skeletons
   ============================================================ */

const Skeleton = memo(function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
});

const ProductRowSkeleton = memo(function ProductRowSkeleton() {
  return (
    <tr>
      {/* Image */}
      <td className="px-5 py-4">
        <Skeleton className="h-16 w-16 rounded-xl" />
      </td>
      {/* Nom */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-32" />
      </td>
      {/* Animal */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-14" />
      </td>
      {/* Catégorie */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      {/* Marque */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      {/* Prix normal */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      {/* Prix promo */}
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      {/* Actions */}
      <td className="px-5 py-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </td>
    </tr>
  );
});

const TableSkeleton = memo(function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <ProductRowSkeleton key={index} />
      ))}
    </>
  );
});

const ProductDetailSkeleton = memo(function ProductDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement du produit" className="space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
});

/* ============================================================
   Composants
   ============================================================ */

const Modal = memo(function Modal({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="product-modal-title"
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="product-modal-title" className="text-xl font-bold">
          {title}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          aria-label="Fermer la fenêtre"
          className="rounded-lg p-2 hover:bg-gray-100 focus-visible:outline-2 disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
});

const ProductImage = memo(function ProductImage({ src, name }: { src: string; name: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;
  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
      {failed ? (
        <ImageOff size={24} className="text-gray-400" role="img" aria-label="Image indisponible" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
});

const ProductRow = memo(function ProductRow({
  product,
  busy,
  onView,
  onEdit,
  onDelete,
  onPrefetch,
}: {
  product: Product;
  busy: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (product: Product) => void;
  onPrefetch: (id: number) => void;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-4">
        <ProductImage src={product.image} name={product.name} />
      </td>
      <th scope="row" className="px-5 py-4 font-semibold">
        {product.name}
      </th>
      <td className="px-5 py-4">{animals[product.targetAnimal]}</td>
      <td className="px-5 py-4 text-gray-600">
        {categoryName(product.targetAnimal, product.category)}
      </td>
      <td className="px-5 py-4 text-gray-600">{product.brand || "—"}</td>
      <td
        className={`whitespace-nowrap px-5 py-4 font-medium tabular-nums ${
          product.promoPrice !== null ? "text-gray-500 line-through" : ""
        }`}
      >
        {money(product.price)}
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums text-[#306900]">
        {product.promoPrice !== null ? money(product.promoPrice) : "—"}
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onView(product.id)}
            onMouseEnter={() => onPrefetch(product.id)}
            onFocus={() => onPrefetch(product.id)}
            aria-label={`Consulter ${product.name}`}
            title="Consulter les détails"
            className="rounded-lg p-2.5 hover:bg-gray-200 focus-visible:outline-2 disabled:opacity-50"
          >
            <Eye size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(product.id)}
            onMouseEnter={() => onPrefetch(product.id)}
            onFocus={() => onPrefetch(product.id)}
            aria-label={`Modifier ${product.name}`}
            title="Modifier"
            className="rounded-lg p-2.5 hover:bg-[#65D900]/20 focus-visible:outline-2 disabled:opacity-50"
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(product)}
            aria-label={`Supprimer ${product.name}`}
            title="Supprimer"
            className="rounded-lg p-2.5 text-red-700 hover:bg-red-50 focus-visible:outline-2 disabled:opacity-50"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
});

/* ============================================================
   Page
   ============================================================ */

export default function ProductsPage() {
  // Filtres
  const [search, setSearch] = useState("");
  const [animal, setAnimal] = useState<Animal | "">("");
  const [category, setCategory] = useState("");
  const [promotion, setPromotion] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Liste : on garde TOUJOURS les dernières données affichées (stale-while-revalidate)
  const [list, setList] = useState<{ data: ProductList | null; error: string }>({
    data: null,
    error: "",
  });
  const [listLoading, setListLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  // Cache mémoire des produits (par id)
  const productCache = useRef<Map<number, Product>>(new Map());

  // Modal state
  const [mode, setMode] = useState<Mode | null>(null);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const mutating = useRef(false);
  const detailController = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "12", sort });
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (animal) params.set("targetAnimal", animal);
    if (category) params.set("category", category);
    if (promotion) params.set("promotion", promotion);
    return params.toString();
  }, [page, sort, debouncedSearch, animal, category, promotion]);

  const products = list.data?.products ?? [];
  const total = list.data?.total ?? 0;
  const isInitialLoading = listLoading && list.data === null;

  const filterCategories = useMemo(
    () => (animal ? categories[animal] : allCategoriesUnique),
    [animal]
  );

  /* -------------------- Chargement liste -------------------- */
  useEffect(() => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;

    (async () => {
      setListLoading(true);
      try {
        const response = await fetch(`/api/products?${query}`, {
          signal: controller.signal,
          cache: "default",
        });
        const result = await readResponse<ProductList>(response);
        if (
          !Array.isArray(result.products) ||
          !Number.isInteger(result.total) ||
          !Number.isInteger(result.page) ||
          !Number.isInteger(result.totalPages)
        ) {
          throw new Error("Réponse du catalogue incorrecte.");
        }
        for (const p of result.products) productCache.current.set(p.id, p);
        setList({ data: result, error: "" });
        if (result.page !== page) setPage(result.page);
      } catch (err) {
        if (controller.signal.aborted) return;
        setList(prev => ({ data: prev.data, error: errorMessage(err) }));
      } finally {
        if (!controller.signal.aborted) setListLoading(false);
      }
    })();

    return () => controller.abort();
  }, [query, reloadToken, page]);

  useEffect(
    () => () => {
      detailController.current?.abort();
      listController.current?.abort();
    },
    []
  );

  /* -------------------- Modal -------------------- */

  const closeModal = useCallback(() => {
    if (mutating.current) return;
    detailController.current?.abort();
    setMode(null);
    setSelected(null);
    setDraft(null);
    setRecordId(null);
    setError("");
    setDetailLoading(false);
  }, []);

  const openNew = useCallback(() => {
    detailController.current?.abort();
    setRecordId(null);
    setSelected(null);
    setDraft(makeDraft());
    setDetailLoading(false);
    setError("");
    setMode("form");
  }, []);

  /* -------------------- Préchargement -------------------- */
  const prefetchProduct = useCallback((id: number) => {
    if (productCache.current.has(id)) return;
    fetch(`/api/products/${id}`, { cache: "default" })
      .then(r => (r.ok ? r.json() : null))
      .then((p: Product | null) => {
        if (p) productCache.current.set(id, p);
      })
      .catch(() => {});
  }, []);

  /* -------------------- Détail / Édition -------------------- */
  const openRecord = useCallback(async (id: number, nextMode: "details" | "form") => {
    detailController.current?.abort();
    setRecordId(id);
    setError("");
    setMode(nextMode);

    const cached = productCache.current.get(id);
    if (cached) {
      setSelected(cached);
      if (nextMode === "form") setDraft(makeDraft(cached));
      setDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    detailController.current = controller;
    setSelected(null);
    setDraft(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        signal: controller.signal,
        cache: "default",
      });
      const product = await readResponse<Product>(response);
      if (controller.signal.aborted) return;
      productCache.current.set(id, product);
      setSelected(product);
      if (nextMode === "form") setDraft(makeDraft(product));
    } catch (err) {
      if (!controller.signal.aborted) setError(errorMessage(err));
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, []);

  /* -------------------- Submit -------------------- */
  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!draft || mutating.current) return;
      let payload;
      try {
        payload = productPayload(draft);
      } catch (err) {
        setError(errorMessage(err));
        return;
      }
      mutating.current = true;
      setSaving(true);
      setError("");

      const isCreate = draft.id === null;
      try {
        const response = await fetch(
          isCreate ? "/api/products" : `/api/products/${draft.id}`,
          {
            method: isCreate ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const product = await readResponse<Product>(response);

        productCache.current.set(product.id, product);

        setList(prev => {
          if (!prev.data) return prev;
          const idx = prev.data.products.findIndex(p => p.id === product.id);
          const nextProducts =
            idx === -1
              ? [product, ...prev.data.products].slice(0, 12)
              : prev.data.products.map(p => (p.id === product.id ? product : p));
          return {
            data: {
              ...prev.data,
              products: nextProducts,
              total: idx === -1 ? prev.data.total + 1 : prev.data.total,
            },
            error: "",
          };
        });

        setNotice(`Produit « ${product.name} » ${isCreate ? "ajouté" : "modifié"}.`);
        mutating.current = false;
        setSaving(false);
        setMode(null);
        setDraft(null);
        setSelected(null);
      } catch (err) {
        setError(errorMessage(err));
        mutating.current = false;
        setSaving(false);
      }
    },
    [draft]
  );

  /* -------------------- Delete -------------------- */

  const confirmDelete = useCallback((product: Product) => {
    detailController.current?.abort();
    setSelected(product);
    setRecordId(product.id);
    setDetailLoading(false);
    setError("");
    setMode("delete");
  }, []);

  const remove = useCallback(async () => {
    if (!selected || mutating.current) return;
    mutating.current = true;
    setSaving(true);
    setError("");
    try {
      await readResponse(await fetch(`/api/products/${selected.id}`, { method: "DELETE" }));

      productCache.current.delete(selected.id);

      setList(prev => {
        if (!prev.data) return prev;
        return {
          data: {
            ...prev.data,
            products: prev.data.products.filter(p => p.id !== selected.id),
            total: Math.max(0, prev.data.total - 1),
          },
          error: "",
        };
      });

      setNotice(`Produit « ${selected.name} » supprimé.`);
      mutating.current = false;
      setSaving(false);
      setMode(null);
      setSelected(null);
    } catch (err) {
      setError(errorMessage(err));
      mutating.current = false;
      setSaving(false);
    }
  }, [selected]);

  /* -------------------- Handlers stables -------------------- */

  const handleView = useCallback((id: number) => void openRecord(id, "details"), [openRecord]);
  const handleEdit = useCallback((id: number) => void openRecord(id, "form"), [openRecord]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setAnimal("");
    setCategory("");
    setPromotion("");
    setSort("newest");
    setPage(1);
  }, []);

  /* ============================================================
     Rendu
     ============================================================ */

  return (
    <div className="mx-auto max-w-7xl space-y-6 text-[#010101]">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">
            Animalerie Khalil
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Gestion des produits</h1>
          <p className="mt-3 text-sm text-gray-600">Gérez le catalogue de votre boutique.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <Package size={20} className="text-[#306900]" aria-hidden="true" />
            <strong>
              {isInitialLoading || (list.error && !list.data) ? "—" : total}
            </strong>{" "}
            produit(s) dans la sélection
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={openNew}
            className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}
          >
            <Plus size={18} aria-hidden="true" />
            Ajouter un produit
          </button>
        </div>
      </header>

      <p role="status" className="text-sm text-[#306900]">
        {notice}
      </p>

      <section
        aria-label="Recherche et filtres"
        className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4"
      >
        <label className="text-sm font-medium">
          Rechercher par nom
          <span className="relative block">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-5 text-gray-400"
            />
            <input
              type="search"
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Nom du produit…"
              className={`${inputClass} pl-10`}
            />
          </span>
        </label>
        <label className="text-sm font-medium">
          Animal cible
          <select
            value={animal}
            onChange={event => {
              setAnimal(event.target.value as Animal | "");
              setCategory("");
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Tous les animaux</option>
            {Object.entries(animals).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Catégorie
          <select
            value={category}
            onChange={event => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Toutes les catégories</option>
            {filterCategories.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Promotion
          <select
            value={promotion}
            onChange={event => {
              setPromotion(event.target.value);
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Tous les produits</option>
            <option value="true">En promotion</option>
            <option value="false">Sans promotion</option>
          </select>
        </label>
        <div className="sm:col-span-2 xl:col-span-4">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded text-xs font-semibold text-[#306900] underline underline-offset-4 focus-visible:outline-2"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </section>

      <section
        aria-labelledby="products-title"
        aria-busy={listLoading}
        className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-5">
          <div>
            <h2 id="products-title" className="font-bold">
              Catalogue des produits
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-gray-500">
              {list.error && !list.data ? (
                <span className="text-red-700">Catalogue indisponible</span>
              ) : isInitialLoading ? (
                // Pendant le chargement initial, on affiche un squelette textuel discret
                <Skeleton className="h-4 w-24" />
              ) : (
                <>
                  {total} résultat(s)
                  {listLoading && (
                    <Loader2
                      size={12}
                      aria-hidden="true"
                      className="ml-2 inline animate-spin text-gray-400"
                    />
                  )}
                </>
              )}
            </p>
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-600">
            Trier par
            <select
              value={sort}
              onChange={event => {
                setSort(event.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#65D900] focus:outline-none focus:ring-2 focus:ring-[#65D900]/30"
            >
              <option value="newest">Nouveautés</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </label>
        </div>

        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Tableau des produits défilant horizontalement"
          tabIndex={0}
        >
          <table className="w-full min-w-[1100px] text-left text-sm">
            <caption className="sr-only">
              Catalogue des produits, prix en TND et actions de gestion
            </caption>
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {[
                  "Image",
                  "Nom",
                  "Animal cible",
                  "Catégorie",
                  "Marque",
                  "Prix normal",
                  "Prix promotionnel",
                  "Actions",
                ].map(label => (
                  <th key={label} scope="col" className="whitespace-nowrap px-5 py-4 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isInitialLoading ? (
                // Skeleton rows pendant le chargement initial
                <TableSkeleton rows={6} />
              ) : list.error && !list.data ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <p role="alert" className="whitespace-pre-line text-red-700">
                      {list.error}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReloadToken(v => v + 1)}
                      className={`${buttonClass} mt-4 bg-gray-100 hover:bg-gray-200`}
                    >
                      Réessayer
                    </button>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-500">
                    Aucun produit ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                products.map(product => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    busy={saving}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={confirmDelete}
                    onPrefetch={prefetchProduct}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isInitialLoading && !(list.error && !list.data) && list.data && list.data.totalPages > 0 && (
          <nav
            aria-label="Pagination des produits"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm"
          >
            <p className="text-gray-500">
              Page {list.data.page} sur {list.data.totalPages} · {list.data.total} résultat(s)
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button
                disabled={list.data.page <= 1}
                onClick={() => setPage(list.data!.page - 1)}
                className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
              >
                Précédent
              </button>
              {Array.from(
                new Set([
                  1,
                  ...Array.from({ length: 5 }, (_, index) => list.data!.page + index - 2),
                  list.data.totalPages,
                ])
              )
                .filter(value => value >= 1 && value <= list.data!.totalPages)
                .sort((a, b) => a - b)
                .map((value, index, pages) => (
                  <span key={value} className="flex items-center gap-1">
                    {index > 0 && value - pages[index - 1] > 1 && (
                      <span className="px-1 text-gray-400">…</span>
                    )}
                    <button
                      aria-label={`Page ${value}`}
                      aria-current={list.data!.page === value ? "page" : undefined}
                      onClick={() => setPage(value)}
                      className={`${buttonClass} ${
                        list.data!.page === value ? "bg-[#65D900]" : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      {value}
                    </button>
                  </span>
                ))}
              <button
                disabled={list.data.page >= list.data.totalPages}
                onClick={() => setPage(list.data!.page + 1)}
                className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
              >
                Suivant
              </button>
            </div>
          </nav>
        )}
      </section>

      {mode !== null && (
        <Modal
          title={
            mode === "details"
              ? "Détails du produit"
              : mode === "delete"
                ? "Supprimer le produit"
                : recordId === null
                  ? "Ajouter un produit"
                  : "Modifier le produit"
          }
          onClose={closeModal}
          busy={saving}
        >
          {detailLoading ? (
            // Skeleton pour le détail produit
            <ProductDetailSkeleton />
          ) : error && !draft && mode !== "delete" ? (
            <div className="space-y-4">
              <p role="alert" className="whitespace-pre-line text-sm text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (recordId !== null && (mode === "form" || mode === "details"))
                    void openRecord(recordId, mode);
                }}
                className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
              >
                Réessayer
              </button>
            </div>
          ) : (
            <>
              {mode === "details" && selected && (
                <>
                  <div className="mb-5 flex items-center gap-4">
                    <ProductImage src={selected.image} name={selected.name} />
                    <div>
                      <h3 className="text-lg font-bold">{selected.name}</h3>
                      <p className="mt-1 font-semibold">
                        {selected.promoPrice !== null ? (
                          <>
                            <del className="mr-2 text-gray-400">{money(selected.price)}</del>
                            {money(selected.promoPrice)}
                          </>
                        ) : (
                          money(selected.price)
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="mb-5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                    {selected.description}
                  </p>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500">Animal cible</dt>
                      <dd className="mt-1 font-medium">{animals[selected.targetAnimal]}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Catégorie</dt>
                      <dd className="mt-1 font-medium">
                        {categoryName(selected.targetAnimal, selected.category)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Marque</dt>
                      <dd className="mt-1 font-medium">{selected.brand || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Prix normal</dt>
                      <dd className="mt-1 font-medium">{money(selected.price)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Créé le</dt>
                      <dd className="mt-1 font-medium">{dateLabel(selected.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-500">Modifié le</dt>
                      <dd className="mt-1 font-medium">{dateLabel(selected.updatedAt)}</dd>
                    </div>
                  </dl>
                  <h3 className="mb-3 mt-6 text-sm font-bold">Caractéristiques</h3>
                  {Object.keys(selected.characteristics).length ? (
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      {Object.entries(selected.characteristics).map(([name, value]) => (
                        <div key={name} className="break-words rounded-xl bg-gray-50 p-3">
                          <dt className="text-gray-500">{name}</dt>
                          <dd className="mt-1 font-medium">{describeValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">Aucune caractéristique renseignée.</p>
                  )}
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(makeDraft(selected));
                        setError("");
                        setMode("form");
                      }}
                      className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Modifier
                    </button>
                  </div>
                </>
              )}

              {mode === "form" && draft && (
                <form onSubmit={submit} className="space-y-4" aria-busy={saving}>
                  <fieldset disabled={saving} className="min-w-0 space-y-4">
                    <p className="text-xs text-gray-500">
                      Les champs marqués d’un * sont obligatoires.
                    </p>
                    <label className="block text-sm font-medium">
                      Nom *
                      <input
                        required
                        value={draft.name}
                        onChange={event =>
                          setDraft(prev => (prev ? { ...prev, name: event.target.value } : prev))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Description *
                      <textarea
                        required
                        rows={3}
                        value={draft.description}
                        onChange={event =>
                          setDraft(prev =>
                            prev ? { ...prev, description: event.target.value } : prev
                          )
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Marque (facultative)
                      <input
                        value={draft.brand}
                        onChange={event =>
                          setDraft(prev => (prev ? { ...prev, brand: event.target.value } : prev))
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      URL de l’image (facultative)
                      <input
                        type="text"
                        inputMode="url"
                        pattern="https?://.*|/.*"
                        title="Une URL HTTP(S) ou un chemin local commençant par /"
                        placeholder="https://exemple.com/produit.jpg"
                        value={draft.image}
                        onChange={event =>
                          setDraft(prev => (prev ? { ...prev, image: event.target.value } : prev))
                        }
                        className={inputClass}
                      />
                    </label>
                    <div className="flex items-center gap-3">
                      <ProductImage src={draft.image} name={draft.name || "Aperçu du produit"} />
                      <span className="text-xs text-gray-500">
                        Aperçu · Image de remplacement si absente ou indisponible.
                      </span>
                      {draft.image && (
                        <button
                          type="button"
                          onClick={() => setDraft(prev => (prev ? { ...prev, image: "" } : prev))}
                          className="text-xs underline"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Animal cible *
                        <select
                          required
                          value={draft.targetAnimal}
                          onChange={event =>
                            setDraft(prev =>
                              prev
                                ? {
                                    ...prev,
                                    targetAnimal: event.target.value as Animal | "",
                                    category: "",
                                  }
                                : prev
                            )
                          }
                          className={inputClass}
                        >
                          <option value="">Choisir un animal</option>
                          {Object.entries(animals).map(([id, name]) => (
                            <option key={id} value={id}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Catégorie *
                        <select
                          required
                          disabled={!draft.targetAnimal}
                          value={draft.category}
                          onChange={event =>
                            setDraft(prev =>
                              prev ? { ...prev, category: event.target.value } : prev
                            )
                          }
                          className={`${inputClass} disabled:bg-gray-100`}
                        >
                          <option value="">Choisir une catégorie</option>
                          {draft.targetAnimal &&
                            categories[draft.targetAnimal].map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Prix en TND *
                        <input
                          required
                          type="number"
                          min="0.001"
                          max="9999999.999"
                          step="0.001"
                          value={draft.price}
                          onChange={event =>
                            setDraft(prev =>
                              prev ? { ...prev, price: event.target.value } : prev
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="space-y-3 rounded-xl border border-gray-200 p-4">
                      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={draft.hasPromotion}
                          onChange={event =>
                            setDraft(prev =>
                              prev ? { ...prev, hasPromotion: event.target.checked } : prev
                            )
                          }
                          className="h-4 w-4 accent-[#65D900]"
                        />
                        Activer la promotion
                      </label>
                      {draft.hasPromotion && (
                        <label className="block text-sm font-medium">
                          Prix promotionnel en TND *
                          <input
                            required
                            type="number"
                            min="0"
                            max="9999999.999"
                            step="0.001"
                            value={draft.promoPrice}
                            onChange={event =>
                              setDraft(prev =>
                                prev ? { ...prev, promoPrice: event.target.value } : prev
                              )
                            }
                            className={inputClass}
                          />
                        </label>
                      )}
                    </div>
                    <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
                      <legend className="px-1 text-sm font-semibold">
                        Caractéristiques (facultatives)
                      </legend>
                      <p className="text-xs text-gray-500">
                        Exemples : poids, saveur, taille, couleur, matière.
                      </p>
                      {draft.features.map((feature, index) => (
                        <div key={index} className="flex items-end gap-2">
                          <label className="min-w-0 flex-1 text-xs font-medium">
                            Nom
                            <input
                              aria-label={`Nom de la caractéristique ${index + 1}`}
                              value={feature.name}
                              onChange={event =>
                                setDraft(prev =>
                                  prev
                                    ? {
                                        ...prev,
                                        features: prev.features.map((item, i) =>
                                          i === index ? { ...item, name: event.target.value } : item
                                        ),
                                      }
                                    : prev
                                )
                              }
                              className={inputClass}
                            />
                          </label>
                          <label className="min-w-0 flex-1 text-xs font-medium">
                            Valeur
                            <input
                              aria-label={`Valeur de la caractéristique ${index + 1}`}
                              value={feature.value}
                              onChange={event =>
                                setDraft(prev =>
                                  prev
                                    ? {
                                        ...prev,
                                        features: prev.features.map((item, i) =>
                                          i === index ? { ...item, value: event.target.value } : item
                                        ),
                                      }
                                    : prev
                                )
                              }
                              className={inputClass}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setDraft(prev =>
                                prev
                                  ? {
                                      ...prev,
                                      features: prev.features.filter((_, i) => i !== index),
                                    }
                                  : prev
                              )
                            }
                            aria-label={`Retirer la caractéristique ${index + 1}`}
                            className="rounded-lg p-3 text-red-700 hover:bg-red-50 focus-visible:outline-2"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft(prev =>
                            prev
                              ? {
                                  ...prev,
                                  features: [...prev.features, { name: "", value: "" }],
                                }
                              : prev
                          )
                        }
                        className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
                      >
                        <Plus size={16} aria-hidden="true" />
                        Ajouter une caractéristique
                      </button>
                    </fieldset>
                    {error && (
                      <p role="alert" className="whitespace-pre-line text-sm text-red-700">
                        {error}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                      <button
                        type="button"
                        onClick={closeModal}
                        className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className={`${buttonClass} bg-[#65D900] hover:bg-[#58bf00]`}
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            Enregistrement…
                          </>
                        ) : draft.id === null ? (
                          "Ajouter le produit"
                        ) : (
                          "Enregistrer"
                        )}
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}

              {mode === "delete" && selected && (
                <>
                  <p className="text-sm leading-6 text-gray-600">
                    Voulez-vous supprimer{" "}
                    <strong className="text-[#010101]">{selected.name}</strong> du catalogue ?
                  </p>
                  {error && (
                    <p role="alert" className="mt-4 whitespace-pre-line text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={closeModal}
                      className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void remove()}
                      className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                          Suppression…
                        </>
                      ) : (
                        "Confirmer la suppression"
                      )}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}