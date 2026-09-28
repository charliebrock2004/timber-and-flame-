import Link from "next/link";

export default function NotFound() {
  return (
    <main className="slats text-cream-100 flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <p className="label text-ember-200">Timber &amp; Flame Firewood</p>
      <h1 className="mt-3 text-4xl font-bold">Page not found</h1>
      <p className="text-cream-200/85 mt-3 text-lg">Sorry, we couldn&apos;t find that page.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-light">
          Home
        </Link>
        <Link href="/shop" className="btn btn-primary">
          Shop firewood
        </Link>
      </div>
    </main>
  );
}
