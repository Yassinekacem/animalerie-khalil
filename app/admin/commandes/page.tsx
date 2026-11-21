"use client";

import { useToast } from "@/components/ToastProvider";
import { usePathname } from "next/navigation";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Eye,
  Loader2,
  MapPin,
  Package,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";

/* ============================================================
   Types
   ============================================================ */

const statuses = {
  EN_ATTENTE: "En attente",
  CONFIRMEE: "Confirmée",
  EN_LIVRAISON: "En livraison",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
} as const;
type Status = keyof typeof statuses;

type Order = {
  adminSeenAt: string | null;
  id: number;
  reference: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  gouvernorat: string | null;
  ville: string | null;
  customerEmail: string | null;
  note: string | null;
  createdAt: string;
  status: Status;
  subtotal: string;
  deliveryFee: string;
  total: string;
};
type OrderItem = { id: number; productName: string; quantity: number; unitPrice: string };
type OrderDetail = Order & { items: OrderItem[] };
type OrderList = { orders: Order[]; total: number; page: number; totalPages: number };

const transitions: Record<Status, Status[]> = {
  EN_ATTENTE: ["CONFIRMEE", "ANNULEE"],
  CONFIRMEE: ["EN_LIVRAISON", "ANNULEE"],
  EN_LIVRAISON: ["LIVREE", "ANNULEE"],
  LIVREE: [],
  ANNULEE: [],
};

const badgeStyles: Record<Status, string> = {
  EN_ATTENTE: "bg-amber-50 text-amber-800",
  CONFIRMEE: "bg-blue-50 text-blue-800",
  EN_LIVRAISON: "bg-violet-50 text-violet-800",
  LIVREE: "bg-[#65D900]/15 text-[#306900]",
  ANNULEE: "bg-red-50 text-red-700",
};

/* ============================================================
   Constantes UI
   ============================================================ */

const inputClass =
  "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010101] disabled:cursor-not-allowed disabled:opacity-50";

/* ============================================================
   Helpers montants & dates
   ============================================================ */

// API amounts are TND; integer millimes preserve Decimal precision.
function millimes(amount: string) {
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
}
function money(amount: string | bigint) {
  const value = typeof amount === "bigint" ? amount : millimes(amount);
  return `${(value / BigInt(1000)).toLocaleString("fr-TN")},${String(
    value % BigInt(1000)
  ).padStart(3, "0")} TND`;
}
const dateLabel = (date: string) =>
  new Date(date).toLocaleString("fr-TN", { timeZone: "Africa/Tunis" });

/* ============================================================
   Helpers fetch / erreurs
   ============================================================ */

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const issues: { message: string }[] = Array.isArray(data?.issues) ? data.issues : [];
    throw new Error(
      [data?.error ?? "La demande a échoué.", ...issues.map(i => i.message)].join("\n")
    );
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

