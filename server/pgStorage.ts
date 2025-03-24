import { db } from "./db";
import { eq, and, inArray } from "drizzle-orm";
import { 
  users, type User, type InsertUser,
  packingLists, type PackingList, type InsertPackingList,
  bags, type Bag, type InsertBag,
  travelers, type Traveler, type InsertTraveler,
  categories, type Category, type InsertCategory,
  items, type Item, type InsertItem,
  templates, type Template, type InsertTemplate
} from "@shared/schema";
import { IStorage } from "./storage";

export class PgStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // PackingList methods
  async getPackingLists(userId: number): Promise<PackingList[]> {
    return await db.select().from(packingLists).where(eq(packingLists.userId, userId));
  }

  async getPackingList(id: number): Promise<PackingList | undefined> {
    const result = await db.select().from(packingLists).where(eq(packingLists.id, id));
    return result[0];
  }

  async createPackingList(packingList: InsertPackingList): Promise<PackingList> {
    const result = await db.insert(packingLists).values(packingList).returning();
    return result[0];
  }

  async updatePackingList(id: number, data: Partial<InsertPackingList>): Promise<PackingList | undefined> {
    const result = await db.update(packingLists)
      .set(data)
      .where(eq(packingLists.id, id))
      .returning();
    return result[0];
  }

  async deletePackingList(id: number): Promise<void> {
    // First delete all related items, categories, bags, and travelers
    const categoriesResult = await db.select().from(categories).where(eq(categories.packingListId, id));
    const categoryIds = categoriesResult.map(c => c.id);
    
    if (categoryIds.length > 0) {
      await db.delete(items).where(inArray(items.categoryId, categoryIds));
    }
    
    await db.delete(categories).where(eq(categories.packingListId, id));
    await db.delete(bags).where(eq(bags.packingListId, id));
    await db.delete(travelers).where(eq(travelers.packingListId, id));
    
    // Finally delete the packing list
    await db.delete(packingLists).where(eq(packingLists.id, id));
  }

  // Bag methods
  async getBags(packingListId: number): Promise<Bag[]> {
    return await db.select().from(bags).where(eq(bags.packingListId, packingListId));
  }

  async getBag(id: number): Promise<Bag | undefined> {
    const result = await db.select().from(bags).where(eq(bags.id, id));
    return result[0];
  }

  async createBag(bag: InsertBag): Promise<Bag> {
    const result = await db.insert(bags).values(bag).returning();
    return result[0];
  }

  async updateBag(id: number, data: Partial<InsertBag>): Promise<Bag | undefined> {
    const result = await db.update(bags)
      .set(data)
      .where(eq(bags.id, id))
      .returning();
    return result[0];
  }

  async deleteBag(id: number): Promise<void> {
    // Update any items that reference this bag
    await db.update(items)
      .set({ bagId: null })
      .where(eq(items.bagId, id));
    
    // Delete the bag
    await db.delete(bags).where(eq(bags.id, id));
  }

  // Traveler methods
  async getTravelers(packingListId: number): Promise<Traveler[]> {
    return await db.select().from(travelers).where(eq(travelers.packingListId, packingListId));
  }

  async getTraveler(id: number): Promise<Traveler | undefined> {
    const result = await db.select().from(travelers).where(eq(travelers.id, id));
    return result[0];
  }

  async createTraveler(traveler: InsertTraveler): Promise<Traveler> {
    const result = await db.insert(travelers).values(traveler).returning();
    return result[0];
  }

  async updateTraveler(id: number, data: Partial<InsertTraveler>): Promise<Traveler | undefined> {
    const result = await db.update(travelers)
      .set(data)
      .where(eq(travelers.id, id))
      .returning();
    return result[0];
  }

  async deleteTraveler(id: number): Promise<void> {
    // Update any items that reference this traveler
    await db.update(items)
      .set({ travelerId: null })
      .where(eq(items.travelerId, id));
    
    // Delete the traveler
    await db.delete(travelers).where(eq(travelers.id, id));
  }

  // Category methods
  async getCategories(packingListId: number): Promise<Category[]> {
    return await db.select()
      .from(categories)
      .where(eq(categories.packingListId, packingListId))
      .orderBy(categories.position);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async deleteCategory(id: number): Promise<void> {
    // Delete all items in this category
    await db.delete(items).where(eq(items.categoryId, id));
    
    // Delete the category
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Item methods
  async getItems(categoryId: number): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.categoryId, categoryId));
  }

  async getAllItemsByPackingList(packingListId: number): Promise<Item[]> {
    // Get all categories for this packing list
    const categoriesResult = await db.select().from(categories).where(eq(categories.packingListId, packingListId));
    const categoryIds = categoriesResult.map(c => c.id);
    
    if (categoryIds.length === 0) {
      return [];
    }
    
    // Get all items in these categories
    return await db.select().from(items).where(inArray(items.categoryId, categoryIds));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const result = await db.select().from(items).where(eq(items.id, id));
    return result[0];
  }

  async createItem(item: InsertItem): Promise<Item> {
    // Convert dueDate string to Date if provided
    let insertData: any = { ...item };
    if (typeof item.dueDate === 'string' && item.dueDate.trim() !== '') {
      insertData.dueDate = new Date(item.dueDate);
    }
    
    const result = await db.insert(items).values(insertData).returning();
    return result[0];
  }

  async updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined> {
    // Convert dueDate string to Date if provided
    let updateData: any = { ...data };
    if (typeof data.dueDate === 'string' && data.dueDate.trim() !== '') {
      updateData.dueDate = new Date(data.dueDate);
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(eq(items.id, id))
      .returning();
    return result[0];
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async bulkUpdateItems(ids: number[], data: Partial<InsertItem>): Promise<number> {
    // Convert dueDate string to Date if provided
    let updateData: any = { ...data };
    if (typeof data.dueDate === 'string' && data.dueDate.trim() !== '') {
      updateData.dueDate = new Date(data.dueDate);
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(inArray(items.id, ids))
      .returning();
    
    return result.length;
  }

  // Template methods
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const result = await db.select().from(templates).where(eq(templates.id, id));
    return result[0];
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const result = await db.insert(templates).values(template).returning();
    return result[0];
  }
}