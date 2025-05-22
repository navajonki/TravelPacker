import { 
  users, type User, type InsertUser,
  packingLists, type PackingList, type InsertPackingList,
  packingListCollaborators, type PackingListCollaborator, type InsertCollaborator,
  collaborationInvitations, type CollaborationInvitation, type InsertInvitation,
  bags, type Bag, type InsertBag,
  travelers, type Traveler, type InsertTraveler,
  categories, type Category, type InsertCategory,
  items, type Item, type InsertItem,
  templates, type Template, type InsertTemplate
} from "@shared/schema";
import session from "express-session";

export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
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
  
  // Collaboration methods
  getCollaborators(packingListId: number): Promise<PackingListCollaborator[]>;
  addCollaborator(collaborator: InsertCollaborator): Promise<PackingListCollaborator>;
  removeCollaborator(packingListId: number, userId: number): Promise<void>;
  getSharedPackingLists(userId: number): Promise<PackingList[]>;
  createInvitation(invitation: InsertInvitation): Promise<CollaborationInvitation>;
  getInvitation(token: string): Promise<CollaborationInvitation | undefined>;
  acceptInvitation(token: string, userId: number): Promise<void>;
  deleteInvitation(invitationId: number): Promise<void>;
  getInvitationsByPackingList(packingListId: number): Promise<CollaborationInvitation[]>;
  getPendingInvitationsByEmail(email: string): Promise<CollaborationInvitation[]>;
  canUserAccessPackingList(userId: number, packingListId: number): Promise<boolean>;

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
  getAllUnassignedItems(packingListId: number, type: string): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<void>;
  bulkUpdateItems(ids: number[], data: Partial<InsertItem>): Promise<number>;
  bulkUpdateItemsByCategory(categoryId: number, data: Partial<InsertItem>): Promise<number>;
  bulkUpdateItemsByBag(bagId: number, data: Partial<InsertItem>): Promise<number>;
  bulkUpdateItemsByTraveler(travelerId: number, data: Partial<InsertItem>): Promise<number>;

  // Template methods
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
}

