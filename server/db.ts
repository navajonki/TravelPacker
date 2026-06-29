// Load environment variables first
import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

/**
 * Decide the SSL mode for a Postgres connection string.
 *
 * Railway's private network (`*.railway.internal`) and local development do not
 * use TLS, so we connect in plaintext there. For any other host (e.g. Railway's
 * public `*.proxy.rlwy.net` URL or another managed Postgres) we require SSL.
 * postgres-js's `'require'` mode encrypts without verifying the CA, which matches
 * the self-signed certs these managed proxies present.
 */
export function getPostgresSsl(url: string): false | "require" {
  if (!url) return false;
  if (url.includes("railway.internal")) return false;
  if (url.includes("localhost") || url.includes("127.0.0.1")) return false;
  return "require";
}

// Create the postgres connection
const connectionString = process.env.DATABASE_URL || "";
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}
const client = postgres(connectionString, { ssl: getPostgresSsl(connectionString) });
export const db = drizzle(client, { schema });