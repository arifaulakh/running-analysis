import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "@/lib/db/schema";

let client: postgres.Sql | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!client) {
    client = postgres(process.env.DATABASE_URL, {
      max: 3,
      prepare: false
    });
    database = drizzle(client, { schema });
  }

  return database!;
}
