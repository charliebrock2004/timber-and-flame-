import assert from "node:assert/strict";
import test from "node:test";
import { requireExplicitDatabaseUrl, resolveDatabaseUrl } from "@/lib/database-url";

const REMOTE = "postgresql://u:p@ep-example-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";
const OTHER = "postgresql://u:p@other.example/neondb";

test("DATABASE_URL is used as-is when it is a postgres URL", () => {
  const resolved = resolveDatabaseUrl({ DATABASE_URL: REMOTE, DATABASE_POSTGRES_URL: OTHER });
  assert.equal(resolved.source, "DATABASE_URL");
  assert.equal(resolved.url, REMOTE);
});

test("a pasted DATABASE_URL is cleaned and still preferred", () => {
  const resolved = resolveDatabaseUrl({ DATABASE_URL: `psql '${REMOTE}'`, DATABASE_POSTGRES_URL: OTHER });
  assert.equal(resolved.url, REMOTE);
  assert.equal(resolved.source, "DATABASE_URL");
});

test("an explicit but invalid DATABASE_URL is not replaced with another variable", () => {
  assert.throws(
    () => resolveDatabaseUrl({ DATABASE_URL: "not-a-database", DATABASE_POSTGRES_URL: REMOTE }),
    /does not contain a postgres:\/\//,
  );
});

test("when DATABASE_URL is unset, the Neon integration URL is used", () => {
  const resolved = resolveDatabaseUrl({ DATABASE_POSTGRES_URL: `psql '${REMOTE}'` });
  assert.equal(resolved.source, "DATABASE_POSTGRES_URL");
  assert.equal(resolved.url, REMOTE);
});

test("POSTGRES_URL is the next fallback", () => {
  const resolved = resolveDatabaseUrl({ POSTGRES_URL: REMOTE });
  assert.equal(resolved.source, "POSTGRES_URL");
  assert.equal(resolved.url, REMOTE);
});

test("no connection string refuses to imply localhost", () => {
  assert.throws(() => resolveDatabaseUrl({}), /127\.0\.0\.1:5432/);
  assert.throws(() => resolveDatabaseUrl({ DATABASE_URL: "   " }), /127\.0\.0\.1:5432/);
});

test("Vercel refuses a localhost connection string", () => {
  assert.throws(
    () => resolveDatabaseUrl({ VERCEL: "1", DATABASE_URL: "postgres://tf:tf@127.0.0.1:5432/tf" }),
    /localhost database/,
  );
  assert.throws(
    () => resolveDatabaseUrl({ VERCEL: "1", DATABASE_POSTGRES_URL: "postgres://tf:tf@localhost:5432/tf" }),
    /localhost database/,
  );
});

test("migrate and seed ignore the integration fallback and refuse a missing URL", () => {
  assert.throws(() => requireExplicitDatabaseUrl({ DATABASE_POSTGRES_URL: REMOTE }), /Refusing to connect to localhost/);
  assert.equal(requireExplicitDatabaseUrl({ DATABASE_URL: REMOTE }), REMOTE);
  assert.equal(requireExplicitDatabaseUrl({ DIRECT_URL: OTHER, DATABASE_URL: REMOTE }), OTHER);
});

test("local development may still use localhost", () => {
  const url = "postgres://tf:tf@127.0.0.1:5432/tf";
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: url }).url, url);
});


