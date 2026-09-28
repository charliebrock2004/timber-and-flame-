"use client";

import { useSyncExternalStore } from "react";

/**
 * What the customer has typed at checkout, kept for this browser tab only
 * (sessionStorage) so moving between steps — or back to the basket — never
 * loses anything. Cleared once the order is placed.
 */
export type Draft = {
  customerName: string;
  phone: string;
  email: string;
  postcode: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  notes: string;
  fulfilment: "DELIVERY" | "COLLECTION";
};

export const EMPTY_DRAFT: Draft = {
  customerName: "",
  phone: "",
  email: "",
  postcode: "",
  addressLine1: "",
  addressLine2: "",
  town: "",
  notes: "",
  fulfilment: "DELIVERY",
};

const KEY = "tf-checkout-v1";
let state: Draft = EMPTY_DRAFT;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Draft>;
      const next = { ...EMPTY_DRAFT };
      for (const k of Object.keys(EMPTY_DRAFT) as (keyof Draft)[]) {
        const v = parsed[k];
        if (typeof v === "string") (next as Record<string, string>)[k] = v.slice(0, 500);
      }
      if (next.fulfilment !== "COLLECTION") next.fulfilment = "DELIVERY";
      state = next;
    }
  } catch {
    /* storage blocked — the draft just won't persist */
  }
}

function save() {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export const draft = {
  update(patch: Partial<Draft>) {
    load();
    state = { ...state, ...patch };
    save();
    listeners.forEach((l) => l());
  },
  clear() {
    state = EMPTY_DRAFT;
    try {
      window.sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
};

export function useDraft(): Draft {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => EMPTY_DRAFT,
  );
}
