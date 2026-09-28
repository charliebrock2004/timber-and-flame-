import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { logoutAction } from "./actions";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/products", label: "Products & prices" },
  { href: "/admin/delivery", label: "Delivery" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return (
    <div className="bg-cream-100 min-h-dvh">
      <header className="bg-char-900 text-cream-100">
        <div className="container-site flex flex-wrap items-center gap-4 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo tone="light" className="h-10 w-auto" sizes="90px" />
            <span className="label text-cream-200/70 text-sm">Admin</span>
          </Link>
          {session && (
            <>
              <nav aria-label="Admin" className="order-3 w-full overflow-x-auto sm:order-none sm:ml-6 sm:w-auto">
                <ul className="flex gap-1">
                  {NAV.map((n) => (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        className="label text-cream-200 block rounded px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 hover:text-white"
                      >
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="ml-auto flex items-center gap-3 text-sm">
                <Link href="/" className="text-cream-200 underline-offset-4 hover:underline">
                  View site
                </Link>
                <form action={logoutAction}>
                  <button className="rounded border border-white/20 px-3 py-1.5 hover:bg-white/10">Log out</button>
                </form>
              </div>
            </>
          )}
        </div>
      </header>
      <main className="container-site py-8">{children}</main>
    </div>
  );
}
