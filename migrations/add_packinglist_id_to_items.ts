import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateItems() {
  console.log("Starting migration to add packing_list_id to items table");

  try {
    // First, add the packing_list_id column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS packing_list_id INTEGER REFERENCES packing_lists(id)
    `);
    
    console.log("Added packing_list_id column to items table");

    // Update items with category_id by getting the packing_list_id from categories
    await db.execute(sql`
      UPDATE items
      SET packing_list_id = c.packing_list_id
      FROM categories c
      WHERE items.category_id = c.id AND items.packing_list_id IS NULL
    `);
    
    console.log("Updated items with packing_list_id from categories");

    // Update items with bag_id by getting the packing_list_id from bags
    await db.execute(sql`
      UPDATE items
      SET packing_list_id = b.packing_list_id
      FROM bags b
      WHERE items.bag_id = b.id AND items.packing_list_id IS NULL
    `);
    
    console.log("Updated items with packing_list_id from bags");

    // Update items with traveler_id by getting the packing_list_id from travelers
    await db.execute(sql`
      UPDATE items
      SET packing_list_id = t.packing_list_id
      FROM travelers t
      WHERE items.traveler_id = t.id AND items.packing_list_id IS NULL
    `);
    
    console.log("Updated items with packing_list_id from travelers");

    // Check if any items are missing packing_list_id
    const orphanedItems = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE packing_list_id IS NULL
    `);
    
    console.log(`Found ${orphanedItems[0].count} items without packing_list_id`);

    // Make the column NOT NULL after migration
    await db.execute(sql`
      ALTER TABLE items 
      ALTER COLUMN packing_list_id SET NOT NULL
    `);
    
    console.log("Set packing_list_id column to NOT NULL");
    
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
migrateItems().then(() => {
  console.log("Migration script complete");
  process.exit(0);
}).catch((error) => {
  console.error("Migration script failed:", error);
  process.exit(1);
});