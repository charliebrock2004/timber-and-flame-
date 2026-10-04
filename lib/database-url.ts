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

const FALLBACK_KEYS = ["DATABASE_POSTGRES_URL", "POSTGRES_URL", "DATABASE_POSTGRES_PRISMA_URL"] as const;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

function isPostgresUrl(value: string | undefined): value is string {
  return Boolean(value && /^postgres(?:ql)?:\/\//i.test(value));
}

/**
 * The connection string the app should use.
 *
 * `DATABASE_URL` wins when it is set. Preview deployments on this project
 * only have the Neon integration variable `DATABASE_POSTGRES_URL`. Without a
 * fallback, node-postgres treats a missing connection string as
 * 127.0.0.1:5432 and the Vercel build dies with ECONNREFUSED.
 *
 * An explicit but unusable DATABASE_URL is an error. It is not replaced with
 * another variable, so a bad production value cannot silently point elsewhere.
 */
export function resolveDatabaseUrl(env: Record<string, string | undefined> = process.env): { url: string; source: string } {
  const explicit = env.DATABASE_URL;
  let chosen: { url: string; source: string } | undefined;

  if (explicit && explicit.trim()) {
    const cleaned = cleanDatabaseUrl(explicit);
    if (!isPostgresUrl(cleaned)) {
      throw new Error(
        "DATABASE_URL is set but does not contain a postgres:// connection string. Refusing to guess a database host.",
      );
    }
    chosen = { url: cleaned, source: "DATABASE_URL" };
  } else {
    for (const source of FALLBACK_KEYS) {
      const cleaned = cleanDatabaseUrl(env[source]);
      if (isPostgresUrl(cleaned)) {
        chosen = { url: cleaned, source };
        break;
      }
    }
  }

  if (!chosen) {
    throw new Error(
      "No Postgres connection string is available. Set DATABASE_URL for this environment (Vercel Production and Preview). An empty value makes node-postgres dial 127.0.0.1:5432, which is not this site's database.",
    );
  }

  if (env.VERCEL) {
    let host = "";
    try {
      host = new URL(chosen.url).hostname;
    } catch {
      host = "";
    }
    if (LOOPBACK.has(host)) {
      throw new Error(
        `${chosen.source} points at ${host}. Vercel cannot use a localhost database. Set DATABASE_URL to the hosted Postgres connection string for both Production and Preview.`,
      );
    }
  }

  return chosen;
}

/**
 * For migrate and seed only. Those commands write to the database, so they
 * must not fall back to an integration URL (that can be production) and must
 * not let node-postgres dial localhost when the variable was forgotten.
 */
export function requireExplicitDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  const cleaned = cleanDatabaseUrl(env.DIRECT_URL || env.DATABASE_URL);
  if (!isPostgresUrl(cleaned)) {
    throw new Error(
      "Set DATABASE_URL or DIRECT_URL before migrating or seeding. Refusing to connect to localhost, and refusing to fall back to another connection variable.",
    );
  }
  return cleaned;
}

