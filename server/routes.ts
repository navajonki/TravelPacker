import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import passport from "passport";
import { isAuthenticated, hashPassword } from "./auth";
import { 
  insertUserSchema,
  insertPackingListSchema, 
  insertBagSchema, 
  insertTravelerSchema, 
  insertCategorySchema, 
  insertItemSchema,
  insertTemplateSchema,
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
    
    const packingLists = await storage.getPackingLists(userId);
    
    const lists = await Promise.all(
      packingLists.map(async (list) => {
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

  app.get("/api/packing-lists/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const packingList = await storage.getPackingList(id);
    
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    const items = await storage.getAllItemsByPackingList(id);
    const totalItems = items.length;
    const packedItems = items.filter(item => item.packed).length;
    const progress = totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0;
    
    return res.json({
      ...packingList,
      itemCount: totalItems,
      packedItemCount: packedItems,
      progress
    });
  });

  app.post("/api/packing-lists", async (req, res) => {
    try {
      const data = insertPackingListSchema.parse(req.body);
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

  app.patch("/api/packing-lists/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      const data = insertPackingListSchema.partial().parse(req.body);
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

  app.delete("/api/packing-lists/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const packingList = await storage.getPackingList(id);
    
    if (!packingList) {
      return res.status(404).json({ message: "Packing list not found" });
    }
    
    await storage.deletePackingList(id);
    return res.status(204).end();
  });

  // Bags routes
  app.get("/api/packing-lists/:listId/bags", async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
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

  app.post("/api/bags", async (req, res) => {
    try {
      const data = insertBagSchema.parse(req.body);
      const bag = await storage.createBag(data);
      return res.status(201).json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/bags/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      const data = insertBagSchema.partial().parse(req.body);
      const bag = await storage.updateBag(id, data);
      
      if (!bag) {
        return res.status(404).json({ message: "Bag not found" });
      }
      
      return res.json(bag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/bags/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const bag = await storage.getBag(id);
    
    if (!bag) {
      return res.status(404).json({ message: "Bag not found" });
    }
    
    await storage.deleteBag(id);
    return res.status(204).end();
  });

  // Travelers routes
  app.get("/api/packing-lists/:listId/travelers", async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
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

  app.post("/api/travelers", async (req, res) => {
    try {
      const data = insertTravelerSchema.parse(req.body);
      const traveler = await storage.createTraveler(data);
      return res.status(201).json(traveler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/travelers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      const data = insertTravelerSchema.partial().parse(req.body);
      const traveler = await storage.updateTraveler(id, data);
      
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }
      
      return res.json(traveler);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/travelers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const traveler = await storage.getTraveler(id);
    
    if (!traveler) {
      return res.status(404).json({ message: "Traveler not found" });
    }
    
    await storage.deleteTraveler(id);
    return res.status(204).end();
  });

  // Categories routes
  app.get("/api/packing-lists/:listId/categories", async (req, res) => {
    const listId = parseInt(req.params.listId);
    
    if (isNaN(listId)) {
      return res.status(400).json({ message: "Invalid listId parameter" });
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

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      return res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      const data = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, data);
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const category = await storage.getCategory(id);
    
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    await storage.deleteCategory(id);
    return res.status(204).end();
  });

  // Items routes
  app.get("/api/items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    return res.json(item);
  });

  app.get("/api/categories/:categoryId/items", async (req, res) => {
    const categoryId = parseInt(req.params.categoryId);
    
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "Invalid categoryId parameter" });
    }
    
    const items = await storage.getItems(categoryId);
    return res.json(items);
  });

  app.post("/api/items", async (req, res) => {
    try {
      const data = insertItemSchema.parse(req.body);
      
      if (data.dueDate) {
        const dueDateObj = new Date(data.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const item = await storage.createItem(data);
      return res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.patch("/api/items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    try {
      const data = insertItemSchema.partial().parse(req.body);
      
      if (data.dueDate) {
        const dueDateObj = new Date(data.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const item = await storage.updateItem(id, data);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      return res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid id parameter" });
    }
    
    const item = await storage.getItem(id);
    
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    
    await storage.deleteItem(id);
    return res.status(204).end();
  });

  // CSV Export endpoint
  app.get("/api/packing-lists/:id/export", async (req, res) => {
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
  
  // New endpoint for multi-item updates
  app.post("/api/items/multi-edit", async (req, res) => {
    try {
      console.log("Received multi-edit request with body:", JSON.stringify(req.body));
      
      const { itemIds, updates } = req.body;
      
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
          
          // Attempt to update the item
          const updatedItem = await storage.updateItem(numericId, updates);
          
          if (updatedItem) {
            results.push({ id: numericId, success: true, item: updatedItem });
            successCount++;
          } else {
            results.push({ id: numericId, success: false, message: "Update failed" });
          }
        } catch (error) {
          console.error(`Error updating item ${itemId}:`, error);
          results.push({ 
            id: itemId, 
            success: false, 
            message: error instanceof Error ? error.message : "Unknown error" 
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
  app.patch("/api/categories/:categoryId/bulk-update-items", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid categoryId parameter" });
      }
      
      const category = await storage.getCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const parsedData = insertItemSchema.partial().parse(req.body);
      
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

  app.patch("/api/bags/:bagId/bulk-update-items", async (req, res) => {
    try {
      const bagId = parseInt(req.params.bagId);
      
      if (isNaN(bagId)) {
        return res.status(400).json({ message: "Invalid bagId parameter" });
      }
      
      const bag = await storage.getBag(bagId);
      if (!bag) {
        return res.status(404).json({ message: "Bag not found" });
      }
      
      const parsedData = insertItemSchema.partial().parse(req.body);
      
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

  app.patch("/api/travelers/:travelerId/bulk-update-items", async (req, res) => {
    try {
      const travelerId = parseInt(req.params.travelerId);
      
      if (isNaN(travelerId)) {
        return res.status(400).json({ message: "Invalid travelerId parameter" });
      }
      
      const traveler = await storage.getTraveler(travelerId);
      if (!traveler) {
        return res.status(404).json({ message: "Traveler not found" });
      }
      
      const parsedData = insertItemSchema.partial().parse(req.body);
      
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
  app.get("/api/templates", async (req, res) => {
    const templates = await storage.getTemplates();
    return res.json(templates);
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const data = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(data);
      return res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      throw error;
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
