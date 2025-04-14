import { pgTable, text, serial, integer, boolean, timestamp, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// PackingLists schema
export const packingLists = pgTable("packing_lists", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  theme: text("theme"),
  dateRange: text("date_range"),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertPackingListSchema = createInsertSchema(packingLists).pick({
  name: true,
  theme: true,
  dateRange: true,
  userId: true,
});

// Collaborators junction table
export const packingListCollaborators = pgTable("packing_list_collaborators", {
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id),
  userId: integer("user_id").notNull().references(() => users.id),
  permissionLevel: varchar("permission_level", { length: 20 }).notNull().default("editor"),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.packingListId, table.userId] }),
  };
});

export const insertCollaboratorSchema = createInsertSchema(packingListCollaborators).pick({
  packingListId: true,
  userId: true,
  permissionLevel: true,
});

// Collaboration invitations table
export const collaborationInvitations = pgTable("collaboration_invitations", {
  id: serial("id").primaryKey(),
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id),
  invitedByUserId: integer("invited_by_user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  permissionLevel: varchar("permission_level", { length: 20 }).notNull().default("editor"),
  accepted: boolean("accepted").notNull().default(false),
  expires: timestamp("expires").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertInvitationSchema = createInsertSchema(collaborationInvitations).pick({
  packingListId: true,
  invitedByUserId: true,
  email: true,
  permissionLevel: true,
});

// Bags schema
export const bags = pgTable("bags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertBagSchema = createInsertSchema(bags).pick({
  name: true,
  packingListId: true,
});

// Travelers schema
export const travelers = pgTable("travelers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertTravelerSchema = createInsertSchema(travelers).pick({
  name: true,
  packingListId: true,
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  packingListId: integer("packing_list_id").notNull().references(() => packingLists.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  position: true,
  packingListId: true,
});

// Items schema
export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  packed: boolean("packed").notNull().default(false),
  isEssential: boolean("is_essential").notNull().default(false),
  dueDate: timestamp("due_date"),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  bagId: integer("bag_id").references(() => bags.id),
  travelerId: integer("traveler_id").references(() => travelers.id),
  createdBy: integer("created_by").references(() => users.id),
  lastModifiedBy: integer("last_modified_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertItemSchema = createInsertSchema(items).omit({
  id: true,
  createdAt: true,
}).extend({
  dueDate: z.string().optional(),
});

// Templates schema
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertTemplateSchema = createInsertSchema(templates).pick({
  name: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type PackingList = typeof packingLists.$inferSelect;
export type InsertPackingList = z.infer<typeof insertPackingListSchema>;

export type PackingListCollaborator = typeof packingListCollaborators.$inferSelect;
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;

export type CollaborationInvitation = typeof collaborationInvitations.$inferSelect;
export type InsertInvitation = z.infer<typeof insertInvitationSchema>;

export type Bag = typeof bags.$inferSelect;
export type InsertBag = z.infer<typeof insertBagSchema>;

export type Traveler = typeof travelers.$inferSelect;
export type InsertTraveler = z.infer<typeof insertTravelerSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Item = typeof items.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
