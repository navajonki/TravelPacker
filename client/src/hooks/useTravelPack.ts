import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useTravelPack(packingListId?: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  
  // Query hooks
  const usePackingLists = () => useQuery({
    queryKey: ['/api/packing-lists?userId=1'],
  });
  
  const usePackingList = (id: number) => useQuery({
    queryKey: [`/api/packing-lists/${id}`],
    enabled: !!id
  });
  
  const useCategories = (id: number) => useQuery({
    queryKey: [`/api/packing-lists/${id}/categories`],
    enabled: !!id
  });
  
  const useBags = (id: number) => useQuery({
    queryKey: [`/api/packing-lists/${id}/bags`],
    enabled: !!id
  });
  
  const useTravelers = (id: number) => useQuery({
    queryKey: [`/api/packing-lists/${id}/travelers`],
    enabled: !!id
  });
  
  const useTemplates = () => useQuery({
    queryKey: ['/api/templates'],
  });
  
  // Mutation hooks
  const createPackingList = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/packing-lists', {
        ...data,
        userId: 1 // Using default user
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists?userId=1'] });
      toast({
        title: "Success",
        description: "Packing list created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create packing list",
        variant: "destructive",
      });
    }
  });
  
  const addItemMutation = useMutation({
    mutationFn: async (item: any) => {
      // Ensure the item has a packingListId if we're in a packing list context
      if (packingListId && !item.packingListId) {
        item.packingListId = Number(packingListId);
      }
      return await apiRequest('POST', '/api/items', item);
    },
    onSuccess: () => {
      if (packingListId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
        // Also invalidate uncategorized items queries
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
      }
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  });
  
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      // Ensure the packingListId is maintained when updating an item
      if (packingListId && !data.packingListId) {
        data.packingListId = Number(packingListId);
      }
      return await apiRequest('PATCH', `/api/items/${id}`, data);
    },
    onSuccess: () => {
      if (packingListId) {
        // Invalidate all relevant queries to ensure UI is updated
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
      }
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  });
  
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/items/${id}`);
    },
    onSuccess: () => {
      if (packingListId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      }
      toast({
        title: "Success",
        description: "Item deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  });
  
  const addCategoryMutation = useMutation({
    mutationFn: async ({ name, packingListId }: { name: string, packingListId: number }) => {
      // Get the last position to place new category at the end
      const categoriesResponse = await fetch(`/api/packing-lists/${packingListId}/categories`);
      const categories = await categoriesResponse.json();
      const position = categories.length || 0;
      
      return await apiRequest('POST', '/api/categories', {
        name,
        position,
        packingListId
      });
    },
    onSuccess: () => {
      if (packingListId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      }
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      if (packingListId) {
        // Invalidate all relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        
        // Invalidate all-items and unassigned items queries to show formerly categorized items
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
        
        console.log('Invalidated all queries after category deletion');
      }
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  });
  
  // Multi-select functionality
  const toggleItemSelection = useCallback((itemId: number) => {
    setSelectedItemIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);
  
  const clearSelectedItems = useCallback(() => {
    setSelectedItemIds([]);
  }, []);
  
  const bulkUpdateItems = useMutation({
    mutationFn: async (data: any) => {
      // If we're in a packing list context and setting category/bag/traveler to null,
      // make sure to maintain the packingListId relationship
      if (packingListId && 
          (data.categoryId === null || data.bagId === null || data.travelerId === null)) {
        data.packingListId = Number(packingListId);
      }
      
      return await apiRequest('PATCH', '/api/items/bulk-update', {
        ids: selectedItemIds,
        data
      });
    },
    onSuccess: () => {
      if (packingListId) {
        // Invalidate all relevant queries to ensure UI is updated properly
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
      }
      toast({
        title: "Success",
        description: `${selectedItemIds.length} items updated successfully`,
      });
      clearSelectedItems();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update items",
        variant: "destructive",
      });
    }
  });

  return {
    // Queries
    usePackingLists,
    usePackingList,
    useCategories,
    useBags,
    useTravelers,
    useTemplates,
    
    // Mutations
    createPackingList,
    addItem: addItemMutation.mutate,
    updateItem: updateItemMutation.mutate,
    deleteItem: deleteItemMutation.mutate,
    addCategory: addCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    
    // Multi-select
    selectedItemIds,
    toggleItemSelection,
    clearSelectedItems,
    bulkUpdateItems: bulkUpdateItems.mutate,
    
    // Mutation states
    isAddingItem: addItemMutation.isPending,
    isUpdatingItem: updateItemMutation.isPending,
    isDeletingItem: deleteItemMutation.isPending,
    isAddingCategory: addCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isBulkUpdating: bulkUpdateItems.isPending,
  };
}
