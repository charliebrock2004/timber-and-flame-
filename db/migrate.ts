/** Applies pending SQL migrations in db/migrations. `npm run db:migrate` */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { cleanDatabaseUrl } from "../lib/database-url";

const pool = new Pool({ connectionString: cleanDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL) });

migrate(drizzle(pool), { migrationsFolder: "./db/migrations" })
  .then(() => console.log("Migrations applied."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
