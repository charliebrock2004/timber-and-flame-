"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import { BasketIcon, CloseIcon, MenuIcon, PhoneIcon } from "./icons";
import { basketCount, useBasket } from "./cart/cart-store";
import { NAV } from "@/lib/site";

export function Header({ phoneDisplay, phoneE164 }: { phoneDisplay: string; phoneE164: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const count = basketCount(useBasket());

  // Close the mobile menu whenever the route changes or Escape is pressed.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="bg-char-900/95 text-cream-100 supports-[backdrop-filter]:bg-char-900/85 sticky top-0 z-40 border-b border-white/5 backdrop-blur">
      <div className="container-site flex h-16 items-center gap-4 md:h-20">
        <Link href="/" className="shrink-0" aria-label="Timber & Flame Firewood — home">
          <Logo tone="light" priority className="h-11 w-auto md:h-14" sizes="120px" />
        </Link>

        <nav aria-label="Main" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={`label rounded px-3 py-2 text-[0.95rem] transition-colors hover:text-white ${active ? "decoration-ember-400 text-white underline decoration-2 underline-offset-8" : "text-cream-200/80"}`}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <a
            href={`tel:${phoneE164}`}
            className="label text-cream-100 hidden items-center gap-2 rounded px-3 py-2 hover:text-white md:inline-flex"
            aria-label={`Call ${phoneDisplay}`}
          >
            <PhoneIcon className="text-ember-400 h-5 w-5 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline">{phoneDisplay}</span>
          </a>
          <Link
            href="/basket"
            className="bg-ember-700 hover:bg-ember-600 relative inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-white"
            aria-label={`Basket, ${count} ${count === 1 ? "item" : "items"}`}
          >
            <BasketIcon className="h-5 w-5" />
            <span className="label hidden text-sm sm:inline">Basket</span>
            {count > 0 && (
              <span className="bg-cream-100 text-ink grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold" aria-hidden>
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/15 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <nav id="mobile-nav" aria-label="Mobile" hidden={!open} className="bg-char-900 border-t border-white/10 md:hidden">
        <ul className="container-site py-2">
          {[{ href: "/", label: "Home" }, ...NAV].map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={pathname === n.href ? "page" : undefined}
                className="label text-cream-100 flex min-h-12 items-center border-b border-white/5 text-lg"
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li className="py-3">
            <a href={`tel:${phoneE164}`} className="btn btn-outline-light w-full">
              <PhoneIcon className="h-5 w-5" /> Call {phoneDisplay}
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
