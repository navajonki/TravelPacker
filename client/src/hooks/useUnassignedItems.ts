import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Custom hook for managing unassigned items across the app.
 * This hook centralizes the logic for fetching and refreshing unassigned items.
 * 
 * @param packingListId The ID of the packing list
 * @param viewContext The context: 'category', 'bag', or 'traveler'
 * @returns Query result with data, loading state, and refresh function
 */
export default function useUnassignedItems(
  packingListId: number, 
  viewContext: "category" | "bag" | "traveler"
) {
  const queryClient = useQueryClient();
  
  // Define the query key for this view context
  const queryKey = [`/api/packing-lists/${packingListId}/unassigned/${viewContext}`];
  
  // Use the specialized endpoint for unassigned items
  const queryResult = useQuery({
    queryKey,
    enabled: !!packingListId,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchOnWindowFocus: true,
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
      
      // Trigger an immediate refetch since we know the data has changed
      queryResult.refetch();
    };
    
    // Do an initial refresh
    refreshData();
    
    // Register for the custom item-container-deleted event
    window.addEventListener('item-container-deleted', refreshData);
    
    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('item-container-deleted', refreshData);
    };
  }, [packingListId, viewContext, queryClient, queryKey, queryResult]);
  
  /**
   * Force an immediate refresh of the unassigned items data
   */
  const forceRefresh = async () => {
    // Invalidate all related queries to ensure we get fresh data
    queryClient.invalidateQueries({ queryKey });
    
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
  };
}