const Skeleton = memo(function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-pulse rounded-md bg-gray-200 ${className}`}
    />
  );
});

const OrderRowSkeleton = memo(function OrderRowSkeleton() {
  return (
    <tr>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-32" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-4 w-24" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-6 w-24 rounded-full" />
      </td>
      <td className="px-5 py-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </td>
    </tr>
  );
});

const TableSkeleton = memo(function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <OrderRowSkeleton key={index} />
      ))}
    </>
  );
});

const OrderDetailSkeleton = memo(function OrderDetailSkeleton() {
  return (
    <div role="status" aria-label="Chargement de la commande" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-28 rounded-full" />
      </div>
      <div className="space-y-3 rounded-xl bg-gray-50 p-4">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
      <div className="ml-auto max-w-sm space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-5 w-full" />
      </div>
    </div>
  );
});

/* ============================================================
   Composants
   ============================================================ */

const Badge = memo(function Badge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${badgeStyles[status]}`}
    >
      {statuses[status]}
    </span>
  );
});

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
      aria-labelledby="order-modal-title"
      onCancel={event => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-[#010101] shadow-xl backdrop:bg-black/60 sm:p-6"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="order-modal-title" className="text-xl font-bold">
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

const OrderRow = memo(function OrderRow({
  order,
  pending,
  onView,
  onStatusChange,
  onPrefetch,
}: {
  order: Order;
  pending: boolean;
  onView: (id: number) => void;
  onStatusChange: (order: Order, next: Status) => void;
  onPrefetch: (id: number) => void;
}) {
  const allowed = transitions[order.status];
  return (
    <tr className="hover:bg-gray-50">
      <th scope="row" className="whitespace-nowrap px-5 py-4 font-semibold">
        {order.reference}
      </th>
      <td className="whitespace-nowrap px-5 py-4">{order.customerName}</td>
      <td className="whitespace-nowrap px-5 py-4 text-gray-600">{order.customerPhone}</td>
      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
        <time dateTime={order.createdAt}>{dateLabel(order.createdAt)}</time>
      </td>
      <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">{money(order.total)}</td>
      <td className="px-5 py-4">
        <Badge status={order.status} />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView(order.id)}
            onMouseEnter={() => onPrefetch(order.id)}
            onFocus={() => onPrefetch(order.id)}
            aria-label={`Consulter ${order.reference}`}
            title="Consulter les détails"
            className="rounded-lg p-2.5 hover:bg-gray-200 focus-visible:outline-2"
          >
            <Eye size={18} aria-hidden="true" />
          </button>
          <span className="relative inline-flex">
            <select
              aria-label={`Changer le statut de ${order.reference}`}
              value={order.status}
              disabled={pending || allowed.length === 0}
              onChange={event => onStatusChange(order, event.target.value as Status)}
              className="min-w-36 rounded-lg border border-gray-300 bg-white py-2 pl-2.5 pr-8 text-sm focus:border-[#65D900] focus:outline-none focus:ring-2 focus:ring-[#65D900]/30 disabled:opacity-60"
            >
              {[order.status, ...allowed].map(item => (
                <option key={item} value={item}>
                  {statuses[item]}
                </option>
              ))}
            </select>
            {pending && (
              <Loader2
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
              />
            )}
          </span>
        </div>
      </td>
    </tr>
  );
});

/* ============================================================
   Page
   ============================================================ */

export default function OrdersPage() {
  // Filtres
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  // Liste : stale-while-revalidate
  const [list, setList] = useState<{ data: OrderList | null; error: string }>({
    data: null,
    error: "",
  });
  const [listLoading, setListLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const update = () => {
      if (pathname === "/admin/commandes" && document.visibilityState === "visible") {
        setReloadToken(value => value + 1);
      }
    };
    const timer = window.setInterval(update, 15_000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/admin/commandes" || document.visibilityState !== "visible") return;
    const ids = list.data?.orders.filter(order => !order.adminSeenAt).map(order => order.id) ?? [];
    if (!ids.length) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/orders", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }), signal: controller.signal,
        });
        await readResponse<{ count: number }>(response);
        if (!controller.signal.aborted) window.dispatchEvent(new Event("orders-seen"));
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      }
    })();
    return () => controller.abort();
  }, [list.data, pathname]);

  // Cache mémoire des commandes (par id) — détail instantané / préchargement
  const orderCache = useRef<Map<number, OrderDetail>>(new Map());

  // Modal détail
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [selected, setSelected] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Modal annulation
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelError, setCancelError] = useState("");

  // Statut en cours de mise à jour (par id) → spinner local uniquement
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  // Notifications
  const setNotice = useToast();
  const [error, setError] = useState("");

  const detailController = useRef<AbortController | null>(null);
  const listController = useRef<AbortController | null>(null);
  // Compteur de requêtes de changement de statut pour ignorer les réponses obsolètes
  const mutationSeq = useRef<Map<number, number>>(new Map());

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (status) params.set("status", status);
    return params.toString();
  }, [page, debouncedSearch, status]);

  const orders = list.data?.orders ?? [];
  const total = list.data?.total ?? 0;
  const isInitialLoading = listLoading && list.data === null;

  /* -------------------- Chargement liste -------------------- */
  useEffect(() => {
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;

    (async () => {
      setListLoading(true);
      try {
        const response = await fetch(`/api/orders?${query}`, {
          signal: controller.signal,
          cache: "default",
        });
        const result = await readResponse<OrderList>(response);
        if (
          !Array.isArray(result.orders) ||
          !Number.isInteger(result.total) ||
          !Number.isInteger(result.page) ||
          !Number.isInteger(result.totalPages)
        ) {
          throw new Error("Réponse des commandes incorrecte.");
        }
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

  /* -------------------- Modal détail -------------------- */

  const closeModal = useCallback(() => {
    detailController.current?.abort();
    setDetailsId(null);
    setSelected(null);
    setDetailLoading(false);
    setDetailError("");
  }, []);

  /* -------------------- Préchargement -------------------- */
  const prefetchOrder = useCallback((id: number) => {
    if (orderCache.current.has(id)) return;
    fetch(`/api/orders/${id}`, { cache: "default" })
      .then(r => (r.ok ? r.json() : null))
      .then((o: OrderDetail | null) => {
        if (o) orderCache.current.set(id, o);
      })
      .catch(() => {});
  }, []);

  /* -------------------- Détail -------------------- */
  const openDetails = useCallback(async (id: number) => {
    detailController.current?.abort();
    setDetailsId(id);
    setDetailError("");

    const cached = orderCache.current.get(id);
    if (cached) {
      setSelected(cached);
      setDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    detailController.current = controller;
    setSelected(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/orders/${id}`, {
        signal: controller.signal,
        cache: "default",
      });
      const order = await readResponse<OrderDetail>(response);
      if (controller.signal.aborted) return;
      orderCache.current.set(id, order);
      setSelected(order);
    } catch (err) {
      if (!controller.signal.aborted) setDetailError(errorMessage(err));
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, []);

  /* ============================================================
     Changement de statut — mise à jour optimiste et ciblée
     ============================================================ */

  const applyStatus = useCallback(
    async (order: Order, nextStatus: Status) => {
      // Séquence par commande pour ignorer les réponses obsolètes
      const seq = (mutationSeq.current.get(order.id) ?? 0) + 1;
      mutationSeq.current.set(order.id, seq);

      const previousStatus = order.status;

      // 1. Marquer CETTE commande comme en cours (spinner local + désactivation ciblée)
      setPendingIds(prev => {
        const next = new Set(prev);
        next.add(order.id);
        return next;
      });
      setError("");
      setNotice("");

      // 2. Mise à jour optimiste : statut visible immédiatement dans la liste + le détail
      setList(prev => {
        if (!prev.data) return prev;
        return {
          data: {
            ...prev.data,
            orders: prev.data.orders.map(o =>
              o.id === order.id ? { ...o, status: nextStatus } : o
            ),
          },
          error: "",
        };
      });
      setSelected(prev => (prev && prev.id === order.id ? { ...prev, status: nextStatus } : prev));

      try {
        const response = await fetch(`/api/orders/${order.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        const updated = await readResponse<OrderDetail>(response);

        // Ignore si une mutation plus récente est en cours pour cette commande
        if (mutationSeq.current.get(order.id) !== seq) return;

        orderCache.current.set(updated.id, updated);

        // Synchro finale avec la réponse serveur (source de vérité)
        setList(prev => {
          if (!prev.data) return prev;
          return {
            data: {
              ...prev.data,
              orders: prev.data.orders.map(o => (o.id === updated.id ? { ...o, ...updated } : o)),
            },
            error: "",
          };
        });
        setSelected(prev => (prev && prev.id === updated.id ? updated : prev));

        setNotice(
          `Commande ${updated.reference} : statut « ${statuses[updated.status]} » enregistré.`
        );

        // 3. Respect des filtres actifs : si la commande ne correspond plus au filtre statut,
        //    on la retire en arrière-plan et on rafraîchit compteurs/pagination
        //    SANS masquer le tableau (SWR : données conservées pendant le refetch).
        if (status && updated.status !== status) {
          setList(prev => {
            if (!prev.data) return prev;
            return {
              data: {
                ...prev.data,
                orders: prev.data.orders.filter(o => o.id !== updated.id),
                total: Math.max(0, prev.data.total - 1),
              },
              error: "",
            };
          });
          setReloadToken(v => v + 1);
        }
      } catch (err) {
        if (mutationSeq.current.get(order.id) !== seq) return;

        // 4. En cas d'erreur : restaurer l'ancien statut (liste + détail)
        setList(prev => {
          if (!prev.data) return prev;
          return {
            data: {
              ...prev.data,
              orders: prev.data.orders.map(o =>
                o.id === order.id ? { ...o, status: previousStatus } : o
              ),
            },
            error: "",
          };
        });
        setSelected(prev =>
          prev && prev.id === order.id ? { ...prev, status: previousStatus } : prev
        );

        setError(
          `Impossible de mettre à jour la commande ${order.reference} : ${errorMessage(err)}`
        );
      } finally {
        setPendingIds(prev => {
          if (!prev.has(order.id)) return prev;
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [status]
  );

  const handleStatusChange = useCallback(
    (order: Order, nextStatus: Status) => {
      if (nextStatus === order.status) return;
      setError("");
      setNotice("");
      if (nextStatus === "ANNULEE") {
        // 5. Confirmation avant annulation
        setCancelError("");
        setCancelTarget(order);
        return;
      }
      void applyStatus(order, nextStatus);
    },
    [applyStatus]
  );

  const confirmCancel = useCallback(() => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    void applyStatus(target, "ANNULEE");
  }, [cancelTarget, applyStatus]);

  /* -------------------- Handlers stables -------------------- */
  const handleView = useCallback((id: number) => void openDetails(id), [openDetails]);

  const resetFilters = useCallback(() => {
    setSearch("");
    setStatus("");
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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Gestion des commandes
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            Consultez les commandes et suivez leur livraison.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <ShoppingBag size={20} className="text-[#306900]" aria-hidden="true" />
            <strong>{isInitialLoading || (list.error && !list.data) ? "—" : total}</strong>{" "}
            commande(s) dans la sélection
          </span>
        </div>
      </header>



      {error && (
        <p role="alert" className="whitespace-pre-line text-sm text-red-700">
          {error}
        </p>
      )}

      <section
        aria-label="Recherche et filtres"
        className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4"
      >
        <label className="text-sm font-medium">
          Rechercher une commande
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
              placeholder="Numéro, nom du client ou téléphone…"
              className={`${inputClass} pl-10`}
            />
          </span>
        </label>
        <label className="text-sm font-medium">
          Statut
          <select
            value={status}
            onChange={event => {
              setStatus(event.target.value as Status | "");
              setPage(1);
            }}
            className={inputClass}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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
        aria-labelledby="orders-title"
        aria-busy={listLoading}
        className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-5 py-5">
          <div>
            <h2 id="orders-title" className="font-bold">
              Liste des commandes
            </h2>
            <p aria-live="polite" className="mt-1 text-sm text-gray-500">
              {list.error && !list.data ? (
                <span className="text-red-700">Commandes indisponibles</span>
              ) : isInitialLoading ? (
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
        </div>

        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Tableau des commandes défilant horizontalement"
          tabIndex={0}
        >
          <table className="w-full min-w-[1150px] text-left text-sm">
            <caption className="sr-only">
              Commandes, montants en TND et actions de gestion
            </caption>
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {[
                  "Numéro",
                  "Client",
                  "Téléphone",
                  "Date",
                  "Montant total",
                  "Statut",
                  "Actions",
                ].map(label => (
                  <th
                    key={label}
                    scope="col"
                    className="whitespace-nowrap px-5 py-4 font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isInitialLoading ? (
                <TableSkeleton rows={6} />
              ) : list.error && !list.data ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    Aucune commande ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    pending={pendingIds.has(order.id)}
                    onView={handleView}
                    onStatusChange={handleStatusChange}
                    onPrefetch={prefetchOrder}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isInitialLoading &&
          !(list.error && !list.data) &&
          list.data &&
          list.data.totalPages > 0 && (
            <nav
              aria-label="Pagination des commandes"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-5 text-sm"
            >
              <p className="text-gray-500">
                Page {list.data.page} sur {list.data.totalPages} · {list.data.total} résultat(s)
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
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
                        type="button"
                        aria-label={`Page ${value}`}
                        aria-current={list.data!.page === value ? "page" : undefined}
                        onClick={() => setPage(value)}
                        className={`${buttonClass} ${
                          list.data!.page === value
                            ? "bg-[#65D900]"
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {value}
                      </button>
                    </span>
                  ))}
                <button
                  type="button"
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

      {detailsId !== null && (
        <Modal
          title={selected ? `Commande ${selected.reference}` : "Détails de la commande"}
          onClose={closeModal}
          busy={pendingIds.has(detailsId)}
        >
          {detailLoading ? (
            <OrderDetailSkeleton />
          ) : detailError && !selected ? (
            <div className="space-y-4">
              <p role="alert" className="whitespace-pre-line text-sm text-red-700">
                {detailError}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (detailsId !== null) void openDetails(detailsId);
                }}
                className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
              >
                Réessayer
              </button>
            </div>
          ) : selected ? (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Passée le{" "}
                  <time dateTime={selected.createdAt}>{dateLabel(selected.createdAt)}</time>
                </p>
                <Badge status={selected.status} />
              </div>

              <section
                aria-labelledby="customer-title"
                className="mb-6 rounded-xl bg-gray-50 p-4"
              >
                <h3
                  id="customer-title"
                  className="mb-3 flex items-center gap-2 text-sm font-bold"
                >
                  <MapPin size={17} aria-hidden="true" />
                  Client et livraison
                </h3>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-gray-500">Nom du client</dt>
                    <dd className="mt-1 font-medium">{selected.customerName}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Téléphone</dt>
                    <dd className="mt-1">{selected.customerPhone}</dd>
                  </div>
                  {selected.customerEmail && (
                    <div>
                      <dt className="text-gray-500">Email</dt>
                      <dd className="mt-1 break-words">{selected.customerEmail}</dd>
                    </div>
                  )}
                  {selected.note && (
                    <div className="sm:col-span-2">
                      <dt className="text-gray-500">Note</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words">{selected.note}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-gray-500">Adresse de livraison</dt>
                    <dd className="mt-1 break-words">{selected.deliveryAddress}</dd>
                  </div>
                  {selected.gouvernorat && <div>
                    <dt className="text-gray-500">Gouvernorat</dt>
                    <dd className="mt-1">{selected.gouvernorat}</dd>
                  </div>}
                  {selected.ville && <div>
                    <dt className="text-gray-500">Ville</dt>
                    <dd className="mt-1">{selected.ville}</dd>
                  </div>}
                </dl>
              </section>

              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">
                <Package size={17} aria-hidden="true" />
                Articles commandés
              </h3>
              <div
                className="overflow-x-auto rounded-xl border border-gray-200"
                role="region"
                aria-label="Articles de la commande, tableau défilant horizontalement"
                tabIndex={0}
              >
                <table className="w-full min-w-[550px] text-left text-sm">
                  <caption className="sr-only">
                    Articles et calcul des sous-totaux en TND
                  </caption>
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Article
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Quantité
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Prix unitaire
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Sous-total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selected.items.map(item => (
                      <tr key={item.id}>
                        <th scope="row" className="px-4 py-4 font-medium">
                          {item.productName}
                        </th>
                        <td className="px-4 py-4 text-right tabular-nums">{item.quantity}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right tabular-nums">
                          {money(item.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-medium tabular-nums">
                          {money(millimes(item.unitPrice) * BigInt(item.quantity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="ml-auto mt-6 max-w-sm space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Sous-total des articles</dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(selected.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Frais de livraison</dt>
                  <dd className="whitespace-nowrap font-medium tabular-nums">
                    {money(selected.deliveryFee)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-gray-200 pt-3 text-base font-bold">
                  <dt>Montant total</dt>
                  <dd className="whitespace-nowrap tabular-nums">{money(selected.total)}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}
                >
                  Fermer
                </button>
              </div>
            </>
          ) : null}
        </Modal>
      )}

      {cancelTarget && (
        <Modal
          title="Annuler la commande"
          onClose={() => {
            if (!pendingIds.has(cancelTarget.id)) setCancelTarget(null);
          }}
          busy={pendingIds.has(cancelTarget.id)}
        >
          <p className="text-sm leading-6 text-gray-600">
            Voulez-vous vraiment annuler la commande{" "}
            <strong className="text-[#010101]">{cancelTarget.reference}</strong> de{" "}
            {cancelTarget.customerName} ? Son statut actuel est «{" "}
            {statuses[cancelTarget.status]} ». Le statut « Annulée » sera appliqué après
            confirmation.
          </p>
          {cancelError && (
            <p role="alert" className="mt-4 whitespace-pre-line text-sm text-red-700">
              {cancelError}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={pendingIds.has(cancelTarget.id)}
              onClick={() => setCancelTarget(null)}
              className={`${buttonClass} bg-gray-100 hover:bg-gray-200`}
            >
              Conserver la commande
            </button>
            <button
              type="button"
              disabled={pendingIds.has(cancelTarget.id)}
              onClick={confirmCancel}
              className={`${buttonClass} bg-[#010101] text-white hover:bg-gray-800`}
            >
              {pendingIds.has(cancelTarget.id) ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Enregistrement…
                </>
              ) : (
                "Confirmer l’annulation"
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
