import { 
  users, type User, type InsertUser,
  packingLists, type PackingList, type InsertPackingList,
  bags, type Bag, type InsertBag,
  travelers, type Traveler, type InsertTraveler,
  categories, type Category, type InsertCategory,
  items, type Item, type InsertItem,
  templates, type Template, type InsertTemplate
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // PackingList methods
  getPackingLists(userId: number): Promise<PackingList[]>;
  getPackingList(id: number): Promise<PackingList | undefined>;
  createPackingList(packingList: InsertPackingList): Promise<PackingList>;
  updatePackingList(id: number, data: Partial<InsertPackingList>): Promise<PackingList | undefined>;
  deletePackingList(id: number): Promise<void>;

  // Bag methods
  getBags(packingListId: number): Promise<Bag[]>;
  getBag(id: number): Promise<Bag | undefined>;
  createBag(bag: InsertBag): Promise<Bag>;
  updateBag(id: number, data: Partial<InsertBag>): Promise<Bag | undefined>;
  deleteBag(id: number): Promise<void>;

  // Traveler methods
  getTravelers(packingListId: number): Promise<Traveler[]>;
  getTraveler(id: number): Promise<Traveler | undefined>;
  createTraveler(traveler: InsertTraveler): Promise<Traveler>;
  updateTraveler(id: number, data: Partial<InsertTraveler>): Promise<Traveler | undefined>;
  deleteTraveler(id: number): Promise<void>;

  // Category methods
  getCategories(packingListId: number): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  // Item methods
  getItems(categoryId: number): Promise<Item[]>;
  getAllItemsByPackingList(packingListId: number): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;
  bulkUpdateItems(ids: number[], data: Partial<InsertItem>): Promise<number>;

  // Template methods
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private packingLists: Map<number, PackingList>;
  private bags: Map<number, Bag>;
  private travelers: Map<number, Traveler>;
  private categories: Map<number, Category>;
  private items: Map<number, Item>;
  private templates: Map<number, Template>;
  
  private currentUserId: number;
  private currentPackingListId: number;
  private currentBagId: number;
  private currentTravelerId: number;
  private currentCategoryId: number;
  private currentItemId: number;
  private currentTemplateId: number;

  constructor() {
    this.users = new Map();
    this.packingLists = new Map();
    this.bags = new Map();
    this.travelers = new Map();
    this.categories = new Map();
    this.items = new Map();
    this.templates = new Map();
    
    this.currentUserId = 1;
    this.currentPackingListId = 1;
    this.currentBagId = 1;
    this.currentTravelerId = 1;
    this.currentCategoryId = 1;
    this.currentItemId = 1;
    this.currentTemplateId = 1;

    // Initialize with sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Add a default user
    const user: User = {
      id: this.currentUserId++,
      username: 'demo',
      password: 'password123'
    };
    this.users.set(user.id, user);

    // Add some templates
    const templates = [
      { name: 'Beach Vacation' },
      { name: 'Business Trip' },
      { name: 'Winter Getaway' }
    ];
    
    templates.forEach(template => {
      this.createTemplate({ name: template.name });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // PackingList methods
  async getPackingLists(userId: number): Promise<PackingList[]> {
    return Array.from(this.packingLists.values()).filter(
      (list) => list.userId === userId,
    );
  }

  async getPackingList(id: number): Promise<PackingList | undefined> {
    return this.packingLists.get(id);
  }

  async createPackingList(insertPackingList: InsertPackingList): Promise<PackingList> {
    const id = this.currentPackingListId++;
    const now = new Date();
    const packingList: PackingList = { 
      ...insertPackingList, 
      id, 
      createdAt: now,
      dateRange: insertPackingList.dateRange || null 
    };
    this.packingLists.set(id, packingList);
    return packingList;
  }

  async updatePackingList(id: number, data: Partial<InsertPackingList>): Promise<PackingList | undefined> {
    const packingList = this.packingLists.get(id);
    if (!packingList) return undefined;
    
    const updatedPackingList = { ...packingList, ...data };
    this.packingLists.set(id, updatedPackingList);
    return updatedPackingList;
  }

  async deletePackingList(id: number): Promise<void> {
    this.packingLists.delete(id);
    
    // Delete all related entities
    Array.from(this.bags.values())
      .filter(bag => bag.packingListId === id)
      .forEach(bag => this.bags.delete(bag.id));
      
    Array.from(this.travelers.values())
      .filter(traveler => traveler.packingListId === id)
      .forEach(traveler => this.travelers.delete(traveler.id));
      
    const categoriesToDelete = Array.from(this.categories.values())
      .filter(category => category.packingListId === id);
      
    categoriesToDelete.forEach(category => {
      Array.from(this.items.values())
        .filter(item => item.categoryId === category.id)
        .forEach(item => this.items.delete(item.id));
        
      this.categories.delete(category.id);
    });
  }

  // Bag methods
  async getBags(packingListId: number): Promise<Bag[]> {
    return Array.from(this.bags.values()).filter(
      (bag) => bag.packingListId === packingListId
    );
  }

  async getBag(id: number): Promise<Bag | undefined> {
    return this.bags.get(id);
  }

  async createBag(insertBag: InsertBag): Promise<Bag> {
    const id = this.currentBagId++;
    const now = new Date();
    const bag: Bag = { ...insertBag, id, createdAt: now };
    this.bags.set(id, bag);
    return bag;
  }

  async updateBag(id: number, data: Partial<InsertBag>): Promise<Bag | undefined> {
    const bag = this.bags.get(id);
    if (!bag) return undefined;
    
    const updatedBag = { ...bag, ...data };
    this.bags.set(id, updatedBag);
    return updatedBag;
  }

  async deleteBag(id: number): Promise<void> {
    this.bags.delete(id);
    
    // Update any items that reference this bag
    Array.from(this.items.values())
      .filter(item => item.bagId === id)
      .forEach(item => {
        const updatedItem = { ...item, bagId: null };
        this.items.set(item.id, updatedItem);
      });
  }

  // Traveler methods
  async getTravelers(packingListId: number): Promise<Traveler[]> {
    return Array.from(this.travelers.values()).filter(
      (traveler) => traveler.packingListId === packingListId
    );
  }

  async getTraveler(id: number): Promise<Traveler | undefined> {
    return this.travelers.get(id);
  }

  async createTraveler(insertTraveler: InsertTraveler): Promise<Traveler> {
    const id = this.currentTravelerId++;
    const now = new Date();
    const traveler: Traveler = { ...insertTraveler, id, createdAt: now };
    this.travelers.set(id, traveler);
    return traveler;
  }

  async updateTraveler(id: number, data: Partial<InsertTraveler>): Promise<Traveler | undefined> {
    const traveler = this.travelers.get(id);
    if (!traveler) return undefined;
    
    const updatedTraveler = { ...traveler, ...data };
    this.travelers.set(id, updatedTraveler);
    return updatedTraveler;
  }

  async deleteTraveler(id: number): Promise<void> {
    this.travelers.delete(id);
    
    // Update any items that reference this traveler
    Array.from(this.items.values())
      .filter(item => item.travelerId === id)
      .forEach(item => {
        const updatedItem = { ...item, travelerId: null };
        this.items.set(item.id, updatedItem);
      });
  }

  // Category methods
  async getCategories(packingListId: number): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(category => category.packingListId === packingListId)
      .sort((a, b) => a.position - b.position);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const now = new Date();
    const category: Category = { ...insertCategory, id, createdAt: now };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    this.categories.delete(id);
    
    // Delete all items in this category
    Array.from(this.items.values())
      .filter(item => item.categoryId === id)
      .forEach(item => this.items.delete(item.id));
  }

  // Item methods
  async getItems(categoryId: number): Promise<Item[]> {
    return Array.from(this.items.values()).filter(
      (item) => item.categoryId === categoryId
    );
  }

  async getAllItemsByPackingList(packingListId: number): Promise<Item[]> {
    // Get all categories for this packing list
    const categoryIds = Array.from(this.categories.values())
      .filter(category => category.packingListId === packingListId)
      .map(category => category.id);
    
    // Get all items in these categories
    return Array.from(this.items.values()).filter(
      (item) => categoryIds.includes(item.categoryId)
    );
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const id = this.currentItemId++;
    const now = new Date();
    
    let dueDate: Date | null = null;
    if (insertItem.dueDate) {
      dueDate = new Date(insertItem.dueDate);
    }
    
    const item: Item = { 
      name: insertItem.name,
      categoryId: insertItem.categoryId,
      quantity: insertItem.quantity ?? 1,
      packed: insertItem.packed ?? false,
      isEssential: insertItem.isEssential ?? false,
      bagId: insertItem.bagId ?? null,
      travelerId: insertItem.travelerId ?? null,
      id, 
      createdAt: now,
      dueDate,
    };
    
    this.items.set(id, item);
    return item;
  }

  async updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined> {
    const item = this.items.get(id);
    if (!item) return undefined;
    
    const updatedData: Partial<Item> = {};
    
    // Only copy properties that are present in data
    if (data.name !== undefined) updatedData.name = data.name;
    if (data.categoryId !== undefined) updatedData.categoryId = data.categoryId;
    if (data.quantity !== undefined) updatedData.quantity = data.quantity;
    if (data.packed !== undefined) updatedData.packed = data.packed;
    if (data.isEssential !== undefined) updatedData.isEssential = data.isEssential;
    if (data.bagId !== undefined) updatedData.bagId = data.bagId ?? null;
    if (data.travelerId !== undefined) updatedData.travelerId = data.travelerId ?? null;
    
    // Handle date conversion if dueDate is provided as string
    if (typeof data.dueDate === 'string') {
      updatedData.dueDate = new Date(data.dueDate);
    } else if (data.dueDate === null) {
      updatedData.dueDate = null;
    }
    
    const updatedItem = { ...item, ...updatedData };
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: number): Promise<void> {
    this.items.delete(id);
  }

  async bulkUpdateItems(ids: number[], data: Partial<InsertItem>): Promise<number> {
    let updatedCount = 0;
    
    for (const id of ids) {
      const item = this.items.get(id);
      if (item) {
        const updatedData: Partial<Item> = {};
        
        // Only copy properties that are present in data
        if (data.name !== undefined) updatedData.name = data.name;
        if (data.categoryId !== undefined) updatedData.categoryId = data.categoryId;
        if (data.quantity !== undefined) updatedData.quantity = data.quantity;
        if (data.packed !== undefined) updatedData.packed = data.packed;
        if (data.isEssential !== undefined) updatedData.isEssential = data.isEssential;
        if (data.bagId !== undefined) updatedData.bagId = data.bagId ?? null;
        if (data.travelerId !== undefined) updatedData.travelerId = data.travelerId ?? null;
        
        // Handle date conversion if dueDate is provided as string
        if (typeof data.dueDate === 'string') {
          updatedData.dueDate = new Date(data.dueDate);
        } else if (data.dueDate === null) {
          updatedData.dueDate = null;
        }
        
        const updatedItem = { ...item, ...updatedData };
        this.items.set(id, updatedItem);
        updatedCount++;
      }
    }
    
    return updatedCount;
  }

  // Template methods
  async getTemplates(): Promise<Template[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const id = this.currentTemplateId++;
    const now = new Date();
    const template: Template = { ...insertTemplate, id, createdAt: now };
    this.templates.set(id, template);
    return template;
  }
}

import { PgStorage } from "./pgStorage";

// Use PgStorage instead of MemStorage
export const storage = new PgStorage();
