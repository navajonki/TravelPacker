import { db } from './db';
import { sql } from 'drizzle-orm';

async function createPasswordResetTable() {
  try {
    console.log('Creating password_reset_tokens table...');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) UNIQUE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Password reset tokens table created successfully');
  } catch (error) {
    console.error('Error creating password reset tokens table:', error);
    throw error;
  }
}

// Run the migration
createPasswordResetTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });