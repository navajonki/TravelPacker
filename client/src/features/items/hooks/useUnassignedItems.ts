/**
 * Custom hook for managing unassigned items across the app.
 * This hook centralizes the logic for fetching and refreshing unassigned items.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Item } from "@shared/schema";
import { ViewContext } from "@shared/types";
import { ItemApi } from "@/api/apiClient";

/**
 * Hook for fetching and managing unassigned items
 * 
 * @param packingListId The ID of the packing list
 * @param viewContext The context: 'category', 'bag', or 'traveler'
 * @returns Query result with data, loading state, and refresh function
 */
export function useUnassignedItems(
  packingListId: number, 
  viewContext: ViewContext
) {
  const queryClient = useQueryClient();
  
  // Define the query key for this view context
  const queryKey = [`/api/packing-lists/${packingListId}/unassigned/${viewContext}`];
  
  // Use the specialized endpoint for unassigned items
  const queryResult = useQuery<Item[]>({
    queryKey,
    enabled: !!packingListId,
    staleTime: 0, // Always refetch to ensure fresh data
    // IMPORTANT: Set a shorter cache time to ensure data is fresh
    cacheTime: 30 * 1000, // 30 seconds cache
    // Listen to global cache invalidation events
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Use the API client to fetch data
    queryFn: () => ItemApi.getAllUnassigned(packingListId, viewContext)
  });
  
  // Force a refresh when component mounts or when deletion events occur
  useEffect(() => {
    // Invalidate this query and related queries
    const refreshData = (event?: Event) => {
      const customEvent = event as CustomEvent;
      console.log(`[useUnassignedItems] Refreshing ${viewContext} unassigned items`, 
        customEvent?.detail ? `due to ${customEvent.detail.type} deletion` : 'on mount');
      
      // Always invalidate our main query
      queryClient.invalidateQueries({ queryKey });
      
      // Also invalidate related data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/packing-lists/${packingListId}/all-items`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/packing-lists/${packingListId}/items`] 
      });
      
      // Also listen for item updates related to packed status
      window.addEventListener('item-packed-status-changed', refreshData, { once: true });
      
      // Trigger an immediate refetch since we know the data has changed
      queryResult.refetch();
    };
    
    // Do an initial refresh
    refreshData();
    
    // Register for the custom item-container-deleted event
    window.addEventListener('item-container-deleted', refreshData);
    
    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('item-container-deleted', refreshData);
      window.removeEventListener('item-packed-status-changed', refreshData);
    };
  }, [packingListId, viewContext, queryClient, queryKey, queryResult]);
  
  /**
   * Force an immediate refresh of the unassigned items data
   */
  const forceRefresh = async () => {
    // Invalidate all related queries to ensure we get fresh data
    queryClient.invalidateQueries({ queryKey });
    
    // Also invalidate main items list
    queryClient.invalidateQueries({ 
      queryKey: [`/api/packing-lists/${packingListId}/items`] 
    });
    
    // Also invalidate other related queries for consistency
    queryClient.invalidateQueries({ 
      queryKey: [`/api/packing-lists/${packingListId}/categories`] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [`/api/packing-lists/${packingListId}/bags`] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [`/api/packing-lists/${packingListId}/travelers`] 
    });
    queryClient.invalidateQueries({ 
      queryKey: [`/api/packing-lists/${packingListId}/all-items`] 
    });
    
    // Trigger a refetch to update the UI
    return queryResult.refetch();
  };
  
  return {
    ...queryResult,
    forceRefresh,
    // Cast data to appropriate type
    data: queryResult.data || [],
  };
}