"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import type { Product } from "@/components/ProductCard";

type WishlistContextValue = {
  products: Product[];
  count: number | null;
  error: string;
  retry: () => void;
  isFavorite: (id: number) => boolean;
  isPending: (id: number) => boolean;
  loading: boolean;
  toggleFavorite: (id: number) => Promise<void>;
};
type Result = { owner: object | null; products: Product[]; error: string };
type Scope = { userId: number; controller: AbortController; pending: Set<number> };
const WishlistContext = createContext<WishlistContextValue | null>(null);

class WishlistError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function wishlistRequest(method: "GET" | "POST" | "DELETE", signal: AbortSignal, productId?: number) {
  const response = await fetch("/api/wishlist", {
    method, signal, cache: "no-store", credentials: "same-origin",
    ...(method === "GET" ? {} : {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new WishlistError(typeof data?.error === "string" ? data.error : "Impossible de gérer vos favoris.", response.status);
  if (!data) throw new Error("Réponse du serveur incorrecte.");
  return data;
}

export default function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, error: authError, refresh } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;
  const [attempt, setAttempt] = useState(0);
  const owner = useMemo(() => ({ userId, attempt, authLoading, authError }), [userId, attempt, authLoading, authError]);
  const [result, setResult] = useState<Result>({ owner: null, products: [], error: "" });
  const [pending, setPending] = useState<{ scope: Scope | null; ids: number[] }>({ scope: null, ids: [] });
  const [notice, setNotice] = useState<{ owner: object; message: string } | null>(null);
  const scopeRef = useRef<Scope | null>(null);
  const matches = result.owner === owner;
  const ready = !authLoading && !authError && matches && !result.error;
  const loading = authLoading || Boolean(userId && !authError && !matches);
  const error = authError || (userId && matches ? result.error : "") ||
    (notice?.owner === owner ? notice.message : "");
  const products = userId && ready ? result.products : [];

  function retry() {
    if (pending.scope?.userId === userId && !pending.scope.controller.signal.aborted && pending.ids.length > 0) return;
    if (authError) void refresh();
    else { setNotice(null); setAttempt(value => value + 1); }
  }

  useEffect(() => {
    if (authLoading || authError || userId === null) return;
    const scope: Scope = { userId, controller: new AbortController(), pending: new Set() };
    scopeRef.current = scope;
    void wishlistRequest("GET", scope.controller.signal).then(data => {
      if (!Array.isArray(data.products) || !data.products.every((product: { id?: unknown } | null) =>
        product && Number.isInteger(product.id) && Number(product.id) > 0)) throw new Error("Réponse des favoris incorrecte.");
      if (!scope.controller.signal.aborted) {
        setResult({ owner, products: data.products, error: "" });
      }
    }).catch(reason => {
      if (scope.controller.signal.aborted) return;
      if (reason instanceof WishlistError && reason.status === 401) void refresh();
      setResult({ owner, products: [], error: reason instanceof Error ? reason.message : "Impossible de charger vos favoris." });
    });
    return () => { scope.controller.abort(); scopeRef.current = null; };
  }, [userId, authLoading, authError, owner, refresh]);

  async function toggleFavorite(productId: number) {
    if (authLoading) return;
    if (authError) { void refresh(); return; }
    if (!userId) { router.push("/connexion"); return; }
    if (!ready) { if (!loading) setAttempt(value => value + 1); return; }
    const scope = scopeRef.current;
    if (!scope || scope.userId !== userId || scope.controller.signal.aborted || scope.pending.has(productId)) return;
    const removing = result.products.some(product => product.id === productId);
    scope.pending.add(productId);
    setPending({ scope, ids: [...scope.pending] });
    setNotice(null);
    try {
      let addedProduct: Product | undefined;
      try {
        const data = await wishlistRequest(removing ? "DELETE" : "POST", scope.controller.signal, productId);
        if (!removing) {
          if (data.product?.id !== productId) throw new Error("Réponse du produit favori incorrecte.");
          addedProduct = data.product;
        }
      } catch (reason) {
        // Another tab may already have removed the item.
        if (!(removing && reason instanceof WishlistError && reason.status === 404)) throw reason;
      }
      if (scope.controller.signal.aborted) return;
      setResult(current => ({
        ...current,
        products: removing ? current.products.filter(product => product.id !== productId) :
          addedProduct ? [addedProduct, ...current.products.filter(product => product.id !== productId)] : current.products,
      }));
    } catch (reason) {
      if (scope.controller.signal.aborted) return;
      if (reason instanceof WishlistError && reason.status === 401) {
        void refresh();
        router.push("/connexion");
      }
      setNotice({ owner, message: reason instanceof Error ? reason.message : "Impossible de modifier vos favoris." });
    } finally {
      scope.pending.delete(productId);
      if (!scope.controller.signal.aborted) setPending({ scope, ids: [...scope.pending] });
    }
  }

  return <WishlistContext.Provider value={{
    products,
    count: userId ? (ready ? products.length : null) : 0,
    error: authError || (matches ? result.error : ""),
    retry,
    isFavorite: id => products.some(product => product.id === id),
    isPending: id => Boolean(pending.scope?.userId === userId && !pending.scope?.controller.signal.aborted && pending.ids.includes(id)),
    loading,
    toggleFavorite,
  }}>
    {children}
    {userId && loading && <p role="status" className="sr-only">Chargement des favoris…</p>}
    {error && <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800 shadow-lg sm:right-auto sm:max-w-sm">
      <p>{error}</p>
      <button type="button" disabled={pending.ids.length > 0 && pending.scope?.userId === userId && !pending.scope.controller.signal.aborted} onClick={retry} className="mt-2 rounded font-bold text-[#438F00] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#65D900] disabled:opacity-50">Réessayer</button>
    </div>}
  </WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("WishlistProvider est requis.");
  return context;
}
