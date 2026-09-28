"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BasketIcon, PhoneIcon } from "./icons";
import { basketCount, useBasket } from "./cart/cart-store";
import { formatPenceShort } from "@/lib/money";

/**
 * Sticky bottom bar on phones: Call + Shop/Basket are always one tap away.
 * Hidden on the basket page (which has its own submit button) and admin.
 */
export function MobileActionBar({
  phoneE164,
  phoneDisplay,
  prices,
}: {
  phoneE164: string;
  phoneDisplay: string;
  prices: Record<string, number>;
}) {
  const pathname = usePathname();
  const b = useBasket();
  const count = basketCount(b);
  if (pathname.startsWith("/basket") || pathname.startsWith("/checkout") || pathname.startsWith("/order")) return null;

  const subtotal = Object.entries(b).reduce((s, [id, q]) => s + (prices[id] ?? 0) * q, 0);

  return (
    <div className="bg-char-900/97 fixed inset-x-0 bottom-0 z-40 border-t border-black/20 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,.25)] md:hidden">
      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${phoneE164}`}
          className="btn btn-outline-light min-h-12 gap-1.5 px-2 text-base tracking-wide"
          aria-label={`Call Timber & Flame on ${phoneDisplay}`}
        >
          <PhoneIcon className="h-5 w-5 shrink-0" />
          {phoneDisplay}
        </a>
        {count > 0 ? (
          <Link
            href="/basket"
            className="btn btn-primary min-h-12 px-2"
            aria-label={`Basket, ${count} items, ${formatPenceShort(subtotal)}`}
          >
            <BasketIcon className="h-5 w-5" />({count}) · {formatPenceShort(subtotal)}
          </Link>
        ) : (
          <Link href="/shop" className="btn btn-primary min-h-12 px-2">
            Order now
          </Link>
        )}
      </div>
    </div>
  );
}
