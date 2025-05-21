/**
 * This file defines TypeScript interfaces for the application data model
 * extending the base types provided by the database schema.
 */

import { 
  User, PackingList, Item, Category, Bag, Traveler, 
  CollaborationInvitation, PackingListCollaborator, Template,
  InsertItem, InsertCategory, InsertBag, InsertTraveler
} from './schema';

// =============================
// Enhanced Types for Components
// =============================

/**
 * Represents viewable contexts in the application
 */
export type ViewContext = 'category' | 'bag' | 'traveler';

/**
 * Enhanced User type with additional UI-related properties
 */
export interface UserWithDetails extends User {
  isOwner?: boolean;
  avatarUrl?: string;
}

/**
 * Enhanced PackingList type with stats and UI properties
 */
export interface PackingListWithStats extends PackingList {
  itemCount: number;
  packedItemCount: number;
  progress: number;
  collaboratorCount?: number;
  collaborators?: UserWithDetails[];
  ownerUsername?: string;
}

/**
 * Enhanced Category type with its items and statistics
 */
export interface CategoryWithItems extends Category {
  items: ItemWithAssociations[];
  totalItems: number;
  packedItems: number;
}

/**
 * Enhanced Bag type with its items and statistics
 */
export interface BagWithItems extends Bag {
  items: ItemWithAssociations[];
  totalItems: number;
  packedItems: number;
}

/**
 * Enhanced Traveler type with its items and statistics
 */
export interface TravelerWithItems extends Traveler {
  items: ItemWithAssociations[];
  totalItems: number;
  packedItems: number;
}

/**
 * Item with all possible associations
 */
export interface ItemWithAssociations extends Item {
  category?: Category | null;
  bag?: Bag | null;
  traveler?: Traveler | null;
  categoryName?: string;
  bagName?: string;
  travelerName?: string;
}

/**
 * Invitation with additional details
 */
export interface InvitationWithDetails extends CollaborationInvitation {
  packingList?: {
    id: number;
    name: string;
    theme?: string | null;
    dateRange?: string | null;
  };
  inviterName?: string;
}

// =============================
// API Response Types
// =============================

/**
 * Generic API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Error response from API
 */
export interface ApiError {
  message: string;
  status: number;
  errors?: any[];
}

// =============================
// Request Types
// =============================

/**
 * Item update request 
 */
export interface UpdateItemRequest extends Partial<InsertItem> {
  id: number;
}

/**
 * Bulk update items request
 */
export interface BulkUpdateItemsRequest {
  itemIds: number[];
  updates: Partial<InsertItem>;
}

/**
 * Move items between categories request
 */
export interface MoveItemsRequest {
  itemIds: number[];
  targetCategoryId: number | null;
}

/**
 * Move items between bags request
 */
export interface AssignItemsToBagRequest {
  itemIds: number[];
  targetBagId: number | null;
}

/**
 * Move items between travelers request
 */
export interface AssignItemsToTravelerRequest {
  itemIds: number[];
  targetTravelerId: number | null;
}

/**
 * Invitation creation request
 */
export interface CreateInvitationRequest {
  email: string;
  packingListId: number;
  permissionLevel: 'viewer' | 'editor' | 'admin';
}

// =============================
// Component Prop Types
// =============================

/**
 * Base props for card components
 */
export interface BaseCardProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
  viewContext?: ViewContext;
}

/**
 * Modal props base type
 */
export interface BaseModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Item selection handler props
 */
export interface SelectableProps {
  isMultiEditMode: boolean;
  isSelected: boolean;
  onSelectChange: (id: number, isSelected: boolean) => void;
}

// =============================
// Utility Types
// =============================

/**
 * Permission levels in the system
 */
export type PermissionLevel = 'viewer' | 'editor' | 'admin';

/**
 * Sync status options
 */
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

/**
 * Toast message variations
 */
export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';