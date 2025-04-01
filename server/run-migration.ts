import { db } from './db';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the current file's directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running migration to make theme column optional...');
    const migrationFilePath = resolve(__dirname, '../migrations/alter_packing_lists_theme_to_null.sql');
    const migrationSQL = readFileSync(migrationFilePath, 'utf8');
    
    // Execute the SQL directly
    await db.execute(migrationSQL);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  }
}

runMigration()
  .then(() => {
    console.log('All migrations completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });