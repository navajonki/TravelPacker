/**
 * Centralized API client for making requests to the server
 */
import { 
  ApiResponse, ApiError, UpdateItemRequest, BulkUpdateItemsRequest,
  MoveItemsRequest, AssignItemsToBagRequest, AssignItemsToTravelerRequest,
  CreateInvitationRequest, ExtendedApiError
} from '@shared/types';
import { 
  Item, Category, Bag, Traveler, PackingList, User,
  InsertItem, InsertCategory, InsertBag, InsertTraveler, InsertPackingList
} from '@shared/schema';
import errorService, { formatApiError, retryWithBackoff, createTimeoutController } from '@/services/errorHandling';
import { createLogger } from '@/services/logging';

const logger = createLogger('api');

// Error handling utility
async function handleApiResponse<T>(response: Response): Promise<T> {
  // Handle non-2xx responses
  if (!response.ok) {
    const error = await formatApiError(response);
    throw error;
  }

  // If there's no content, return an empty object
  if (response.status === 204) {
    return {} as T;
  }
  
  // Parse the response as JSON
  try {
    return await response.json();
  } catch (error) {
    logger.error('Failed to parse response JSON', error);
    throw {
      message: 'Failed to parse server response',
      status: response.status
    } as ApiError;
  }
}

// Default options for API requests
const defaultOptions = {
  timeout: 30000, // 30 seconds default timeout
  retries: 2,     // 2 retries by default for GET requests
  headers: {}     // Additional headers
};

// Base API request function
async function apiRequest<T>(
  method: string,
  url: string,
  data?: unknown,
  options: {
    timeout?: number;
    retries?: number;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  // Merge options with defaults
  const { timeout, retries, headers } = { ...defaultOptions, ...options };
  const isGetRequest = method.toUpperCase() === 'GET';
  const shouldRetry = isGetRequest && retries > 0;
  
  // Request context for logging
  const requestContext = { method, url, timeout };
  
  // Use retry mechanism for GET requests
  if (shouldRetry) {
    return retryWithBackoff(
      () => executeRequest<T>(method, url, data, timeout, headers),
      {
        maxRetries: retries,
        shouldRetry: (error) => {
          // Only retry server errors and timeouts, not 4xx client errors
          const status = error?.status || 0;
          return status === 0 || status >= 500;
        }
      }
    );
  }
  
  // For non-GET requests or when retries are disabled, just execute once
  return executeRequest<T>(method, url, data, timeout, headers);
}

// Execute a single API request
async function executeRequest<T>(
  method: string,
  url: string,
  data?: unknown,
  timeout?: number,
  additionalHeaders: Record<string, string> = {}
): Promise<T> {
  // Create a timeout controller
  const { controller, clear } = createTimeoutController(timeout);
  
  try {
    // Generate request ID for logging
    const requestId = Math.random().toString(36).substring(2, 10);
    
    // Log the request
    logger.debug(`Request [${requestId}] ${method} ${url}`, { 
      method, url, data: data ? JSON.stringify(data).substring(0, 100) : undefined 
    });
    
    // Prepare headers
    const headers: Record<string, string> = {
      ...additionalHeaders
    };
    
    // Add Content-Type for requests with body
    if (data) {
      headers['Content-Type'] = 'application/json';
    }
    
    // Execute the fetch request with timeout
    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
      signal: controller.signal
    });

    // Process the response
    const result = await handleApiResponse<T>(response);
    
    // Log the success response
    logger.debug(`Response [${requestId}] ${method} ${url}`, { 
      status: response.status,
      data: typeof result === 'object' ? 'Object' : result 
    });
    
    return result;
  } catch (error) {
    // Process and log the error
    const processedError = errorService.processError(error, { method, url });
    
    logger.error(`API Error: ${method} ${url}`, processedError);
    
    throw processedError;
  } finally {
    // Clear the timeout to prevent memory leaks
    clear();
  }
}

// API Methods organized by domain

/**
 * Authentication related API calls
 */
export const AuthApi = {
  login: (username: string, password: string) => 
    apiRequest<User>('POST', '/api/auth/login', { username, password }),
  
  logout: () => 
    apiRequest<void>('POST', '/api/auth/logout'),
  
  getCurrentUser: () => 
    apiRequest<User>('GET', '/api/auth/me'),
  
  register: (username: string, password: string) => 
    apiRequest<User>('POST', '/api/auth/register', { username, password })
};

/**
 * Packing list related API calls
 */
export const PackingListApi = {
  getAll: () => 
    apiRequest<PackingList[]>('GET', '/api/packing-lists?userId=1'),
  
  getById: (id: number) => 
    apiRequest<PackingList>('GET', `/api/packing-lists/${id}`),
  
  create: (data: InsertPackingList) => 
    apiRequest<PackingList>('POST', '/api/packing-lists', data),
  
  update: (id: number, data: Partial<InsertPackingList>) => 
    apiRequest<PackingList>('PATCH', `/api/packing-lists/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/packing-lists/${id}`),
    
  exportToCsv: (id: number) => 
    `/api/packing-lists/${id}/export`,
    
  getSharedLists: () => 
    apiRequest<PackingList[]>('GET', '/api/shared-packing-lists')
};

/**
 * Category related API calls
 */