import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  sessionStore: session.Store;
  private users: Map<number, User>;
  private packingLists: Map<number, PackingList>;
  private bags: Map<number, Bag>;
  private travelers: Map<number, Traveler>;
  private categories: Map<number, Category>;
  private items: Map<number, Item>;
  private templates: Map<number, Template>;
  private collaborators: Map<string, PackingListCollaborator>;
  private invitations: Map<number, CollaborationInvitation>;
  
  private currentUserId: number;
  private currentPackingListId: number;
  private currentBagId: number;
  private currentTravelerId: number;
  private currentCategoryId: number;
  private currentItemId: number;
  private currentTemplateId: number;

  constructor() {
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    this.users = new Map();
    this.packingLists = new Map();
    this.bags = new Map();
    this.travelers = new Map();
    this.categories = new Map();
    this.items = new Map();
    this.templates = new Map();
    this.collaborators = new Map();
    this.invitations = new Map();
    
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
      dateRange: insertPackingList.dateRange || null,
      theme: insertPackingList.theme || null
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
  
  async getAllUnassignedItems(packingListId: number, type: string): Promise<Item[]> {
    // Validate the type parameter
    if (!['category', 'bag', 'traveler'].includes(type)) {
      console.log(`[WARNING] Invalid type '${type}' passed to getAllUnassignedItems`);
      return [];
    }
    
    // Get all items for this packing list
    const allItems = await this.getAllItemsByPackingList(packingListId);
    
    // Filter based on the type parameter
    if (type === 'category') {
      return allItems.filter(item => item.categoryId === null);
    } else if (type === 'bag') {
      return allItems.filter(item => item.bagId === null);
    } else if (type === 'traveler') {
      return allItems.filter(item => item.travelerId === null);
    }
    
    // Default fallback (shouldn't reach here due to type validation)
    return [];
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
    
    // Ensure permissionLevel has a default value if not provided
    const item: Item = { 
      name: insertItem.name,
      categoryId: insertItem.categoryId,
      quantity: insertItem.quantity ?? 1,
      packed: insertItem.packed ?? false,
      isEssential: insertItem.isEssential ?? false,
      bagId: insertItem.bagId ?? null,
      travelerId: insertItem.travelerId ?? null,
      createdBy: insertItem.createdBy ?? null,
      lastModifiedBy: insertItem.lastModifiedBy ?? null,
      id, 
      createdAt: now,
      dueDate,
    };
    
    this.items.set(id, item);
    return item;
  }

  async updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined> {
    // This is a memory-based implementation, but we're actually using DatabaseStorage
    // Keeping this for interface compatibility
    
    const item = this.items.get(id);
    if (!item) return undefined;
    
    console.log('[INFO] MemStorage.updateItem called, but we are using DatabaseStorage');
    console.log('[INFO] Item update data:', data);
    
    // This shouldn't be called in production, so we'll still update the in-memory version
    // for backward compatibility
    const updatedData: Partial<Item> = { ...data };
    
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
  
  async bulkUpdateItemsByCategory(categoryId: number, data: Partial<InsertItem>): Promise<number> {
    const itemIds = Array.from(this.items.values())
      .filter(item => item.categoryId === categoryId)
      .map(item => item.id);
      
    return this.bulkUpdateItems(itemIds, data);
  }
  
  async bulkUpdateItemsByBag(bagId: number, data: Partial<InsertItem>): Promise<number> {
    const itemIds = Array.from(this.items.values())
      .filter(item => item.bagId === bagId)
      .map(item => item.id);
      
    return this.bulkUpdateItems(itemIds, data);
  }
  
  async bulkUpdateItemsByTraveler(travelerId: number, data: Partial<InsertItem>): Promise<number> {
    const itemIds = Array.from(this.items.values())
      .filter(item => item.travelerId === travelerId)
      .map(item => item.id);
      
    return this.bulkUpdateItems(itemIds, data);
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
  
  // Collaboration methods
  async getCollaborators(packingListId: number): Promise<PackingListCollaborator[]> {
    return Array.from(this.collaborators.values())
      .filter(collab => collab.packingListId === packingListId);
  }
  
  async addCollaborator(collaborator: InsertCollaborator): Promise<PackingListCollaborator> {
    const key = `${collaborator.packingListId}-${collaborator.userId}`;
    const now = new Date();
    // Ensure permissionLevel has a default value
    const newCollaborator: PackingListCollaborator = {
      ...collaborator,
      permissionLevel: collaborator.permissionLevel || 'read',
      createdAt: now
    };
    this.collaborators.set(key, newCollaborator);
    return newCollaborator;
  }
  
  async removeCollaborator(packingListId: number, userId: number): Promise<void> {
    const key = `${packingListId}-${userId}`;
    this.collaborators.delete(key);
  }
  
  async getSharedPackingLists(userId: number): Promise<PackingList[]> {
    // Find all collaborations this user has
    const userCollaborations = Array.from(this.collaborators.values())
      .filter(collab => collab.userId === userId)
      .map(collab => collab.packingListId);
    
    // Get the packing lists for these collaborations
    return Array.from(this.packingLists.values())
      .filter(list => userCollaborations.includes(list.id));
  }
  
  async createInvitation(invitation: InsertInvitation): Promise<CollaborationInvitation> {
    const id = Date.now(); // Use timestamp as ID
    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    // Generate a random token
    const token = Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);
    
    const newInvitation: CollaborationInvitation = {
      id,
      token,
      accepted: false,
      createdAt: now,
      expires: oneWeekLater,
      permissionLevel: invitation.permissionLevel || 'read',
      packingListId: invitation.packingListId,
      invitedByUserId: invitation.invitedByUserId,
      email: invitation.email
    };
    
    this.invitations.set(id, newInvitation);
    return newInvitation;
  }
  
  async getInvitation(token: string): Promise<CollaborationInvitation | undefined> {
    return Array.from(this.invitations.values())
      .find(invitation => invitation.token === token);
  }
  
  async acceptInvitation(token: string, userId: number): Promise<void> {
    const invitation = await this.getInvitation(token);
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.accepted) throw new Error("Invitation already accepted");
    if (invitation.expires < new Date()) throw new Error("Invitation expired");
    
    // Mark invitation as accepted
    const updatedInvitation = { ...invitation, accepted: true };
    this.invitations.set(invitation.id, updatedInvitation);
    
    // Add the user as a collaborator
    await this.addCollaborator({
      packingListId: invitation.packingListId,
      userId,
      permissionLevel: invitation.permissionLevel
    });
  }
  
  async deleteInvitation(invitationId: number): Promise<void> {
    // Find the invitation by ID
    const invitation = Array.from(this.invitations.values())
      .find(inv => inv.id === invitationId);
      
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Delete the invitation
    this.invitations.delete(invitationId);
  }
  
  async getInvitationsByPackingList(packingListId: number): Promise<CollaborationInvitation[]> {
    return Array.from(this.invitations.values())
      .filter(invitation => invitation.packingListId === packingListId);
  }
  
  async getPendingInvitationsByEmail(email: string): Promise<CollaborationInvitation[]> {
    const now = new Date();
    return Array.from(this.invitations.values())
      .filter(invitation => 
        invitation.email === email && 
        !invitation.accepted && 
        invitation.expires > now
      );
  }
  
  async canUserAccessPackingList(userId: number, packingListId: number): Promise<boolean> {
    // Check if user is the owner
    const packingList = await this.getPackingList(packingListId);
    if (packingList?.userId === userId) return true;
    
    // Check if user is a collaborator
    const key = `${packingListId}-${userId}`;
    return this.collaborators.has(key);
  }
}

