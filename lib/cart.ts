"use client";

import { useMemo, useSyncExternalStore } from "react";
import { formatPrice } from "@/lib/catalogue";

export type CartProduct = {
  id: number;
  name: string;
  image: string;
  price: string;
  promoPrice: string | null;
};
export type CartItem = CartProduct & { quantity: number };

const STORAGE_KEY = "animalerie-khalil:cart:v1";
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
      const combined = Math.min(MAX_CART_QUANTITY, (items.get(id)?.quantity ?? 0) + quantity);
      items.set(id, { id, name, image, price, promoPrice, quantity: combined });
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

function getSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

// Identical server and first hydration render; storage is read after hydration.
function getServerSnapshot() {
  return null;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function changeCart(update: (items: CartItem[]) => CartItem[] | null) {
  try {
    // Read the latest cart, including changes made in another tab.
    const items = update(readItems(window.localStorage.getItem(STORAGE_KEY)));
    if (!items || !Number.isSafeInteger(items.reduce((sum, item) => sum + getUnitPriceMillimes(item) * item.quantity, 0))) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    // Do not announce a successful add when browser storage is unavailable.
    return false;
  }
}

function addItem(product: CartProduct, quantity = 1) {
  if (!validProduct(product) || !validQuantity(quantity)) return false;
  return changeCart(items => {
    const existing = items.find(item => item.id === product.id);
    const combined = (existing?.quantity ?? 0) + quantity;
    if (!validQuantity(combined)) return null;
    const { id, name, image, price, promoPrice } = product;
    const item = { id, name, image, price, promoPrice, quantity: combined };
    return existing ? items.map(current => current.id === id ? item : current) : [...items, item];
  });
}

function setQuantity(id: number, quantity: number) {
  if (!validQuantity(quantity)) return false;
  return changeCart(items => items.map(item => item.id === id ? { ...item, quantity } : item));
}

function removeItem(id: number) {
  return changeCart(items => items.filter(item => item.id !== id));
}

export function useCart() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const items = useMemo(() => readItems(snapshot), [snapshot]);
  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    ready: snapshot !== null,
    addItem,
    setQuantity,
    removeItem,
  };
}
