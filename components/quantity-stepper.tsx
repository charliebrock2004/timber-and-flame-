"use client";

import { MinusIcon, PlusIcon } from "./icons";
import { ORDER_LIMITS } from "@/config/catalog";

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  size?: "md" | "sm";
}) {
  const max = ORDER_LIMITS.maxQuantityPerLine;
  const h = size === "sm" ? "h-10 w-10" : "h-12 w-12";
  return (
    <div
      className="border-cream-300 inline-flex items-center rounded-lg border-[1.5px] bg-white"
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button
        type="button"
        className={`${h} text-ink hover:bg-cream-100 grid place-items-center rounded-l-lg disabled:opacity-35`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={`Decrease ${label} quantity`}
      >
        <MinusIcon className="h-5 w-5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="label text-ink h-10 w-12 [appearance:textfield] bg-transparent text-center text-lg font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={`${label} quantity`}
      />
      <button
        type="button"
        className={`${h} text-ink hover:bg-cream-100 grid place-items-center rounded-r-lg disabled:opacity-35`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase ${label} quantity`}
      >
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
