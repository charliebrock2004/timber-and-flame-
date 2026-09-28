/**
 * `npm run test:e2e` step 1: fresh local test database (migrations + seed,
 * exactly as production is set up), then a production build to test.
 */
import { execSync } from "node:child_process";
import { Client } from "pg";
import { E2E_DB, serverEnv } from "./env";

async function main() {
  const url = new URL(E2E_DB);
  const dbName = url.pathname.slice(1);
  const admin = new URL(E2E_DB);
  admin.pathname = "/postgres";
  const c0 = new Client({ connectionString: admin.toString() });
  await c0.connect();
  const exists = await c0.query("select 1 from pg_database where datname = $1", [dbName]);
  if (!exists.rowCount) await c0.query(`create database "${dbName.replace(/"/g, "")}"`);
  await c0.end();

  const c = new Client({ connectionString: E2E_DB });
  await c.connect();
  await c.query("drop schema if exists drizzle cascade; drop schema public cascade; create schema public;");
  await c.end();

  const env = { ...process.env, ...serverEnv(E2E_DB), DIRECT_URL: E2E_DB };
  execSync("npm run db:migrate", { stdio: "inherit", env });
  execSync("npm run db:seed", { stdio: "inherit", env });
  if (!process.env.E2E_SKIP_BUILD) execSync("npx next build", { stdio: "inherit", env });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
