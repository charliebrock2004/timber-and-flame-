/**
 * Returns a clean Postgres connection string from DATABASE_URL-style input.
 *
 * Pasting from a provider's dashboard often brings extras along — Neon's
 * "Copy snippet" can give `psql 'postgresql://…'`, and people paste
 * `DATABASE_URL=postgresql://…` or wrap the value in quotes. The pg driver
 * then silently treats the value as a relative URL and tries to connect to
 * a host called "base". Here we pull out the actual postgres(ql):// URL.
 */
export function cleanDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  const match = raw.match(/postgres(?:ql)?:\/\/[^\s'"`]+/);
  return match ? match[0] : raw.trim();
}
