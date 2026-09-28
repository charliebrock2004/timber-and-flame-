"use client";

export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="bg-cream-50 shadow-card ring-ink/5 max-w-xl rounded-xl p-6 ring-1">
      <h1 className="text-2xl font-bold">Couldn&apos;t load this page</h1>
      <p className="text-ink-soft mt-2">
        The database didn&apos;t respond. Nothing has been changed. Check the database status in Vercel, then try again.
      </p>
      <button type="button" onClick={retry} className="btn btn-primary mt-4 min-h-11">
        Try again
      </button>
    </div>
  );
}
