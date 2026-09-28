import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-site py-20 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="text-ink-soft mt-3 text-lg">Sorry, we couldn&apos;t find that page.</p>
      <Link href="/shop" className="btn btn-primary mt-8">
        Shop firewood
      </Link>
    </div>
  );
}
