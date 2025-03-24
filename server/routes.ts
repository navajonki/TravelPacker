import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertPackingListSchema, 
  insertBagSchema, 
  insertTravelerSchema, 
  insertCategorySchema, 
  insertItemSchema,
  insertTemplateSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = app.route('/api');

  // PackingLists routes
  app.get("/api/packing-lists", async (req, res) => {
    const userId = parseInt(req.query.userId as string);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid userId parameter" });
    }
    
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
    return res.json(bags);
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
    return res.json(travelers);
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

  app.patch("/api/items/bulk-update", async (req, res) => {
    try {
      const { ids, data } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty ids array" });
      }
      
      const parsedData = insertItemSchema.partial().parse(data);
      
      if (parsedData.dueDate) {
        const dueDateObj = new Date(parsedData.dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({ message: "Invalid dueDate format" });
        }
      }
      
      const updatedCount = await storage.bulkUpdateItems(ids, parsedData);
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