import { db } from "./db";
import { eq, and, inArray, sql } from "drizzle-orm";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Initialize PostgreSQL session store
    this.sessionStore = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true
    });
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // PackingList methods
  async getPackingLists(userId: number): Promise<PackingList[]> {
    return await db.select().from(packingLists).where(eq(packingLists.userId, userId));
  }

  async getPackingList(id: number): Promise<PackingList | undefined> {
    const [packingList] = await db.select().from(packingLists).where(eq(packingLists.id, id));
    return packingList || undefined;
  }

  async createPackingList(insertPackingList: InsertPackingList): Promise<PackingList> {
    const [packingList] = await db
      .insert(packingLists)
      .values(insertPackingList)
      .returning();
    return packingList;
  }

  async updatePackingList(id: number, data: Partial<InsertPackingList>): Promise<PackingList | undefined> {
    const [updatedPackingList] = await db
      .update(packingLists)
      .set(data)
      .where(eq(packingLists.id, id))
      .returning();
    return updatedPackingList || undefined;
  }

  async deletePackingList(id: number): Promise<void> {
    try {
      // First get all related items and delete them
      const allItems = await this.getAllItemsByPackingList(id);
      console.log(`Deleting ${allItems.length} items for packing list ${id}`);
      if (allItems.length > 0) {
        for (const item of allItems) {
          await db.delete(items).where(eq(items.id, item.id));
        }
      }
      
      // Delete all categories
      const categoryItems = await this.getCategories(id);
      console.log(`Deleting ${categoryItems.length} categories for packing list ${id}`);
      if (categoryItems.length > 0) {
        for (const category of categoryItems) {
          await db.delete(categories).where(eq(categories.id, category.id));
        }
      }
      
      // Delete all bags
      const bagItems = await this.getBags(id);
      console.log(`Deleting ${bagItems.length} bags for packing list ${id}`);
      if (bagItems.length > 0) {
        for (const bag of bagItems) {
          await db.delete(bags).where(eq(bags.id, bag.id));
        }
      }
      
      // Delete all travelers
      const travelerItems = await this.getTravelers(id);
      console.log(`Deleting ${travelerItems.length} travelers for packing list ${id}`);
      if (travelerItems.length > 0) {
        for (const traveler of travelerItems) {
          await db.delete(travelers).where(eq(travelers.id, traveler.id));
        }
      }
      
      // Finally delete the packing list itself
      await db.delete(packingLists).where(eq(packingLists.id, id));
      console.log(`Successfully deleted packing list ${id}`);
    } catch (error) {
      console.error("Error in deletePackingList:", error);
      throw error;
    }
  }

  // Bag methods
  async getBags(packingListId: number): Promise<Bag[]> {
    return await db.select().from(bags).where(eq(bags.packingListId, packingListId));
  }

  async getBag(id: number): Promise<Bag | undefined> {
    const [bag] = await db.select().from(bags).where(eq(bags.id, id));
    return bag || undefined;
  }

  async createBag(insertBag: InsertBag): Promise<Bag> {
    const [bag] = await db
      .insert(bags)
      .values(insertBag)
      .returning();
    return bag;
  }

  async updateBag(id: number, data: Partial<InsertBag>): Promise<Bag | undefined> {
    const [updatedBag] = await db
      .update(bags)
      .set(data)
      .where(eq(bags.id, id))
      .returning();
    return updatedBag || undefined;
  }

  async deleteBag(id: number): Promise<void> {
    await db.delete(bags).where(eq(bags.id, id));
  }

  // Traveler methods
  async getTravelers(packingListId: number): Promise<Traveler[]> {
    return await db.select().from(travelers).where(eq(travelers.packingListId, packingListId));
  }

  async getTraveler(id: number): Promise<Traveler | undefined> {
    const [traveler] = await db.select().from(travelers).where(eq(travelers.id, id));
    return traveler || undefined;
  }

  async createTraveler(insertTraveler: InsertTraveler): Promise<Traveler> {
    const [traveler] = await db
      .insert(travelers)
      .values(insertTraveler)
      .returning();
    return traveler;
  }

  async updateTraveler(id: number, data: Partial<InsertTraveler>): Promise<Traveler | undefined> {
    const [updatedTraveler] = await db
      .update(travelers)
      .set(data)
      .where(eq(travelers.id, id))
      .returning();
    return updatedTraveler || undefined;
  }

  async deleteTraveler(id: number): Promise<void> {
    await db.delete(travelers).where(eq(travelers.id, id));
  }

  // Category methods
  async getCategories(packingListId: number): Promise<Category[]> {
    return await db
      .select()
      .from(categories)
      .where(eq(categories.packingListId, packingListId))
      .orderBy(categories.position);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [category] = await db
      .insert(categories)
      .values(insertCategory)
      .returning();
    return category;
  }

  async updateCategory(id: number, data: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory || undefined;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Item methods
  async getItems(categoryId: number): Promise<Item[]> {
    return await db.select().from(items).where(eq(items.categoryId, categoryId));
  }

  async getAllItemsByPackingList(packingListId: number): Promise<Item[]> {
    const categoryList = await db
      .select()
      .from(categories)
      .where(eq(categories.packingListId, packingListId));
    
    const categoryIds = categoryList.map(category => category.id);
    if (categoryIds.length === 0) return [];
    
    return await db.select().from(items).where(inArray(items.categoryId, categoryIds));
  }
  
  async getAllUnassignedItems(packingListId: number, type: string): Promise<Item[]> {
    // Validate type parameter
    if (!['category', 'bag', 'traveler'].includes(type)) {
      console.log(`[WARNING] Invalid type '${type}' passed to getAllUnassignedItems`);
      return [];
    }
    
    try {
      // For better performance, use direct SQL queries with isNull
      if (type === 'category') {
        return await db
          .select()
          .from(items)
          .where(
            and(
              eq(items.packingListId, packingListId),
              isNull(items.categoryId)
            )
          );
      } else if (type === 'bag') {
        return await db
          .select()
          .from(items)
          .where(
            and(
              eq(items.packingListId, packingListId),
              isNull(items.bagId)
            )
          );
      } else if (type === 'traveler') {
        return await db
          .select()
          .from(items)
          .where(
            and(
              eq(items.packingListId, packingListId),
              isNull(items.travelerId)
            )
          );
      }
    } catch (error) {
      console.error(`[ERROR] Failed to get unassigned ${type} items:`, error);
      throw error;
    }
    
    // Default fallback (shouldn't reach here due to type validation)
    return [];
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    // Create a copy of the data to avoid modifying the original
    let itemData: any = { ...insertItem };
    
    // Handle dueDate conversion
    if (insertItem.dueDate !== undefined) {
      if (insertItem.dueDate === null || (typeof insertItem.dueDate === 'string' && insertItem.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        itemData.dueDate = null;
      } else if (typeof insertItem.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        itemData.dueDate = new Date(insertItem.dueDate);
      }
    }
    
    const [item] = await db
      .insert(items)
      .values(itemData)
      .returning();
    return item;
  }

  async updateItem(id: number, data: Partial<InsertItem>): Promise<Item | undefined> {
    // Create a copy of the data to avoid modifying the original
    let updateData: any = { ...data };
    
    // Log the update data for debugging
    console.log(`[DEBUG] DatabaseStorage.updateItem called for item ${id}:`, updateData);
    
    // Ensure packed status is properly handled as a boolean
    if (updateData.packed !== undefined) {
      if (typeof updateData.packed === 'string') {
        updateData.packed = updateData.packed.toLowerCase() === 'true';
        console.log(`[DEBUG] Converted packed string to boolean: ${updateData.packed}`);
      }
      // Explicitly log the packed status
      console.log(`[DEBUG] Item ${id} packed status being set to: ${updateData.packed}`);
    }
    
    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      if (data.dueDate === null || (typeof data.dueDate === 'string' && data.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        updateData.dueDate = null;
      } else if (typeof data.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        updateData.dueDate = new Date(data.dueDate);
      }
    }
    
    try {
      const [updatedItem] = await db
        .update(items)
        .set(updateData)
        .where(eq(items.id, id))
        .returning();
      
      console.log(`[DEBUG] Successfully updated item ${id} in database:`, updatedItem);
      return updatedItem || undefined;
    } catch (error) {
      console.error(`[ERROR] Failed to update item ${id} in database:`, error);
      throw error;
    }
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async bulkUpdateItems(ids: number[], data: Partial<InsertItem>): Promise<number> {
    console.log("bulkUpdateItems called with ids:", ids);
    console.log("and data:", data);
    
    // Create a copy of the data to avoid modifying the original
    let updateData: any = { ...data };
    
    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      if (data.dueDate === null || (typeof data.dueDate === 'string' && data.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        updateData.dueDate = null;
      } else if (typeof data.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        updateData.dueDate = new Date(data.dueDate);
      }
    }
    
    // Ensure ids are all valid numbers
    const validIds = ids.filter(id => typeof id === 'number' && !isNaN(id));
    console.log("Filtered valid ids:", validIds);
    
    if (validIds.length === 0) {
      console.log("No valid ids, returning 0");
      return 0;
    }
    
    try {
      // Use a different approach with SQL OR conditions instead of inArray
      let updatedCount = 0;
      
      // Update items one by one instead of using inArray
      for (const id of validIds) {
        const result = await db.update(items)
          .set(updateData)
          .where(eq(items.id, id))
          .returning();
        
        updatedCount += result.length;
      }
      
      console.log("Updated count:", updatedCount);
      return updatedCount;
    } catch (error) {
      console.error("Error in bulkUpdateItems:", error);
      throw error;
    }
  }

  async bulkUpdateItemsByCategory(categoryId: number, data: Partial<InsertItem>): Promise<number> {
    if (isNaN(categoryId)) {
      return 0;
    }
    
    // Create a copy of the data to avoid modifying the original
    let updateData: any = { ...data };
    
    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      if (data.dueDate === null || (typeof data.dueDate === 'string' && data.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        updateData.dueDate = null;
      } else if (typeof data.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        updateData.dueDate = new Date(data.dueDate);
      }
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(eq(items.categoryId, categoryId))
      .returning();
    
    return result.length;
  }

  async bulkUpdateItemsByBag(bagId: number, data: Partial<InsertItem>): Promise<number> {
    if (isNaN(bagId)) {
      return 0;
    }
    
    // Create a copy of the data to avoid modifying the original
    let updateData: any = { ...data };
    
    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      if (data.dueDate === null || (typeof data.dueDate === 'string' && data.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        updateData.dueDate = null;
      } else if (typeof data.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        updateData.dueDate = new Date(data.dueDate);
      }
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(eq(items.bagId, bagId))
      .returning();
    
    return result.length;
  }

  async bulkUpdateItemsByTraveler(travelerId: number, data: Partial<InsertItem>): Promise<number> {
    if (isNaN(travelerId)) {
      return 0;
    }
    
    // Create a copy of the data to avoid modifying the original
    let updateData: any = { ...data };
    
    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      if (data.dueDate === null || (typeof data.dueDate === 'string' && data.dueDate.trim() === '')) {
        // If dueDate is null or empty string, set it to null
        updateData.dueDate = null;
      } else if (typeof data.dueDate === 'string') {
        // Only convert non-empty strings to Date objects
        updateData.dueDate = new Date(data.dueDate);
      }
    }
    
    const result = await db.update(items)
      .set(updateData)
      .where(eq(items.travelerId, travelerId))
      .returning();
    
    return result.length;
  }

  // Template methods
  async getTemplates(): Promise<Template[]> {
    return await db.select().from(templates);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db
      .insert(templates)
      .values(insertTemplate)
      .returning();
    return template;
  }
  
  // Collaboration methods
  async getCollaborators(packingListId: number): Promise<PackingListCollaborator[]> {
    return await db
      .select()
      .from(packingListCollaborators)
      .where(eq(packingListCollaborators.packingListId, packingListId));
  }
  
  async addCollaborator(collaborator: InsertCollaborator): Promise<PackingListCollaborator> {
    console.log(`[DEBUG] In addCollaborator with data:`, collaborator);
    
    // Check if a collaborator with the same packingListId and userId already exists
    const [existingCollaborator] = await db
      .select()
      .from(packingListCollaborators)
      .where(
        and(
          eq(packingListCollaborators.packingListId, collaborator.packingListId),
          eq(packingListCollaborators.userId, collaborator.userId)
        )
      );
    
    console.log(`[DEBUG] Existing collaborator check:`, existingCollaborator);
    
    if (existingCollaborator) {
      console.log(`[DEBUG] Collaborator already exists, returning existing one`);
      return existingCollaborator;
    }
    
    console.log(`[DEBUG] No existing collaborator found, creating new one`);
    
    try {
      const [newCollaborator] = await db
        .insert(packingListCollaborators)
        .values(collaborator)
        .returning();
      
      console.log(`[DEBUG] Successfully created new collaborator:`, newCollaborator);
      return newCollaborator;
    } catch (error) {
      console.error(`[ERROR] Failed to create collaborator:`, error);
      throw error;
    }
  }
  
  async removeCollaborator(packingListId: number, userId: number): Promise<void> {
    await db
      .delete(packingListCollaborators)
      .where(
        and(
          eq(packingListCollaborators.packingListId, packingListId),
          eq(packingListCollaborators.userId, userId)
        )
      );
  }
  
  async getSharedPackingLists(userId: number): Promise<PackingList[]> {
    // Get all packing list IDs that this user is a collaborator on
    const collaborations = await db
      .select()
      .from(packingListCollaborators)
      .where(eq(packingListCollaborators.userId, userId));
    
    console.log(`[DEBUG] getSharedPackingLists for userId ${userId}:`, collaborations);
    
    if (collaborations.length === 0) return [];
    
    const packingListIds = collaborations.map(collab => collab.packingListId);
    console.log(`[DEBUG] packingListIds for shared lists:`, packingListIds);
    
    // Get all these packing lists
    const sharedLists = await db
      .select()
      .from(packingLists)
      .where(inArray(packingLists.id, packingListIds));
    
    console.log(`[DEBUG] returning shared lists:`, sharedLists);
    return sharedLists;
  }
  
  async createInvitation(invitation: InsertInvitation): Promise<CollaborationInvitation> {
    // Generate a random token
    const token = Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);
    
    // Set expiration date (1 week from now)
    const now = new Date();
    const oneWeekLater = new Date(now);
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    // Ensure permissionLevel has a default value
    const invitationData = {
      packingListId: invitation.packingListId,
      invitedByUserId: invitation.invitedByUserId,
      email: invitation.email,
      permissionLevel: invitation.permissionLevel || 'read',
      token,
      expires: oneWeekLater
    };
    
    const [newInvitation] = await db
      .insert(collaborationInvitations)
      .values(invitationData)
      .returning();
    
    return newInvitation;
  }
  
  async getInvitation(token: string): Promise<CollaborationInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.token, token));
    
    return invitation || undefined;
  }
  
  async acceptInvitation(token: string, userId: number): Promise<void> {
    console.log(`[DEBUG] Accepting invitation with token ${token} for user ${userId}`);
    
    const invitation = await this.getInvitation(token);
    console.log(`[DEBUG] Found invitation:`, invitation);
    
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.accepted) throw new Error("Invitation already accepted");
    if (invitation.expires < new Date()) throw new Error("Invitation expired");
    
    console.log(`[DEBUG] Invitation is valid, accepting it`);
    
    // Mark invitation as accepted
    await db
      .update(collaborationInvitations)
      .set({ accepted: true })
      .where(eq(collaborationInvitations.token, token));
    
    console.log(`[DEBUG] Marked invitation as accepted in the database`);
    
    // Add the user as a collaborator
    const collaboratorData = {
      packingListId: invitation.packingListId,
      userId,
      permissionLevel: invitation.permissionLevel
    };
    
    console.log(`[DEBUG] Adding user as collaborator with data:`, collaboratorData);
    
    try {
      await this.addCollaborator(collaboratorData);
      console.log(`[DEBUG] Successfully added collaborator`);
    } catch (error) {
      console.error(`[ERROR] Failed to add collaborator:`, error);
      throw error;
    }
  }
  
  async getInvitationsByPackingList(packingListId: number): Promise<CollaborationInvitation[]> {
    return await db
      .select()
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.packingListId, packingListId));
  }
  
  async deleteInvitation(invitationId: number): Promise<void> {
    // Check if the invitation exists before deleting
    const [invitation] = await db
      .select()
      .from(collaborationInvitations)
      .where(eq(collaborationInvitations.id, invitationId));
      
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    
    // Delete the invitation
    await db
      .delete(collaborationInvitations)
      .where(eq(collaborationInvitations.id, invitationId));
  }
  
  async getPendingInvitationsByEmail(email: string): Promise<CollaborationInvitation[]> {
    // Use ISO string format for date comparison to avoid type issues
    const now = new Date().toISOString();
    
    return await db
      .select()
      .from(collaborationInvitations)
      .where(
        and(
          eq(collaborationInvitations.email, email),
          eq(collaborationInvitations.accepted, false),
          sql`${collaborationInvitations.expires} > ${now}`
        )
      );
  }
  
  async canUserAccessPackingList(userId: number, packingListId: number): Promise<boolean> {
    // Check if user is the owner
    const [packingList] = await db
      .select()
      .from(packingLists)
      .where(
        and(
          eq(packingLists.id, packingListId),
          eq(packingLists.userId, userId)
        )
      );
    
    if (packingList) return true;
    
    // Check if user is a collaborator
    const [collaborator] = await db
      .select()
      .from(packingListCollaborators)
      .where(
        and(
          eq(packingListCollaborators.packingListId, packingListId),
          eq(packingListCollaborators.userId, userId)
        )
      );
    
    return !!collaborator;
  }
}

export const storage = new DatabaseStorage();
