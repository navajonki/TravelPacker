import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function runMigrations() {
  // Create postgres connection for migrations (need to set a custom max batch size)
  const migrationClient = postgres(process.env.DATABASE_URL || "", { max: 1 });
  const db = drizzle(migrationClient);

  console.log("Running migrations...");
  
  try {
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    // Close the migration client
    await migrationClient.end();
  }
}

runMigrations();