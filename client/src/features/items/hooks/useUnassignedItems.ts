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
    staleTime: 60000, // Consider data fresh for 60 seconds (up from 5 seconds)
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchInterval: false, // Disable automatic refetching
    // Use the API client to fetch data
    queryFn: () => ItemApi.getAllUnassigned(packingListId, viewContext)
  });
  
  // Force a refresh when component mounts or when deletion events occur
  useEffect(() => {
    // Handler function for both events
    const handleDataChanged = () => {
      // Always invalidate our main query
      queryClient.invalidateQueries({ queryKey });
      
      // Also invalidate related data
      queryClient.invalidateQueries({ 
        queryKey: [`/api/packing-lists/${packingListId}/all-items`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/packing-lists/${packingListId}/items`] 
      });
      
      // Trigger an immediate refetch since we know the data has changed
      queryResult.refetch();
    };
    
    // Only do an initial data invalidation, not a full refresh on mount
    queryClient.invalidateQueries({ queryKey });
    
    // Register event listeners - only once per mount
    window.addEventListener('item-container-deleted', handleDataChanged);
    window.addEventListener('item-packed-status-changed', handleDataChanged);
    
    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('item-container-deleted', handleDataChanged);
      window.removeEventListener('item-packed-status-changed', handleDataChanged);
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