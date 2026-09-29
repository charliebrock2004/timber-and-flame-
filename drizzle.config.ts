import { defineConfig } from "drizzle-kit";
import { cleanDatabaseUrl } from "./lib/database-url";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: cleanDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL)! },
});
