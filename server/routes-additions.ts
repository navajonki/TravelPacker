// Endpoints for unassigned items

// Get all items for a packing list (including those with null references)
app.get("/api/packing-lists/:id/all-items", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const packingListId = Number(id);
    
    if (isNaN(packingListId)) {
      return res.status(400).json({ message: "Invalid packing list ID" });
    }
    
    // Check if the user can access this packing list
    const hasAccess = await storage.canUserAccessPackingList(req.user!.id, packingListId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Fetch all items for this packing list
    const items = await storage.getAllItemsByPackingList(packingListId);
    
    // Log the count of items with NULL fields for debugging
    const itemsWithNullCategory = items.filter(item => item.categoryId === null);
    const itemsWithNullBag = items.filter(item => item.bagId === null);
    const itemsWithNullTraveler = items.filter(item => item.travelerId === null);
    
    console.log(`[DEBUG] Items with null fields for packing list ${packingListId}:
      - Null categoryId: ${itemsWithNullCategory.length}
      - Null bagId: ${itemsWithNullBag.length}
      - Null travelerId: ${itemsWithNullTraveler.length}`);
    
    // Return all items
    res.json(items);
  } catch (error) {
    console.error("Error fetching all packing list items:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get unassigned items for a specific view (category/bag/traveler)
app.get("/api/packing-lists/:id/unassigned/:type", isAuthenticated, async (req, res) => {
  try {
    const { id, type } = req.params;
    const packingListId = Number(id);
    
    if (isNaN(packingListId)) {
      return res.status(400).json({ message: "Invalid packing list ID" });
    }
    
    if (!['category', 'bag', 'traveler'].includes(type)) {
      return res.status(400).json({ message: "Invalid type parameter. Must be 'category', 'bag', or 'traveler'" });
    }
    
    // Check if the user can access this packing list
    const hasAccess = await storage.canUserAccessPackingList(req.user!.id, packingListId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Get all items for the packing list
    const allItems = await storage.getAllItemsByPackingList(packingListId);
    
    // Filter based on the type
    let unassignedItems = [];
    if (type === 'category') {
      unassignedItems = allItems.filter(item => item.categoryId === null);
    } else if (type === 'bag') {
      unassignedItems = allItems.filter(item => item.bagId === null);
    } else if (type === 'traveler') {
      unassignedItems = allItems.filter(item => item.travelerId === null);
    }
    
    // Add an extra check to verify we're getting items with the correct field value
    if (type === 'category' && unassignedItems.length === 0) {
      console.warn(`[WARNING] No uncategorized items found for packing list ${packingListId} - double-checking database directly`);
      // Try a more direct approach as fallback
      const { db } = require('./db');
      const { items } = require('@shared/schema');
      const { eq, and, isNull } = require('drizzle-orm');
      
      // Direct query to find items with NULL categoryId for this packingList
      const directQueryResults = await db.select().from(items).where(
        and(
          eq(items.packingListId, packingListId),
          isNull(items.categoryId)
        )
      );
      
      if (directQueryResults.length > 0) {
        console.warn(`[WARNING] Found ${directQueryResults.length} uncategorized items with direct query, but main query returned 0. Using direct results.`);
        unassignedItems = directQueryResults;
      }
    }
    
    console.log(`[DEBUG] Found ${unassignedItems.length} unassigned items of type '${type}' for packing list ${packingListId}`);
    if (unassignedItems.length > 0) {
      // Log the first few items to help debugging
      console.log(`[DEBUG] Sample unassigned ${type} items:`, 
        unassignedItems.slice(0, 3).map(i => ({ 
          id: i.id, 
          name: i.name, 
          packingListId: i.packingListId, 
          categoryId: i.categoryId,
          bagId: i.bagId,
          travelerId: i.travelerId
        }))
      );
    }
    
    // Return the unassigned items
    res.json(unassignedItems);
  } catch (error) {
    console.error(`Error fetching unassigned ${req.params.type} items:`, error);
    res.status(500).json({ message: "Internal server error" });
  }
});