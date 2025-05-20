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
      SELECT * 
      FROM items 
      WHERE packing_list_id IS NULL
    `);
    
    console.log(`Found ${orphanedItems.length} items without packing_list_id`);

    // For orphaned items, we have two options:
    // 1. Assign them to a default packing list (if one exists)
    // 2. Delete them since they're orphaned and not connected to anything
    
    if (orphanedItems.length > 0) {
      console.log("Handling orphaned items...");
      
      // Get the first packing list to use as a default (if any exist)
      const packingLists = await db.execute(sql`SELECT id FROM packing_lists LIMIT 1`);
      
      if (packingLists.length > 0) {
        const defaultPackingListId = packingLists[0].id;
        console.log(`Assigning orphaned items to packing list ${defaultPackingListId}`);
        
        // Update orphaned items to use the default packing list
        await db.execute(sql`
          UPDATE items
          SET packing_list_id = ${defaultPackingListId}
          WHERE packing_list_id IS NULL
        `);
      } else {
        console.log("No packing lists found to assign orphaned items - deleting orphaned items");
        
        // If no packing lists exist, delete the orphaned items
        await db.execute(sql`
          DELETE FROM items
          WHERE packing_list_id IS NULL
        `);
      }
    }
    
    // Verify no more orphaned items
    const checkOrphanedItems = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM items 
      WHERE packing_list_id IS NULL
    `);
    
    console.log(`After handling orphans, ${checkOrphanedItems[0].count} items remain without packing_list_id`);
    
    // Now we can safely make the column NOT NULL
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