export const CategoryApi = {
  getAllForPackingList: (packingListId: number) => 
    apiRequest<Category[]>('GET', `/api/packing-lists/${packingListId}/categories`),
  
  getById: (id: number) => 
    apiRequest<Category>('GET', `/api/categories/${id}`),
  
  create: (data: InsertCategory) => 
    apiRequest<Category>('POST', '/api/categories', data),
  
  update: (id: number, data: Partial<InsertCategory>) => 
    apiRequest<Category>('PATCH', `/api/categories/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/categories/${id}`)
};

/**
 * Bag related API calls
 */
export const BagApi = {
  getAllForPackingList: (packingListId: number) => 
    apiRequest<Bag[]>('GET', `/api/packing-lists/${packingListId}/bags`),
  
  getById: (id: number) => 
    apiRequest<Bag>('GET', `/api/bags/${id}`),
  
  create: (data: InsertBag) => 
    apiRequest<Bag>('POST', '/api/bags', data),
  
  update: (id: number, data: Partial<InsertBag>) => 
    apiRequest<Bag>('PATCH', `/api/bags/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/bags/${id}`)
};

/**
 * Traveler related API calls
 */
export const TravelerApi = {
  getAllForPackingList: (packingListId: number) => 
    apiRequest<Traveler[]>('GET', `/api/packing-lists/${packingListId}/travelers`),
  
  getById: (id: number) => 
    apiRequest<Traveler>('GET', `/api/travelers/${id}`),
  
  create: (data: InsertTraveler) => 
    apiRequest<Traveler>('POST', '/api/travelers', data),
  
  update: (id: number, data: Partial<InsertTraveler>) => 
    apiRequest<Traveler>('PATCH', `/api/travelers/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/travelers/${id}`)
};

/**
 * Item related API calls
 */
export const ItemApi = {
  getAllForCategory: (categoryId: number) => 
    apiRequest<Item[]>('GET', `/api/categories/${categoryId}/items`),
  
  getAllForPackingList: (packingListId: number) => 
    apiRequest<Item[]>('GET', `/api/packing-lists/${packingListId}/items`),
  
  getAllUnassigned: (packingListId: number, type: 'category' | 'bag' | 'traveler') => 
    apiRequest<Item[]>('GET', `/api/packing-lists/${packingListId}/unassigned/${type}`),
  
  getById: (id: number) => 
    apiRequest<Item>('GET', `/api/items/${id}`),
  
  create: (data: InsertItem) => 
    apiRequest<Item>('POST', '/api/items', data),
  
  update: (id: number, data: Partial<InsertItem>) => 
    apiRequest<Item>('PATCH', `/api/items/${id}`, data),
  
  delete: (id: number) => 
    apiRequest<void>('DELETE', `/api/items/${id}`),
  
  bulkUpdate: (itemIds: number[], updates: Partial<InsertItem>) => 
    apiRequest<{ count: number }>('POST', '/api/items/multi-edit', { 
      itemIds, 
      updates 
    }),
    
  moveItems: (data: MoveItemsRequest) => 
    apiRequest<{ count: number }>('POST', '/api/items/move-category', data),
    
  assignToBag: (data: AssignItemsToBagRequest) => 
    apiRequest<{ count: number }>('POST', '/api/items/assign-bag', data),
    
  assignToTraveler: (data: AssignItemsToTravelerRequest) => 
    apiRequest<{ count: number }>('POST', '/api/items/assign-traveler', data)
};

/**
 * Collaboration related API calls
 */
export const CollaborationApi = {
  getCollaborators: (packingListId: number) => 
    apiRequest<PackingListCollaborator[]>('GET', `/api/packing-lists/${packingListId}/collaborators`),
  
  addCollaborator: (packingListId: number, userId: number, permissionLevel: string) => 
    apiRequest<PackingListCollaborator>('POST', '/api/collaborators', { 
      packingListId, 
      userId, 
      permissionLevel 
    }),
  
  removeCollaborator: (packingListId: number, userId: number) => 
    apiRequest<void>('DELETE', `/api/packing-lists/${packingListId}/collaborators/${userId}`),
  
  createInvitation: (data: CreateInvitationRequest) => 
    apiRequest<CollaborationInvitation>('POST', `/api/packing-lists/${data.packingListId}/invitations`, {
      email: data.email,
      role: data.permissionLevel
    }),
  
  getInvitations: (packingListId: number) => 
    apiRequest<CollaborationInvitation[]>('GET', `/api/packing-lists/${packingListId}/invitations`),
  
  getInvitationByToken: (token: string) => 
    apiRequest<CollaborationInvitation>('GET', `/api/invitations/${token}`),
  
  acceptInvitation: (token: string) => 
    apiRequest<{ message: string, packingListId: number }>('POST', `/api/invitations/${token}/accept`),
  
  getPendingInvitations: () => 
    apiRequest<CollaborationInvitation[]>('GET', '/api/invitations')
};

// Export a default apiClient object with all API domains
const apiClient = {
  auth: AuthApi,
  packingLists: PackingListApi,
  categories: CategoryApi,
  bags: BagApi, 
  travelers: TravelerApi,
  items: ItemApi,
  collaboration: CollaborationApi,
  // Add utilities for direct access
  request: apiRequest,
  errorHandler: errorService
};

export default apiClient;