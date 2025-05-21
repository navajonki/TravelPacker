/**
 * Centralized query invalidation service for the application.
 * This provides standard patterns for invalidating related queries
 * when mutations occur.
 */
import { QueryClient } from '@tanstack/react-query';

/**
 * Invalidation patterns for packing list data
 */
export const invalidatePackingList = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  // Invalidate the specific packing list
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}`] 
  });
  
  // Invalidate all packing lists
  queryClient.invalidateQueries({ 
    queryKey: ['/api/packing-lists'] 
  });
};

/**
 * Invalidation patterns for item data 
 */
export const invalidateItems = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  // Invalidate all items in the packing list
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/items`] 
  });
  
  // Invalidate all-items endpoint
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/all-items`] 
  });
  
  // Invalidate unassigned items for all view contexts
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] 
  });
};

/**
 * Invalidation patterns for category data
 */
export const invalidateCategories = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  // Invalidate the categories list
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/categories`] 
  });
  
  // Invalidate items as well, since they might have category associations
  invalidateItems(queryClient, packingListId);
};

/**
 * Invalidation patterns for bag data
 */
export const invalidateBags = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  // Invalidate the bags list
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/bags`] 
  });
  
  // Invalidate items as well, since they might have bag associations
  invalidateItems(queryClient, packingListId);
};

/**
 * Invalidation patterns for traveler data
 */
export const invalidateTravelers = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  // Invalidate the travelers list
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/travelers`] 
  });
  
  // Invalidate items as well, since they might have traveler associations
  invalidateItems(queryClient, packingListId);
};

/**
 * Invalidate all data for a packing list
 */
export const invalidateAllPackingListData = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  invalidatePackingList(queryClient, packingListId);
  invalidateCategories(queryClient, packingListId);
  invalidateBags(queryClient, packingListId);
  invalidateTravelers(queryClient, packingListId);
  invalidateItems(queryClient, packingListId);
};

/**
 * Invalidate collaborator data
 */
export const invalidateCollaborators = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/collaborators`] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['/api/shared-packing-lists'] 
  });
};

/**
 * Invalidate invitation data
 */
export const invalidateInvitations = (
  queryClient: QueryClient, 
  packingListId: number
) => {
  queryClient.invalidateQueries({ 
    queryKey: [`/api/packing-lists/${packingListId}/invitations`] 
  });
  
  queryClient.invalidateQueries({ 
    queryKey: ['/api/invitations'] 
  });
};