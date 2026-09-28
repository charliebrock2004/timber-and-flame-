"use client";

import { CatalogUnavailable } from "@/components/unavailable";

/** Any page that can't load live data (e.g. the database is down) lands here — never on stale prices. */
export default function SiteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <CatalogUnavailable onRetry={retry} />;
}
