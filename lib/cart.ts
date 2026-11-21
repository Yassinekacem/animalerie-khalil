"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/components/AuthProvider";
import { type ProductAvailability, formatPrice } from "@/lib/catalogue";

export type CartProduct = {
  id: number;
  name: string;
  image: string;
  price: string;
  promoPrice: string | null;
  availability: ProductAvailability;
};
export type CartItem = CartProduct & { quantity: number };

export type GuestReceipt = {
  reference: string;
  createdAt: string;
  items: { productName: string; quantity: number; unitPrice: string }[];
  subtotal: string;
  deliveryFee: string;
  total: string;
  shop: { name: string; phone: string };
};

const RECEIPTS_KEY = "animalerie-khalil:guest-receipts:v1";
const RECEIPTS_EVENT = "animalerie-khalil:guest-receipts-change";

// Whitelist the receipt fields, both from API responses and from browser storage.
// Never persist the full order (customer data, database IDs or idempotency keys).
export function createGuestReceipt(value: unknown): GuestReceipt | null {
  if (!value || typeof value !== "object") return null;
  const order = value as Record<string, unknown>;
  const amount = (price: unknown): price is string => typeof price === "string" && /^\d{1,15}(?:\.\d{1,3})?$/.test(price);
  if (typeof order.reference !== "string" || !/^AK-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.reference) ||
    typeof order.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(order.createdAt) || !Number.isFinite(Date.parse(order.createdAt)) ||
    !amount(order.subtotal) || !amount(order.deliveryFee) || !amount(order.total) ||
    !Array.isArray(order.items) || order.items.length < 1 || order.items.length > 100) return null;
  const items: GuestReceipt["items"] = [];
  for (const value of order.items) {
    if (!value || typeof value !== "object") return null;
    const item = value as Record<string, unknown>;
    if (typeof item.productName !== "string" || !item.productName.trim() || item.productName.length > 1000 ||
      typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 9999 || !amount(item.unitPrice)) return null;
    items.push({ productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice });
  }
  const millimes = (price: string) => {
    const [dinars, fraction = ""] = price.split(".");
    return BigInt(dinars) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
  };
  const subtotal = items.reduce((sum, item) => sum + millimes(item.unitPrice) * BigInt(item.quantity), BigInt(0));
  if (subtotal !== millimes(order.subtotal) || subtotal + millimes(order.deliveryFee) !== millimes(order.total)) return null;
  return {
    reference: order.reference, createdAt: order.createdAt, items,
    subtotal: order.subtotal, deliveryFee: order.deliveryFee, total: order.total,
    shop: { name: "Animalerie Khalil", phone: "+216 96 766 945" },
  };
}

function readGuestReceipts(snapshot: string | null): GuestReceipt[] {
  try {
    const values: unknown = JSON.parse(snapshot ?? "[]");
    if (!Array.isArray(values)) return [];
    const receipts = new Map<string, GuestReceipt>();
    for (const value of values) {
      const receipt = createGuestReceipt(value);
      if (receipt && !receipts.has(receipt.reference)) receipts.set(receipt.reference, receipt);
      if (receipts.size === 10) break;
    }
    return [...receipts.values()];
  } catch { return []; }
}

export function saveGuestReceipt(value: GuestReceipt): boolean {
  const receipt = createGuestReceipt(value);
  if (!receipt) return false;
  try {
    const receipts = readGuestReceipts(window.localStorage.getItem(RECEIPTS_KEY));
    window.localStorage.setItem(RECEIPTS_KEY, JSON.stringify([
      receipt, ...receipts.filter(item => item.reference !== receipt.reference),
    ].slice(0, 10)));
    window.dispatchEvent(new Event(RECEIPTS_EVENT));
    return true;
  } catch { return false; }
}

function subscribeGuestReceipts(onChange: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === RECEIPTS_KEY || event.key === null) onChange(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(RECEIPTS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(RECEIPTS_EVENT, onChange);
  };
}

export function useGuestReceipts(enabled: boolean) {
  const snapshot = useSyncExternalStore(
    enabled ? subscribeGuestReceipts : () => () => {},
    useCallback(() => enabled ? getSnapshot(RECEIPTS_KEY) : null, [enabled]),
    getServerSnapshot,
  );
  const receipts = useMemo(() => readGuestReceipts(snapshot), [snapshot]);
  const removeReceipt = (reference: string) => {
    if (!enabled) return false;
    try {
      const remaining = readGuestReceipts(window.localStorage.getItem(RECEIPTS_KEY)).filter(receipt => receipt.reference !== reference);
      if (remaining.length) window.localStorage.setItem(RECEIPTS_KEY, JSON.stringify(remaining));
      else window.localStorage.removeItem(RECEIPTS_KEY);
      window.dispatchEvent(new Event(RECEIPTS_EVENT));
      return true;
    } catch { return false; }
  };
  return { receipts, removeReceipt };
}

const CHANGE_EVENT = "animalerie-khalil:cart-change";
// Technical input limit, independent of product stock.
export const MAX_CART_QUANTITY = 9999;

function validQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_CART_QUANTITY;
}

