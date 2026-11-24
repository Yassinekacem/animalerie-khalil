"use client";

import { useToast } from "@/components/ToastProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge, CancelOrderDialog, Skeleton, StatusSelect, buttonClass, dateLabel,
  errorMessage, money, readResponse, statuses, updateOrderStatus, type Order, type Status,
} from "./order-ui";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Eye,
  Loader2,
  Search,
  ShoppingBag,
} from "lucide-react";

type OrderList = { orders: Order[]; total: number; page: number; totalPages: number };

const inputClass =
  "mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#65D900] focus:ring-2 focus:ring-[#65D900]/30";
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
          <Skeleton className="h-9 w-24 rounded-lg" />
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

const OrderRow = memo(function OrderRow({
  order,
  pending,
  onStatusChange,
}: {
  order: Order;
  pending: boolean;
  onStatusChange: (order: Order, next: Status) => void;
}) {
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
          <Link
            href={'/admin/commande/' + order.id}
            aria-label={'Consulter ' + order.reference}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium hover:bg-gray-200 focus-visible:outline-2"
          >
            <Eye size={18} aria-hidden="true" />
            Consulter
          </Link>
          <StatusSelect order={order} pending={pending} onChange={next => onStatusChange(order, next)} />
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
  const [listLoading, setListLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    const update = () => {
      if (pathname === "/admin/commande" && document.visibilityState === "visible") {
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
    if (pathname !== "/admin/commande" || document.visibilityState !== "visible") return;
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

  // Modal annulation
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);

  // Statut en cours de mise à jour (par id) → spinner local uniquement
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set());

  // Notifications
  const setNotice = useToast();
  const [error, setError] = useState("");

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

      // 2. Mise à jour optimiste : statut visible immédiatement dans la liste
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

      try {
        const updated = await updateOrderStatus(order.id, nextStatus);

        // Ignore si une mutation plus récente est en cours pour cette commande
        if (mutationSeq.current.get(order.id) !== seq) return;

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

        // 4. En cas d'erreur : restaurer l'ancien statut
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
    [status, setNotice]
  );

  const handleStatusChange = useCallback(
    (order: Order, nextStatus: Status) => {
      if (nextStatus === order.status) return;
      setError("");
      setNotice("");
      if (nextStatus === "ANNULEE") {
        // 5. Confirmation avant annulation
        setCancelTarget(order);
        return;
      }
      void applyStatus(order, nextStatus);
    },
    [applyStatus, setNotice]
  );

  const confirmCancel = useCallback(() => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setCancelTarget(null);
    void applyStatus(target, "ANNULEE");
  }, [cancelTarget, applyStatus]);

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
                    onStatusChange={handleStatusChange}
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

      {cancelTarget && (
        <CancelOrderDialog order={cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={confirmCancel} />
      )}
    </div>
  );
}
