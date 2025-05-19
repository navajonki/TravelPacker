import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import passport from "passport";
import { isAuthenticated, hashPassword } from "./auth";
import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { items } from "@shared/schema";
import { 
  insertUserSchema,
  insertPackingListSchema, 
  insertBagSchema, 
  insertTravelerSchema, 
  insertCategorySchema, 
  insertItemSchema,
  insertTemplateSchema,
  insertCollaboratorSchema,
  insertInvitationSchema,
  collaborationInvitations,
  packingListCollaborators,
  type User
} from "@shared/schema";

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = app.route('/api');
  
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password using the helper function
      const hashedPassword = await hashPassword(req.body.password);
      
      // Create user with hashed password
      const userData = insertUserSchema.parse({
        username: req.body.username,
        password: hashedPassword
      });
      
      const user = await storage.createUser(userData);
      
      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed after registration" });
        }
        return res.status(201).json({ 
          id: user.id, 
          username: user.username 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });
  
  app.post("/api/auth/login", passport.authenticate("local"), (req, res) => {
    // If this function is called, authentication was successful
    // req.user contains the authenticated user
    const user = req.user as User;
    res.json({ 
      id: user.id,
      username: user.username
    });
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  
  app.get("/api/auth/current-user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ authenticated: false });
    }
    
    const user = req.user as User;
    res.json({ 
      authenticated: true,
      user: {
        id: user.id,
        username: user.username
      }
    });
  });
  
  // Current user endpoint for frontend
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = req.user as User;
    // Return user without the password
    res.json({
      id: user.id,
      username: user.username
    });
  });

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      return res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.json({ id: user.id, username: user.username });
  });

  // PackingLists routes - protected by authentication
  app.get("/api/packing-lists", isAuthenticated, async (req, res) => {
    // Get the current authenticated user's ID
    const user = req.user as User;
    const userId = user.id;
    
    console.log(`[DEBUG] GET /api/packing-lists for user ID: ${userId}`);
    
    // Get both owned and shared lists
    const ownedLists = await storage.getPackingLists(userId);
    console.log(`[DEBUG] Owned lists for user ${userId}:`, ownedLists.map(l => l.id));
    
    const sharedLists = await storage.getSharedPackingLists(userId);
    console.log(`[DEBUG] Shared lists for user ${userId}:`, sharedLists.map(l => l.id));
    
    // Double-check collaborator access for packing list 2 (for debugging)
    const hasAccessToList2 = await storage.canUserAccessPackingList(userId, 2);
    console.log(`[DEBUG] User ${userId} access to list 2: ${hasAccessToList2}`);
    
    // Check for collaborator records
    const collaboratorRecords = await db
      .select()
      .from(packingListCollaborators)
      .where(eq(packingListCollaborators.userId, userId));
    console.log(`[DEBUG] Raw collaborator records for user ${userId}:`, collaboratorRecords);
    
    // Combine all lists, marking shared ones
    const allPackingLists = [
      ...ownedLists.map(list => ({ ...list, isOwner: true, isShared: false })),
      ...sharedLists.map(list => ({ ...list, isOwner: false, isShared: true }))
    ];
    
    const lists = await Promise.all(
      allPackingLists.map(async (list) => {
        const items = await storage.getAllItemsByPackingList(list.id);
        const totalItems = items.length;
        const packedItems = items.filter(item => item.packed).length;
        const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
        
        return {
          ...list,
          itemCount: totalItems,
          packedItemCount: packedItems,
          progress
        };
      })
    );
    
    return res.json(lists);
  });

  app.get("/api/packing-lists/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const packingList = await storage.getPackingList(id);
    
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if the authenticated user owns this packing list or has access as a collaborator
    const user = req.user as User;
    const hasAccess = await storage.canUserAccessPackingList(user.id, id);
    
    if (packingList.userId !== user.id && !hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Check if the user is the owner or a collaborator
    const isOwner = packingList.userId === user.id;
    
    const items = await storage.getAllItemsByPackingList(id);
    const totalItems = items.length;
    const packedItems = items.filter(item => item.packed).length;
    const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
    
    return res.json({
      ...packingList,
      itemCount: totalItems,
      packedItemCount: packedItems,
      progress,
      isOwner,
      isShared: !isOwner
    });
  });

  app.post("/api/packing-lists", isAuthenticated, async (req, res) => {
    try {
      // Get the current authenticated user's ID
      const user = req.user as User;
      
      // Merge the user ID with the request data
      const data = insertPackingListSchema.parse({
        ...req.body,
        userId: user.id // Set the userId from the authenticated user
      });
      
      const packingList = await storage.createPackingList(data);
      
      // Create default bags
      await storage.createBag({ name: "Carry-on", packingListId: packingList.id });
      await storage.createBag({ name: "Checked", packingListId: packingList.id });
      
      // Create default traveler
      await storage.createTraveler({ name: "Me", packingListId: packingList.id });
      
      // Create default categories
      await storage.createCategory({ name: "Essentials", position: 0, packingListId: packingList.id });
      await storage.createCategory({ name: "Clothing", position: 1, packingListId: packingList.id });
      await storage.createCategory({ name: "Electronics", position: 2, packingListId: packingList.id });
      
      return res.status(201).json(packingList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/packing-lists/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    // Check if packing list exists and belongs to the authenticated user
    const existingList = await storage.getPackingList(id);
    if (!existingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (existingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to update this packing list" });
    }
    
    try {
      const data = insertPackingListSchema.partial().parse(req.body);
      
      // Never allow changing the userId
      if (data.userId && data.userId !== user.id) {
        delete data.userId;
      }
      
      const packingList = await storage.updatePackingList(id, data);
      
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      return res.json(packingList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/packing-lists/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const packingList = await storage.getPackingList(id);
    
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if the authenticated user owns this packing list
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to delete this packing list" });
    }
    
    await storage.deletePackingList(id);
    return res.status(204).end();
  });

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
      
      console.log(`[DEBUG] Found ${unassignedItems.length} unassigned items of type '${type}' for packing list ${packingListId}`);
      
      // Return the unassigned items
      res.json(unassignedItems);
    } catch (error) {
      console.error(`Error fetching unassigned ${req.params.type} items:`, error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Bags routes
  app.get("/api/packing-lists/:listId/bags", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Verify ownership or collaboration permission
    const user = req.user as User;
    const canAccess = await storage.canUserAccessPackingList(user.id, listId);
    
    if (!canAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    const bags = await storage.getBags(listId);
    
    // Get all items for this packing list
    const allItems = await storage.getAllItemsByPackingList(listId);
    
    // For each bag, find its items and calculate progress
    const bagsWithItemsAndProgress = bags.map(bag => {
      const bagItems = allItems.filter(item => item.bagId === bag.id);
      const totalItems = bagItems.length;
      const packedItems = bagItems.filter(item => item.packed).length;
      
      return {
        ...bag,
        items: bagItems,
        totalItems,
        packedItems,
        progress: totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
      };
    });
    
    return res.json(bagsWithItemsAndProgress);
  });

  app.post("/api/bags", isAuthenticated, async (req, res) => {
    try {
      const data = insertBagSchema.parse(req.body);
      
      // Verify user can access the packing list this bag belongs to
      const packingList = await storage.getPackingList(data.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Verify ownership
      const user = req.user as User;
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to modify this packing list" });
      }
      
      const bag = await storage.createBag(data);
      return res.status(201).json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/bags/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    // Get the bag to check ownership via the packing list
    const bag = await storage.getBag(id);
    if (!bag) {
      return res.status(404).json({ message: "Bag not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(bag.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to modify this bag" });
    }
    
    try {
      const data = insertBagSchema.partial().parse(req.body);
      
      // Don't allow changing the packingListId to a list the user doesn't own
      if (data.packingListId && data.packingListId !== bag.packingListId) {
        const targetPackingList = await storage.getPackingList(data.packingListId);
        if (!targetPackingList || targetPackingList.userId !== user.id) {
          delete data.packingListId;
        }
      }
      
      const updatedBag = await storage.updateBag(id, data);
      
      if (!updatedBag) {
        return res.status(404).json({ message: "Bag not found" });
      }
      
      return res.json(updatedBag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/bags/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid id parameter" });
      }
      
      const bag = await storage.getBag(id);
      
      if (!bag) {
        return res.status(404).json({ message: "Bag not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(bag.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to delete this bag" });
      }
      
      try {
        // First, get the list of all items currently in this bag
        const allItems = await storage.getAllItemsByPackingList(packingList.id);
        const itemsInBag = allItems.filter(item => item.bagId === id);
        
        console.log(`[DELETION DEBUG] Bag ID ${id} being deleted, found ${itemsInBag.length} items to unassign`);
        if (itemsInBag.length > 0) {
          console.log(`[DELETION DEBUG] Items in bag: ${JSON.stringify(itemsInBag.map(item => ({ id: item.id, name: item.name })))}`);
        }
        
        // Use a direct SQL query to unlink all items from this bag 
        // This is more reliable than individually updating items
        console.log(`[DELETION DEBUG] Unlinking all items from bag ${id} using direct SQL`);
        const result = await db.execute(sql`
          UPDATE items 
          SET bag_id = NULL, 
              last_modified_by = ${user.id} 
          WHERE bag_id = ${id}
        `);
        
        console.log(`[DELETION DEBUG] SQL update result:`, result);
        
        // Verify no items are still linked to this bag
        const checkItems = await db.select().from(items).where(
          sql`bag_id = ${id}`
        );
        
        console.log(`[DELETION DEBUG] After update, found ${checkItems.length} items still referencing bag ${id}`);
        
        if (checkItems.length > 0) {
          console.error(`[ERROR] Some items (${checkItems.length}) are still linked to bag ${id} after update`);
          return res.status(500).json({
            message: "Failed to unlink all items from the bag. Cannot delete."
          });
        }
        
        // Now safely delete the bag
        await storage.deleteBag(id);
      } catch (innerError: any) {
        console.error(`[ERROR] Detailed bag deletion error:`, innerError);
        return res.status(500).json({
          message: `Failed to delete the bag: ${innerError.message || 'Unknown error'}`
        });
      }
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting bag:", error);
      return res.status(500).json({
        message: "Failed to delete the bag. Make sure all items are properly unassigned."
      });
    }
    
    // Refresh the client after deletion to ensure proper UI update
    res.set('Cache-Control', 'no-cache, no-store');
  });

  // Travelers routes
  app.get("/api/packing-lists/:listId/travelers", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Verify ownership or collaboration permission
    const user = req.user as User;
    const canAccess = await storage.canUserAccessPackingList(user.id, listId);
    
    if (!canAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    const travelers = await storage.getTravelers(listId);
    
    // Get all items for this packing list
    const allItems = await storage.getAllItemsByPackingList(listId);
    
    // For each traveler, find its items and calculate progress
    const travelersWithItemsAndProgress = travelers.map(traveler => {
      const travelerItems = allItems.filter(item => item.travelerId === traveler.id);
      const totalItems = travelerItems.length;
      const packedItems = travelerItems.filter(item => item.packed).length;
      
      return {
        ...traveler,
        items: travelerItems,
        totalItems,
        packedItems,
        progress: totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
      };
    });
    
    return res.json(travelersWithItemsAndProgress);
  });

  app.post("/api/travelers", isAuthenticated, async (req, res) => {
    try {
      const data = insertTravelerSchema.parse(req.body);
      
      // Verify user can access the packing list this traveler belongs to
      const packingList = await storage.getPackingList(data.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Verify ownership
      const user = req.user as User;
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to modify this packing list" });
      }
      
      const traveler = await storage.createTraveler(data);
      return res.status(201).json(traveler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/travelers/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    // Get the traveler to check ownership via the packing list
    const traveler = await storage.getTraveler(id);
    if (!traveler) {
      return res.status(404).json({ message: "Traveler not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(traveler.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to modify this traveler" });
    }
    
    try {
      const data = insertTravelerSchema.partial().parse(req.body);
      
      // Don't allow changing the packingListId to a list the user doesn't own
      if (data.packingListId && data.packingListId !== traveler.packingListId) {
        const targetPackingList = await storage.getPackingList(data.packingListId);
        if (!targetPackingList || targetPackingList.userId !== user.id) {
          delete data.packingListId;
        }
      }
      
      const updatedTraveler = await storage.updateTraveler(id, data);
      
      if (!updatedTraveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }
      
      return res.json(updatedTraveler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/travelers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid id parameter" });
      }
      
      const traveler = await storage.getTraveler(id);
      
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(traveler.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to delete this traveler" });
      }
      
      try {
        // First get the list of all items currently assigned to this traveler
        const allItems = await storage.getAllItemsByPackingList(packingList.id);
        const itemsWithTraveler = allItems.filter(item => item.travelerId === id);
        
        console.log(`[DELETION DEBUG] Traveler ID ${id} being deleted, found ${itemsWithTraveler.length} items to unassign`);
        if (itemsWithTraveler.length > 0) {
          console.log(`[DELETION DEBUG] Items with traveler: ${JSON.stringify(itemsWithTraveler.map(item => ({ id: item.id, name: item.name })))}`);
        }
        
        // Use a direct SQL query to unlink all items from this traveler
        // This is more reliable than individually updating items
        console.log(`[DELETION DEBUG] Unlinking all items from traveler ${id} using direct SQL`);
        const result = await db.execute(sql`
          UPDATE items 
          SET traveler_id = NULL, 
              last_modified_by = ${user.id} 
          WHERE traveler_id = ${id}
        `);
        
        console.log(`[DELETION DEBUG] SQL update result:`, result);
        
        // Verify no items are still linked to this traveler
        const checkItems = await db.select().from(items).where(
          sql`traveler_id = ${id}`
        );
        
        console.log(`[DELETION DEBUG] After update, found ${checkItems.length} items still referencing traveler ${id}`);
        
        if (checkItems.length > 0) {
          console.error(`[ERROR] Some items (${checkItems.length}) are still linked to traveler ${id} after update`);
          return res.status(500).json({
            message: "Failed to unlink all items from the traveler. Cannot delete."
          });
        }
        
        // Now safely delete the traveler
        await storage.deleteTraveler(id);
      } catch (innerError: any) {
        console.error(`[ERROR] Detailed traveler deletion error:`, innerError);
        return res.status(500).json({
          message: `Failed to delete the traveler: ${innerError.message || 'Unknown error'}`
        });
      }
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting traveler:", error);
      return res.status(500).json({
        message: "Failed to delete the traveler. Make sure all items are properly unassigned."
      });
    }
  });

  // Categories routes
  app.get("/api/packing-lists/:listId/categories", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if the authenticated user has access to this packing list
    const user = req.user as User;
    const hasAccess = await storage.canUserAccessPackingList(user.id, listId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Get categories
    const categories = await storage.getCategories(listId);
    
    // Get items and calculate progress for each category
    const categoriesWithItemsAndProgress = await Promise.all(
      categories.map(async (category) => {
        const items = await storage.getItems(category.id);
        const totalItems = items.length;
        const packedItems = items.filter(item => item.packed).length;
        
        return {
          ...category,
          items,
          totalItems,
          packedItems,
          progress: totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0
        };
      })
    );
    
    return res.json(categoriesWithItemsAndProgress);
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      
      // Verify the packing list exists
      const packingList = await storage.getPackingList(data.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Check if the user has access to this packing list
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, data.packingListId);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to modify this packing list" });
      }
      
      const category = await storage.createCategory(data);
      return res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/categories/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    // Get the category to check ownership via the packing list
    const category = await storage.getCategory(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(category.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to modify this category" });
    }
    
    try {
      const data = insertCategorySchema.partial().parse(req.body);
      
      // Don't allow changing the packingListId to a list the user doesn't own
      if (data.packingListId && data.packingListId !== category.packingListId) {
        const targetPackingList = await storage.getPackingList(data.packingListId);
        if (!targetPackingList || targetPackingList.userId !== user.id) {
          delete data.packingListId;
        }
      }
      
      const updatedCategory = await storage.updateCategory(id, data);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid id parameter" });
      }
      
      const category = await storage.getCategory(id);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(category.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to delete this category" });
      }
      
      // Check if there are any other categories to move items to
      const otherCategories = (await storage.getCategories(category.packingListId))
        .filter(c => c.id !== id);
      
      if (otherCategories.length === 0) {
        // If this is the only category, we can't delete it
        return res.status(400).json({ 
          message: "Cannot delete the only category. Create another category first or move all items to another category." 
        });
      }
      
      // Get all items in this category
      const itemsToMove = await storage.getItems(id);
      
      console.log(`[DELETION DEBUG] Category ID ${id} being deleted, found ${itemsToMove.length} items to unassign`);
      
      if (itemsToMove.length > 0) {
        console.log(`[DELETION DEBUG] Items to move: ${JSON.stringify(itemsToMove.map(item => ({ id: item.id, name: item.name })))}`);
        
        // Try direct SQL approach first for better reliability
        try {
          console.log(`[DELETION DEBUG] Applying direct SQL update to set categoryId to NULL for all items in category ${id}`);
          
          const result = await db.execute(sql`
            UPDATE items 
            SET category_id = NULL, 
                last_modified_by = ${user.id}
            WHERE category_id = ${id}
          `);
          
          console.log(`[DELETION DEBUG] SQL update result:`, result);
          
          // Verify the update worked by checking if items still reference this category
          const checkResult = await db.select().from(items).where(sql`category_id = ${id}`);
          console.log(`[DELETION DEBUG] After update, found ${checkResult.length} items still referencing category ${id}`);
          
          if (checkResult.length > 0) {
            console.log(`[DELETION DEBUG] WARNING: Some items still reference the category after SQL update`);
          }
        } catch (sqlError) {
          console.error(`[DELETION DEBUG] Error in direct SQL update:`, sqlError);
          
          // Fall back to individual updates if SQL approach fails
          console.log(`[DELETION DEBUG] Falling back to individual item updates`);
          for (const item of itemsToMove) {
            try {
              console.log(`[DELETION DEBUG] Setting categoryId to NULL for item ${item.id} (${item.name})`);
              await storage.updateItem(item.id, { 
                categoryId: null,
                lastModifiedBy: user.id 
              });
              
              // Verify the update worked
              const updatedItem = await storage.getItem(item.id);
              console.log(`[DELETION DEBUG] Item ${item.id} after update: categoryId = ${updatedItem?.categoryId}`);
            } catch (itemError) {
              console.error(`[DELETION DEBUG] Error moving item ${item.id} to uncategorized:`, itemError);
              return res.status(500).json({
                message: `Failed to move item ${item.id} (${item.name}) to the uncategorized section.`
              });
            }
          }
        }
      }
      
      // Now safely delete the category after items have been moved
      try {
        await storage.deleteCategory(id);
      } catch (deleteError) {
        console.error("Error deleting category:", deleteError);
        return res.status(500).json({
          message: "Failed to delete category. Make sure all items are moved to a different category first."
        });
      }
      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ 
        message: "Failed to delete category. Make sure all items are moved to a different category first." 
      });
    }
  });

  // Items routes
  app.get("/api/items/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Get the category to find the packing list
    const category = await storage.getCategory(item.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Associated category not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(category.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to view this item" });
    }
    
    return res.json(item);
  });

  app.get("/api/categories/:categoryId/items", isAuthenticated, async (req, res) => {
    const categoryId = parseInt(req.params.categoryId);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId parameter" });
    }
    
    // Get the category to find the packing list
    const category = await storage.getCategory(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(category.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to view items in this category" });
    }
    
    const items = await storage.getItems(categoryId);
    return res.json(items);
  });

  app.post("/api/items", isAuthenticated, async (req, res) => {
    try {
      const data = insertItemSchema.parse(req.body);
      
      if (data.dueDate) {
        const dueDateObj = new Date(data.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      // Verify that the category belongs to a packing list owned by the user
      const category = await storage.getCategory(data.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(category.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to create items in this category" });
      }
      
      // Set the createdBy field to track who created this item
      const itemData = {
        ...data,
        createdBy: user.id,
        lastModifiedBy: user.id
      };
      
      const item = await storage.createItem(itemData);
      return res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/items/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      // Get the item first to check ownership
      const existingItem = await storage.getItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      // Get the category to find the packing list
      const category = await storage.getCategory(existingItem.categoryId);
      if (!category) {
        return res.status(404).json({ message: "Associated category not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(category.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to update this item" });
      }
      
      const data = insertItemSchema.partial().parse(req.body);
      
      // Add the lastModifiedBy field to track who updated this item
      data.lastModifiedBy = user.id;
      
      if (data.dueDate) {
        const dueDateObj = new Date(data.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const item = await storage.updateItem(id, data);
      return res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/items/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    // Get the category to find the packing list
    const category = await storage.getCategory(item.categoryId);
    if (!category) {
      return res.status(404).json({ message: "Associated category not found" });
    }
    
    // Check if the packing list belongs to the authenticated user
    const packingList = await storage.getPackingList(category.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Verify ownership or collaborator access
    const user = req.user as User;
    const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to delete this item" });
    }
    
    await storage.deleteItem(id);
    return res.status(204).end();
  });

  // CSV Export endpoint
  app.get("/api/packing-lists/:id/export", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid packing list ID" });
      }
      
      // Get the packing list
      const packingList = await storage.getPackingList(id);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Verify ownership
      const user = req.user as User;
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "You don't have permission to export this packing list" });
      }
      
      // Get all items for the packing list
      const items = await storage.getAllItemsByPackingList(id);
      
      // Get all categories, bags, and travelers to include their names in the export
      const categories = await storage.getCategories(id);
      const bags = await storage.getBags(id);
      const travelers = await storage.getTravelers(id);
      
      // Create lookup maps for category, bag, and traveler names
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      const bagMap = new Map(bags.map(b => [b.id, b.name]));
      const travelerMap = new Map(travelers.map(t => [t.id, t.name]));
      
      // CSV header row
      let csv = "Name,Category,Quantity,Packed,Essential,Bag,Traveler,Due Date\n";
      
      // Add each item as a row in the CSV
      for (const item of items) {
        const categoryName = categoryMap.get(item.categoryId) || '';
        const bagName = item.bagId ? bagMap.get(item.bagId) || '' : '';
        const travelerName = item.travelerId ? travelerMap.get(item.travelerId) || '' : '';
        
        // Format the date (if exists)
        const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '';
        
        // Escape any commas in text fields
        const escapeCsv = (text: any) => {
          if (text === null || text === undefined) return '';
          const str = String(text);
          return str.includes(',') ? `"${str}"` : str;
        };
        
        // Construct the CSV row
        csv += [
          escapeCsv(item.name),
          escapeCsv(categoryName),
          item.quantity || 1,
          item.packed ? 'Yes' : 'No',
          item.isEssential ? 'Yes' : 'No',
          escapeCsv(bagName),
          escapeCsv(travelerName),
          dueDate
        ].join(',') + '\n';
      }
      
      // Set the appropriate headers for a CSV file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${packingList.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_packing_list.csv"`);
      
      // Send the CSV data
      return res.send(csv);
    } catch (error) {
      console.error("Error exporting packing list:", error);
      return res.status(500).json({ message: "Failed to export packing list" });
    }
  });

  // Removing the problematic /api/items/bulk-update endpoint and creating a new one
  
  // Multi-item update endpoint
  app.post("/api/items/multi-edit", isAuthenticated, async (req, res) => {
    try {
      console.log("Received multi-edit request with body:", JSON.stringify(req.body));
      
      const { itemIds, updates } = req.body;
      const user = req.user as User;
      
      // Basic validation
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          message: "Invalid or empty itemIds array",
          success: false
        });
      }
      
      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          message: "Invalid updates object",
          success: false
        });
      }
      
      console.log("Processing multi-edit for items:", itemIds);
      console.log("With updates:", updates);
      
      // Track success/failure for each item
      const results = [];
      let successCount = 0;
      
      // Parse and validate the updates
      let parsedUpdates;
      try {
        parsedUpdates = insertItemSchema.partial().parse(updates);
      } catch (parseError) {
        if (parseError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: "Invalid update data format",
            errors: parseError.errors,
            success: false
          });
        }
        throw parseError;
      }
      
      // Update each item individually
      for (const itemId of itemIds) {
        try {
          const numericId = Number(itemId);
          
          if (isNaN(numericId)) {
            results.push({ id: itemId, success: false, message: "Invalid ID format" });
            continue;
          }
          
          // Check if item exists
          const item = await storage.getItem(numericId);
          
          if (!item) {
            results.push({ id: numericId, success: false, message: "Item not found" });
            continue;
          }
          
          // Get the category to check ownership via the packing list
          const category = await storage.getCategory(item.categoryId);
          if (!category) {
            results.push({ id: numericId, success: false, message: "Category not found" });
            continue;
          }
          
          // Check if the packing list belongs to the authenticated user
          const packingList = await storage.getPackingList(category.packingListId);
          if (!packingList) {
            results.push({ id: numericId, success: false, message: "Packing list not found" });
            continue;
          }
          
          // Verify ownership or collaborator access
          const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
          
          if (!hasAccess) {
            results.push({ id: numericId, success: false, message: "Not authorized to modify this item" });
            continue;
          }
          
          // Add lastModifiedBy field to track who made the changes
          const itemUpdateData = {
            ...parsedUpdates,
            lastModifiedBy: user.id
          };
          
          // Apply the updates to the item
          const updatedItem = await storage.updateItem(numericId, itemUpdateData);
          
          if (updatedItem) {
            results.push({ id: numericId, success: true });
            successCount++;
          } else {
            results.push({ id: numericId, success: false, message: "Failed to update item" });
          }
        } catch (itemError) {
          console.error(`Error updating item ${itemId}:`, itemError);
          results.push({ 
            id: itemId, 
            success: false, 
            message: itemError instanceof Error ? itemError.message : "Unknown error" 
          });
        }
      }
      
      // Return detailed results
      return res.json({
        success: successCount > 0,
        totalItems: itemIds.length,
        updatedCount: successCount,
        results
      });
      
    } catch (error) {
      console.error("Unexpected error in multi-edit endpoint:", error);
      return res.status(500).json({
        message: "Server error processing multi-edit request",
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Bulk update routes by category, bag, traveler
  app.patch("/api/categories/:categoryId/bulk-update-items", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId parameter" });
      }
      
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(category.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to modify items in this category" });
      }
      
      // Add lastModifiedBy field to track who made the changes
      const updateData = {
        ...req.body,
        lastModifiedBy: user.id
      };
      
      const parsedData = insertItemSchema.partial().parse(updateData);
      
      if (parsedData.dueDate) {
        const dueDateObj = new Date(parsedData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const updatedCount = await storage.bulkUpdateItemsByCategory(categoryId, parsedData);
      return res.json({ updatedCount });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/bags/:bagId/bulk-update-items", isAuthenticated, async (req, res) => {
    try {
      const bagId = parseInt(req.params.bagId);
      
      if (isNaN(bagId)) {
        return res.status(400).json({ message: "Invalid bagId parameter" });
      }
      
      const bag = await storage.getBag(bagId);
      if (!bag) {
        return res.status(404).json({ message: "Bag not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(bag.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to modify items in this bag" });
      }
      
      // Add lastModifiedBy field to track who made the changes
      const updateData = {
        ...req.body,
        lastModifiedBy: user.id
      };
      
      const parsedData = insertItemSchema.partial().parse(updateData);
      
      if (parsedData.dueDate) {
        const dueDateObj = new Date(parsedData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const updatedCount = await storage.bulkUpdateItemsByBag(bagId, parsedData);
      return res.json({ updatedCount });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/travelers/:travelerId/bulk-update-items", isAuthenticated, async (req, res) => {
    try {
      const travelerId = parseInt(req.params.travelerId);
      
      if (isNaN(travelerId)) {
        return res.status(400).json({ message: "Invalid travelerId parameter" });
      }
      
      const traveler = await storage.getTraveler(travelerId);
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }
      
      // Check if the packing list belongs to the authenticated user
      const packingList = await storage.getPackingList(traveler.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      // Verify ownership or collaborator access
      const user = req.user as User;
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingList.id);
      
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have permission to modify items for this traveler" });
      }
      
      // Add lastModifiedBy field to track who made the changes
      const updateData = {
        ...req.body,
        lastModifiedBy: user.id
      };
      
      const parsedData = insertItemSchema.partial().parse(updateData);
      
      if (parsedData.dueDate) {
        const dueDateObj = new Date(parsedData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const updatedCount = await storage.bulkUpdateItemsByTraveler(travelerId, parsedData);
      return res.json({ updatedCount });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  // Templates routes
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    const templates = await storage.getTemplates();
    return res.json(templates);
  });

  app.post("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const data = insertTemplateSchema.parse(req.body);
      
      // Add the user's ID to the template data
      const user = req.user as User;
      const templateWithUser = {
        ...data,
        userId: user.id
      };
      
      const template = await storage.createTemplate(templateWithUser);
      return res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  // Search within a packing list
  app.get("/api/packing-lists/:listId/search", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    const query = req.query.query as string;
    const userId = (req.user as User).id;
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    if (!query || query.trim() === '') {
      return res.json([]);
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Verify ownership or collaboration permission
    const hasAccess = await storage.canUserAccessPackingList(userId, listId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Get all items in this packing list
    const items = await storage.getAllItemsByPackingList(listId);
    
    // Filter items by the search query
    const matchedItems = items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // Get categories, bags, and travelers to provide context for each item
    const categories = await storage.getCategories(listId);
    const bags = await storage.getBags(listId);
    const travelers = await storage.getTravelers(listId);
    
    // Enhance the matched items with their context information
    const enhancedItems = matchedItems.map(item => {
      const category = categories.find(c => c.id === item.categoryId);
      const bag = item.bagId ? bags.find(b => b.id === item.bagId) : null;
      const traveler = item.travelerId ? travelers.find(t => t.id === item.travelerId) : null;
      
      return {
        id: item.id,
        name: item.name,
        categoryName: category ? category.name : 'Unknown',
        bagName: bag ? bag.name : null,
        travelerName: traveler ? traveler.name : null,
        packed: item.packed
      };
    });
    
    // Limit to 10 results for performance
    const limitedResults = enhancedItems.slice(0, 10);
    
    return res.json(limitedResults);
  });

  // Collaboration routes
  // Get all collaborators for a packing list
  app.get("/api/packing-lists/:listId/collaborators", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if the user has access to this packing list
    const user = req.user as User;
    const hasAccess = await storage.canUserAccessPackingList(user.id, listId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have permission to access this packing list" });
    }
    
    // Get the collaborators
    const collaborators = await storage.getCollaborators(listId);
    
    // For each collaborator, get the user details
    const collaboratorsWithUserDetails = await Promise.all(
      collaborators.map(async (collaborator) => {
        const user = await storage.getUser(collaborator.userId);
        return {
          ...collaborator,
          username: user?.username || 'Unknown user'
        };
      })
    );
    
    return res.json(collaboratorsWithUserDetails);
  });

  // Add a collaborator to a packing list
  app.post("/api/collaborators", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate the request data
      const data = insertCollaboratorSchema.parse(req.body);
      
      // Check if the packing list exists
      const packingList = await storage.getPackingList(data.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Check if user is the owner of the packing list
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "Only the owner can add collaborators" });
      }
      
      // Check if the target user exists
      const targetUser = await storage.getUser(data.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if the user is trying to add themselves
      if (data.userId === user.id) {
        return res.status(400).json({ message: "You cannot add yourself as a collaborator" });
      }
      
      // Add the collaborator
      const collaborator = await storage.addCollaborator(data);
      
      return res.status(201).json({
        ...collaborator,
        username: targetUser.username
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  // Remove a collaborator from a packing list
  app.delete("/api/packing-lists/:listId/collaborators/:userId", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    const targetUserId = parseInt(req.params.userId);
    
    if (isNaN(listId) || isNaN(targetUserId)) {
      return res.status(400).json({ message: "Invalid parameters" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if user is the owner of the packing list or removing themselves
    const user = req.user as User;
    if (packingList.userId !== user.id && targetUserId !== user.id) {
      return res.status(403).json({ message: "You don't have permission to remove this collaborator" });
    }
    
    // Remove the collaborator
    await storage.removeCollaborator(listId, targetUserId);
    
    return res.status(204).end();
  });

  // Get all shared packing lists for the current user
  app.get("/api/shared-packing-lists", isAuthenticated, async (req, res) => {
    const user = req.user as User;
    
    // Get all packing lists shared with this user
    const sharedLists = await storage.getSharedPackingLists(user.id);
    
    // Get the progress for each list
    const listsWithProgress = await Promise.all(
      sharedLists.map(async (list) => {
        const items = await storage.getAllItemsByPackingList(list.id);
        const totalItems = items.length;
        const packedItems = items.filter(item => item.packed).length;
        const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
        
        // Get the owner details
        const owner = await storage.getUser(list.userId);
        
        return {
          ...list,
          itemCount: totalItems,
          packedItemCount: packedItems,
          progress,
          ownerUsername: owner?.username || 'Unknown'
        };
      })
    );
    
    return res.json(listsWithProgress);
  });

  // Create a collaboration invitation
  app.post("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Validate the request data
      const data = insertInvitationSchema.parse({
        ...req.body,
        invitedByUserId: user.id
      });
      
      // Check if the packing list exists
      const packingList = await storage.getPackingList(data.packingListId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Check if user is the owner of the packing list
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "Only the owner can send invitations" });
      }
      
      // Create the invitation
      const invitation = await storage.createInvitation(data);
      
      return res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  // Get invitation details by token
  app.get("/api/invitations/:token", async (req, res) => {
    const token = req.params.token;
    
    const invitation = await storage.getInvitation(token);
    
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }
    
    // Check if the invitation is expired
    if (invitation.expires < new Date()) {
      return res.status(400).json({ message: "Invitation has expired" });
    }
    
    // Check if the invitation is already accepted
    if (invitation.accepted) {
      return res.status(400).json({ message: "Invitation has already been accepted" });
    }
    
    // Get the packing list details
    const packingList = await storage.getPackingList(invitation.packingListId);
    if (!packingList) {
      return res.status(404).json({ message: "Associated packing list not found" });
    }
    
    // Get the inviter details
    const inviter = await storage.getUser(invitation.invitedByUserId);
    
    return res.json({
      invitation,
      packingList: {
        id: packingList.id,
        name: packingList.name,
        theme: packingList.theme
      },
      invitedBy: inviter ? inviter.username : 'Unknown user'
    });
  });

  // Accept an invitation
  app.post("/api/invitations/:token/accept", isAuthenticated, async (req, res) => {
    const token = req.params.token;
    const user = req.user as User;
    
    try {
      // Try to accept the invitation
      await storage.acceptInvitation(token, user.id);
      
      // Get the invitation to return the packing list ID
      const invitation = await storage.getInvitation(token);
      
      return res.json({
        message: "Invitation accepted successfully",
        packingListId: invitation?.packingListId
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  });

  // Get all invitations for a packing list
  app.get("/api/packing-lists/:listId/invitations", isAuthenticated, async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
    }
    
    // Check if the packing list exists
    const packingList = await storage.getPackingList(listId);
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    // Check if user is the owner of the packing list
    const user = req.user as User;
    if (packingList.userId !== user.id) {
      return res.status(403).json({ message: "Only the owner can view invitations" });
    }
    
    // Get the invitations
    const invitations = await storage.getInvitationsByPackingList(listId);
    
    return res.json(invitations);
  });
  
  // Create an invitation for a packing list
  app.post("/api/packing-lists/:listId/invitations", isAuthenticated, async (req, res) => {
    try {
      const listId = parseInt(req.params.listId);
      const user = req.user as User;
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid listId parameter" });
      }
      
      // Check if the packing list exists
      const packingList = await storage.getPackingList(listId);
      if (!packingList) {
        return res.status(404).json({ message: "Packing list not found" });
      }
      
      // Check if user is the owner of the packing list
      if (packingList.userId !== user.id) {
        return res.status(403).json({ message: "Only the owner can send invitations" });
      }
      
      // Prepare invitation data
      const invitationData = {
        packingListId: listId,
        invitedByUserId: user.id,
        email: req.body.email,
        permissionLevel: req.body.role || 'viewer'
      };
      
      // Create the invitation
      const invitation = await storage.createInvitation(invitationData);
      
      return res.json(invitation);
    } catch (error) {
      console.error("Error creating invitation:", error);
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      
      return res.status(500).json({ message: "Internal server error creating invitation" });
    }
  });

  // Check for pending invitations by email
  app.get("/api/invitations", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Try to find invitations by email
      // This is useful for users to check if they have any pending invitations
      const pendingInvitations = await storage.getPendingInvitationsByEmail(user.username);
      
      // Enhance the invitation data with additional information
      const enhancedInvitations = await Promise.all(
        pendingInvitations.map(async (invitation) => {
          // Get the packing list details
          const packingList = await storage.getPackingList(invitation.packingListId);
          
          // Get the inviter's user information
          const inviter = await storage.getUser(invitation.invitedByUserId);
          
          return {
            ...invitation,
            packingList: packingList ? {
              id: packingList.id,
              name: packingList.name,
              theme: packingList.theme,
              dateRange: packingList.dateRange
            } : undefined,
            inviterName: inviter ? inviter.username : undefined
          };
        })
      );
      
      return res.json(enhancedInvitations);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      return res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });
  
  // Get a specific invitation by token
  app.get("/api/invitations/:token", isAuthenticated, async (req, res) => {
    try {
      const token = req.params.token;
      const user = req.user as User;
      
      // Get the invitation
      const invitation = await storage.getInvitation(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Check if this invitation is for the authenticated user
      if (invitation.email !== user.username) {
        return res.status(403).json({ 
          message: "This invitation is not for you",
          details: `Invitation is for ${invitation.email}, but you are logged in as ${user.username}`
        });
      }
      
      // Get the packing list to include in the response
      const packingList = await storage.getPackingList(invitation.packingListId);
      
      // Get the inviter's username
      const inviter = await storage.getUser(invitation.invitedByUserId);
      
      // Return the invitation with additional details
      return res.json({
        ...invitation,
        packingList: packingList ? {
          id: packingList.id,
          name: packingList.name
        } : undefined,
        inviter: inviter ? {
          id: inviter.id,
          username: inviter.username
        } : undefined,
        role: invitation.permissionLevel
      });
    } catch (error) {
      console.error("Error fetching invitation:", error);
      return res.status(500).json({ message: "Error fetching invitation details" });
    }
  });
  
  // Accept invitation 
  app.post("/api/invitations/:token/accept", isAuthenticated, async (req, res) => {
    try {
      const token = req.params.token;
      const user = req.user as User;
      
      // Check if the invitation exists
      const invitation = await storage.getInvitation(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found or has expired" });
      }
      
      // Check if the invitation is for this user (by email)
      if (invitation.email !== user.username) {
        return res.status(403).json({ 
          message: "This invitation is not for you", 
          details: `Invitation is for ${invitation.email}, but you are logged in as ${user.username}` 
        });
      }
      
      // Check if the invitation has already been accepted
      if (invitation.accepted) {
        return res.status(400).json({ message: "This invitation has already been accepted" });
      }
      
      // Accept the invitation
      await storage.acceptInvitation(token, user.id);
      
      return res.status(200).json({ message: "Invitation accepted successfully" });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      
      return res.status(500).json({ message: "Internal server error accepting invitation" });
    }
  });
  
  // Collaboration diagnostics endpoint
  app.post("/api/collaboration/diagnostic", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      // Get all packing lists
      const ownedLists = await storage.getPackingLists(user.id);
      
      // Get all collaborator entries for the user
      const collaboratorEntries = await db
        .select()
        .from(packingListCollaborators)
        .where(eq(packingListCollaborators.userId, user.id));
      
      // Get all pending invitations for the user
      const pendingInvitations = await storage.getPendingInvitationsByEmail(user.username);
      
      // Get shared lists
      const sharedLists = await storage.getSharedPackingLists(user.id);
      
      // Return all diagnostic data
      return res.status(200).json({
        user: {
          id: user.id,
          username: user.username
        },
        ownedLists: ownedLists.map(list => ({ id: list.id, name: list.name })),
        collaboratorEntries,
        pendingInvitations,
        sharedLists: sharedLists.map(list => ({ id: list.id, name: list.name }))
      });
    } catch (error) {
      console.error("Error in collaboration diagnostic:", error);
      return res.status(500).json({ message: "Error running collaboration diagnostic" });
    }
  });
  
  // Manual invitation acceptance (for debugging purposes)
  app.post("/api/invitations/manual-accept", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      const { packingListId, token } = req.body;
      
      if (!packingListId) {
        return res.status(400).json({ message: "packingListId is required" });
      }
      
      // Check if user already has access to this list
      const hasAccess = await storage.canUserAccessPackingList(user.id, packingListId);
      if (hasAccess) {
        return res.status(200).json({ message: "User already has access to this list" });
      }
      
      console.log(`[DEBUG] Manual invitation acceptance for user ${user.id} to list ${packingListId}`);
      
      // Add user as a collaborator directly
      const newCollaborator = await storage.addCollaborator({
        packingListId,
        userId: user.id,
        permissionLevel: 'editor'
      });
      
      console.log(`[DEBUG] Manually added collaborator:`, newCollaborator);
      
      // If token was provided, also mark the invitation as accepted without using Drizzle directly
      if (token) {
        const invitation = await storage.getInvitation(token);
        if (invitation) {
          // Use the acceptInvitation method instead of direct DB access
          await storage.acceptInvitation(token, user.id);
          console.log(`[DEBUG] Marked invitation ${token} as accepted`);
        }
      }
      
      // Force a refresh of collaborators
      const collaborators = await storage.getCollaborators(packingListId);
      console.log(`[DEBUG] Current collaborators for list ${packingListId}:`, collaborators);
      
      // Force a refresh of shared lists for this user
      const sharedLists = await storage.getSharedPackingLists(user.id);
      console.log(`[DEBUG] Current shared lists for user ${user.id}:`, sharedLists);
      
      return res.status(200).json({ 
        message: "Manually added as collaborator",
        collaborator: newCollaborator,
        allCollaborators: collaborators,
        sharedLists: sharedLists
      });
    } catch (error) {
      console.error("Error in manual invitation acceptance:", error);
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      
      return res.status(500).json({ message: "Internal server error processing manual invitation" });
    }
  });
  
  // Delete/Cancel invitation
  app.delete("/api/invitations/:id", isAuthenticated, async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      
      if (isNaN(invitationId)) {
        return res.status(400).json({ message: "Invalid invitation ID" });
      }
      
      // First get all packing lists 
      const packingLists = await storage.getPackingLists((req.user as User).id);
      
      // Then gather all invitations from all packing lists (to find the one we want to delete)
      let foundInvitation = null;
      
      // Loop through each packing list
      for (const packingList of packingLists) {
        const invitations = await storage.getInvitationsByPackingList(packingList.id);
        // Look for the specific invitation
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
          foundInvitation = invitation;
          break;
        }
      }
      
      // Also check invitations sent to the current user
      if (!foundInvitation) {
        const userInvitations = await storage.getPendingInvitationsByEmail((req.user as User).username);
        const invitation = userInvitations.find(inv => inv.id === invitationId);
        if (invitation) {
          foundInvitation = invitation;
        }
      }
      
      const invitation = foundInvitation;
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Get the packing list to check if the user is the owner
      const packingList = await storage.getPackingList(invitation.packingListId);
      
      if (!packingList) {
        return res.status(404).json({ message: "Associated packing list not found" });
      }
      
      const user = req.user as User;
      
      // Allow the invitation to be deleted if:
      // 1. The user is the owner of the packing list OR
      // 2. The invitation email matches the user's email (they're declining the invitation)
      if (packingList.userId !== user.id && invitation.email !== user.username) {
        return res.status(403).json({ message: "You don't have permission to delete this invitation" });
      }
      
      // Delete the invitation
      await storage.deleteInvitation(invitationId);
      
      return res.status(200).end();
    } catch (error) {
      console.error("Error deleting invitation:", error);
      
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      
      return res.status(500).json({ message: "Internal server error deleting invitation" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
