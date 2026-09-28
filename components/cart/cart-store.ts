"use client";

import { useSyncExternalStore } from "react";
import { ORDER_LIMITS } from "@/config/catalog";

/**
 * Basket = { productId: quantity }. Only IDs and quantities are stored —
 * never prices — so there is nothing in the browser worth tampering with.
 * Persisted to localStorage so the basket survives a page reload.
 */
export type Basket = Record<string, number>;

const KEY = "tf-basket-v1";
const EMPTY: Basket = {};
let state: Basket = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === "object") {
      const clean: Basket = {};
      for (const [id, q] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof q === "number" && Number.isInteger(q) && q > 0) clean[id] = Math.min(q, ORDER_LIMITS.maxQuantityPerLine);
      }
      state = clean;
    }
  } catch {
    /* private mode / blocked storage — basket just won't persist */
  }
}

function emit(next: Basket) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      loaded = false;
      load();
      listeners.forEach((fn) => fn());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => {
  load();
  return state;
};
const getServerSnapshot = () => EMPTY;

export function useBasket(): Basket {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** true once the browser basket has been read (avoids a flash of "empty"). */
export function useBasketReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export const basket = {
  set(productId: string, quantity: number) {
    load();
    const q = Math.max(0, Math.min(ORDER_LIMITS.maxQuantityPerLine, Math.floor(quantity)));
    const next = { ...state };
    if (q === 0) delete next[productId];
    else next[productId] = q;
    emit(next);
  },
  add(productId: string, quantity = 1) {
    load();
    basket.set(productId, (state[productId] ?? 0) + quantity);
  },
  remove(productId: string) {
    basket.set(productId, 0);
  },
  clear() {
    emit({});
  },
};

export function basketCount(b: Basket): number {
  return Object.values(b).reduce((s, q) => s + q, 0);
}
