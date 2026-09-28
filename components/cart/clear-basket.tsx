"use client";

import { useEffect } from "react";
import { basket } from "./cart-store";
import { draft } from "../checkout/draft-store";

/** Empties the basket once an order has been placed. */
export function ClearBasket() {
  useEffect(() => {
    basket.clear();
    draft.clear();
  }, []);
  return null;
}