function validProduct(value: unknown): value is CartProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const validPrice = (price: unknown): price is string =>
    typeof price === "string" && /^\d+(?:\.\d{1,3})?$/.test(price) && Number(price) <= 9999999.999;
  return Number.isInteger(item.id) && Number(item.id) > 0 && Number(item.id) <= 2147483647 &&
    typeof item.name === "string" && item.name.trim().length > 0 && typeof item.image === "string" &&
    validPrice(item.price) && Number(item.price) > 0 &&
    (item.promoPrice === null || (validPrice(item.promoPrice) && Number(item.promoPrice) < Number(item.price)));
}

function readItems(snapshot: string | null): CartItem[] {
  try {
    const data: unknown = JSON.parse(snapshot ?? "[]");
    if (!Array.isArray(data)) return [];
    const items = new Map<number, CartItem>();
    for (const value of data) {
      if (!validProduct(value) || !("quantity" in value) || typeof value.quantity !== "number" || !validQuantity(value.quantity)) continue;
      const { id, name, image, price, promoPrice, quantity } = value;
      const availability = value.availability;
      const combined = Math.min(MAX_CART_QUANTITY, (items.get(id)?.quantity ?? 0) + quantity);
      items.set(id, { id, name, image, price, promoPrice, availability, quantity: combined });
    }
    const result = [...items.values()];
    return Number.isSafeInteger(result.reduce((sum, item) => sum + getUnitPriceMillimes(item) * item.quantity, 0)) ? result : [];
  } catch {
    return [];
  }
}

// API prices are TND. Integer millimes avoid rounding drift in cart calculations.
export function getUnitPriceMillimes(item: CartProduct) {
  const [dinars, fraction = ""] = (item.promoPrice ?? item.price).split(".");
  return Number(dinars) * 1000 + Number(fraction.padEnd(3, "0"));
}

export function formatMillimes(amount: number) {
  return formatPrice((amount / 1000).toFixed(3));
}

function getSnapshot(storageKey: string | null) {
  if (storageKey === null) return null;
  try {
    return window.localStorage.getItem(storageKey) ?? "[]";
  } catch {
    return "[]";
  }
}

// Identical server and first hydration render; storage is read after hydration.
function getServerSnapshot() {
  return null;
}

function subscribe(storageKey: string | null, onChange: () => void) {
  if (storageKey === null) return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) onChange();
  };
  const onCartChange = (event: Event) => {
    if ((event as CustomEvent<string>).detail === storageKey) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onCartChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onCartChange);
  };
}

function changeCart(storageKey: string | null, update: (items: CartItem[]) => CartItem[] | null) {
  if (storageKey === null) return false;
  try {
    // Read the latest cart, including changes made in another tab.
    const items = update(readItems(window.localStorage.getItem(storageKey)));
    if (!items || !Number.isSafeInteger(items.reduce((sum, item) => sum + getUnitPriceMillimes(item) * item.quantity, 0))) return false;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: storageKey }));
    return true;
  } catch {
    // Do not announce a successful add when browser storage is unavailable.
    return false;
  }
}

async function addItem(storageKey: string | null, product: CartProduct, quantity = 1) {
  if (!validProduct(product) || !validQuantity(quantity) || product.availability !== "DISPONIBLE") return false;
  try {
    const response = await fetch(`/api/products/${product.id}`, { cache: "no-store" });
    const current: unknown = await response.json();
    if (!response.ok || !validProduct(current) || current.id !== product.id || current.availability !== "DISPONIBLE") return false;
    product = current;
  } catch {
    return false;
  }
  return changeCart(storageKey, items => {
    const existing = items.find(item => item.id === product.id);
    const combined = (existing?.quantity ?? 0) + quantity;
    if (!validQuantity(combined)) return null;
    const { id, name, image, price, promoPrice, availability } = product;
    const item = { id, name, image, price, promoPrice, availability, quantity: combined };
    return existing ? items.map(current => current.id === id ? item : current) : [...items, item];
  });
}

function setQuantity(storageKey: string | null, id: number, quantity: number) {
  if (!validQuantity(quantity)) return false;
  return changeCart(storageKey, items => items.map(item => item.id === id ? { ...item, quantity } : item));
}

function removeItem(storageKey: string | null, id: number) {
  return changeCart(storageKey, items => items.filter(item => item.id !== id));
}

export function useCart() {
  const { user, loading, error: sessionError, refresh: retrySession } = useAuth();
  // An unresolved session must not read or modify the guest cart by default.
  const storageKey = loading || sessionError ? null : user ? `cart_user_${user.id}` : "cart_guest";
  const subscribeToCart = useCallback((onChange: () => void) => subscribe(storageKey, onChange), [storageKey]);
  const readSnapshot = useCallback(() => getSnapshot(storageKey), [storageKey]);
  const snapshot = useSyncExternalStore(subscribeToCart, readSnapshot, getServerSnapshot);
  const items = useMemo(() => readItems(snapshot), [snapshot]);
  // Bind actions to their owner, including a checkout that finishes after a session change.
  const actions = useMemo(() => ({
    addItem: (product: CartProduct, quantity = 1) => addItem(storageKey, product, quantity),
    setQuantity: (id: number, quantity: number) => setQuantity(storageKey, id, quantity),
    removeItem: (id: number) => removeItem(storageKey, id),
    clearItems: () => changeCart(storageKey, () => []),
  }), [storageKey]);
  return {
    storageKey,
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    ready: snapshot !== null,
    sessionError,
    retrySession,
    ...actions,
  };
}
