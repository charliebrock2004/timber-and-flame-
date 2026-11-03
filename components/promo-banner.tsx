"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Site-wide limited-time offer. Sits above the navigation and does not replace the admin announcement. */
export function PromoBanner() {
  const pathname = usePathname();

  return (
    <div className="bg-wood-800 text-cream-100 border-b border-black/25">
      <div className="container-site py-2 sm:py-2.5">
        <Link
          href="/#log-store-offer"
          className="focus-visible:outline-amber mx-auto flex max-w-5xl flex-col items-center gap-1 text-center hover:text-white sm:flex-row sm:justify-center sm:gap-4"
          onClick={(event) => {
            if (pathname !== "/") return;
            const section = document.getElementById("log-store-offer");
            if (!section) return;
            event.preventDefault();
            section.scrollIntoView({ behavior: "smooth", block: "start" });
            window.history.pushState(null, "", "/#log-store-offer");
          }}
        >
          <span className="label text-[0.78rem] leading-snug tracking-[0.06em] sm:text-[0.92rem]">
            <span className="text-amber">Limited-time offer</span>
            <span className="text-cream-200/45 mx-2 hidden sm:inline" aria-hidden>
              |
            </span>
            <span className="mt-0.5 block sm:mt-0 sm:inline">
              Save £100 on our handmade log store & firewood package — now <span className="text-cream-50 font-semibold">£400</span>
            </span>
          </span>
          <span className="label border-cream-100/35 text-cream-50 inline-flex min-h-10 items-center rounded-md border px-3 text-sm tracking-wider">
            View offer
          </span>
        </Link>
      </div>
    </div>
  );
}
