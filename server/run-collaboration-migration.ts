import { db } from './db';
import { sql } from 'drizzle-orm';

async function runCollaborationMigration() {
  console.log('Adding collaboration-related columns and tables to the database...');

  try {
    // Add created_by and last_modified_by columns to items
    await db.execute(sql`
      ALTER TABLE IF EXISTS items 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS last_modified_by INTEGER REFERENCES users(id);
    `);
    console.log('Added tracking columns to items table');

    // Create the packing_list_collaborators table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS packing_list_collaborators (
        packing_list_id INTEGER NOT NULL REFERENCES packing_lists(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        permission_level VARCHAR(20) DEFAULT 'editor' NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        PRIMARY KEY (packing_list_id, user_id)
      );
    `);
    console.log('Created packing_list_collaborators table');

    // Create the collaboration_invitations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS collaboration_invitations (
        id SERIAL PRIMARY KEY NOT NULL,
        packing_list_id INTEGER NOT NULL REFERENCES packing_lists(id),
        invited_by_user_id INTEGER NOT NULL REFERENCES users(id),
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        permission_level VARCHAR(20) DEFAULT 'editor' NOT NULL,
        accepted BOOLEAN DEFAULT FALSE NOT NULL,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      );
    `);
    console.log('Created collaboration_invitations table');

    console.log('Collaboration migration completed successfully');
  } catch (error) {
    console.error('Error running collaboration migration:', error);
    throw error;
  }
}

runCollaborationMigration()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });