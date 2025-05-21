import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSyncStatus } from "@/hooks/use-sync-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ItemRowProps {
  item: {
    id: number;
    name: string;
    packed: boolean;
    quantity: number;
    bagId?: number;
    travelerId?: number;
    categoryId: number;
  };
  packingListId: number;
  onEditItem?: (itemId: number) => void;
  viewContext?: 'category' | 'bag' | 'traveler';
}

export default function ItemRow({ 
  item, 
  packingListId, 
  onEditItem,
  viewContext = 'category' // Default to category view
}: ItemRowProps) {
  const [hovering, setHovering] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [optimisticPacked, setOptimisticPacked] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const { incrementPending, decrementPending } = useSyncStatus();
  
  const { data: bags = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
  });
  
  const { data: travelers = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
  });
  
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
  });
  
  const getBagName = () => {
    if (!item.bagId || !bags.length) return null;
    const bag = bags.find((b) => b.id === item.bagId);
    return bag?.name;
  };
  
  const getTravelerName = () => {
    if (!item.travelerId || !travelers.length) return null;
    const traveler = travelers.find((t) => t.id === item.travelerId);
    return traveler?.name;
  };
  
  const getCategoryName = () => {
    if (!item.categoryId || !categories.length) return null;
    const category = categories.find((c) => c.id === item.categoryId);
    return category?.name;
  };
  
  // Get the current packed status, considering the optimistic state
  const isItemPacked = optimisticPacked !== null ? optimisticPacked : item.packed;
  
  const togglePackedMutation = useMutation({
    mutationFn: async () => {
      const newPackedState = !isItemPacked;
      incrementPending();
      
      try {
        const updatedItem = await apiRequest('PATCH', `/api/items/${item.id}`, {
          packed: newPackedState
        });
        return updatedItem;
      } catch (error) {
        throw error;
      } finally {
        decrementPending();
      }
    },
    onMutate: async () => {
      // Cancel any outgoing refetches for ALL relevant query keys
      await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      // Store all current data for potential rollback
      const previousCategoryData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/categories`]);
      const previousBagData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/bags`]);
      const previousTravelerData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/travelers`]);
      const previousUnassignedCategoryData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/unassigned/category`]);
      const previousUnassignedBagData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/unassigned/bag`]);
      const previousUnassignedTravelerData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/unassigned/traveler`]);
      const previousAllItemsData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/all-items`]);
      const previousItemsData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);
      
      // Set local optimistic state
      setOptimisticPacked(!isItemPacked);
      const newPackedState = !isItemPacked;
      
      // Notify other components that an item's packed status has changed
      // This will help with synchronization across views
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('item-packed-status-changed', {
          detail: { itemId: item.id, newState: newPackedState }
        }));
      }, 0);
      
      // 1. Update CATEGORY view if data exists
      if (previousCategoryData) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/categories`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((category: any) => {
              // Only update categories that contain this item
              if (category.id === item.categoryId) {
                return {
                  ...category,
                  items: category.items.map((i: any) => 
                    i.id === item.id ? { ...i, packed: newPackedState } : i
                  ),
                  packedItems: newPackedState
                    ? category.packedItems + 1 
                    : Math.max(0, category.packedItems - 1)
                };
              }
              return category;
            });
          }
        );
      }
      
      // 2. Update BAG view if data exists
      if (previousBagData) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/bags`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((bag: any) => {
              // Only update bags that contain this item
              if (bag.id === item.bagId) {
                return {
                  ...bag,
                  items: bag.items?.map((i: any) => 
                    i.id === item.id ? { ...i, packed: newPackedState } : i
                  ) || [],
                  packedItems: newPackedState && bag.packedItems !== undefined
                    ? bag.packedItems + 1 
                    : bag.packedItems !== undefined ? Math.max(0, bag.packedItems - 1) : 0
                };
              }
              return bag;
            });
          }
        );
      }
      
      // 3. Update TRAVELER view if data exists
      if (previousTravelerData) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/travelers`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((traveler: any) => {
              // Only update travelers that are assigned this item
              if (traveler.id === item.travelerId) {
                return {
                  ...traveler,
                  items: traveler.items?.map((i: any) => 
                    i.id === item.id ? { ...i, packed: newPackedState } : i
                  ) || [],
                  packedItems: newPackedState && traveler.packedItems !== undefined
                    ? traveler.packedItems + 1 
                    : traveler.packedItems !== undefined ? Math.max(0, traveler.packedItems - 1) : 0
                };
              }
              return traveler;
            });
          }
        );
      }
      
      // 4. Update unassigned CATEGORY items
      if (previousUnassignedCategoryData && item.categoryId === null) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/unassigned/category`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((i: any) => 
              i.id === item.id ? { ...i, packed: newPackedState } : i
            );
          }
        );
      }
      
      // 5. Update unassigned BAG items
      if (previousUnassignedBagData && item.bagId === null) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/unassigned/bag`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((i: any) => 
              i.id === item.id ? { ...i, packed: newPackedState } : i
            );
          }
        );
      }
      
      // 6. Update unassigned TRAVELER items
      if (previousUnassignedTravelerData && item.travelerId === null) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/unassigned/traveler`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((i: any) => 
              i.id === item.id ? { ...i, packed: newPackedState } : i
            );
          }
        );
      }
      
      // 7. Update all-items view
      if (previousAllItemsData) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/all-items`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((i: any) => 
              i.id === item.id ? { ...i, packed: newPackedState } : i
            );
          }
        );
      }
      
      // Also update the /items endpoint data if available
      if (previousItemsData) {
        queryClient.setQueryData(
          [`/api/packing-lists/${packingListId}/items`],
          (oldData: any) => {
            if (!oldData) return oldData;
            
            return oldData.map((i: any) => 
              i.id === item.id ? { ...i, packed: newPackedState } : i
            );
          }
        );
      }
      
      // Return context with all previous data for potential rollback
      return { 
        previousState: isItemPacked,
        previousCategoryData,
        previousBagData,
        previousTravelerData,
        previousUnassignedCategoryData,
        previousUnassignedBagData,
        previousUnassignedTravelerData,
        previousAllItemsData,
        previousItemsData
      };
    },
    onSuccess: (newItem) => {
      // We already updated the cache optimistically, and we don't want
      // to sort or reorder items, so we don't need to do anything here
    },
    onError: (_, __, context: any) => {
      // Reset to the previous state if there was an error
      if (context) {
        // Reset the UI state
        setOptimisticPacked(context.previousState);
        
        // Restore all previous data
        if (context.previousCategoryData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/categories`],
            context.previousCategoryData
          );
        }
        
        if (context.previousBagData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/bags`],
            context.previousBagData
          );
        }
        
        if (context.previousTravelerData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/travelers`],
            context.previousTravelerData
          );
        }
        
        if (context.previousUnassignedCategoryData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/unassigned/category`],
            context.previousUnassignedCategoryData
          );
        }
        
        if (context.previousUnassignedBagData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/unassigned/bag`],
            context.previousUnassignedBagData
          );
        }
        
        if (context.previousUnassignedTravelerData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/unassigned/traveler`],
            context.previousUnassignedTravelerData
          );
        }
        
        if (context.previousAllItemsData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/all-items`],
            context.previousAllItemsData
          );
        }
        
        if (context.previousItemsData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/items`],
            context.previousItemsData
          );
        }
      }
    },
    onSettled: () => {
      // We want to keep our manual updates and NOT fetch from the server
      // which would reorder the items
      
      // Always invalidate ALL related queries to ensure consistency across views
      console.log(`[DEBUG] Item ${item.id} packed state updated, invalidating all related queries`);
      
      // CRITICAL: Invalidate the main items list that's used by UnassignedItemsSection
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });
      
      // Summary data
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      // Always invalidate all view types, regardless of current item's associations
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      // Invalidate unassigned queries for all view types
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
      
      // Also invalidate the all-items query
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/all-items`] });
    }
  });
  
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      incrementPending();
      try {
        await apiRequest('DELETE', `/api/items/${item.id}`);
      } finally {
        decrementPending();
      }
    },
    onSuccess: () => {
      // Close dialog
      setShowDeleteDialog(false);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });

      // If item is assigned to a bag, invalidate bags query
      if (item.bagId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      }
      
      // If item is assigned to a traveler, invalidate travelers query
      if (item.travelerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      }
    }
  });

  const bagName = getBagName();
  const travelerName = getTravelerName();
  const categoryName = getCategoryName();

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  // Add a handler for edit that includes logging and prevents propagation
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from bubbling up
    e.preventDefault(); // Prevent default behavior
    console.log('Edit button clicked for item:', item.id);
    
    if (onEditItem) {
      onEditItem(item.id);
    }
  };

  return (
    <div>
      <div 
        className="group p-2 hover:bg-gray-50 rounded-md" 
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Checkbox 
              checked={isItemPacked}
              onCheckedChange={() => togglePackedMutation.mutate()}
              className="w-4 h-4"
            />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${isItemPacked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {item.name}{item.quantity > 1 ? ` (${item.quantity})` : ''}
            </p>
            <div className="flex items-center text-xs text-gray-500 mt-0.5">
              {/* Conditionally show badges based on current view context */}
              {viewContext === 'category' && (
                // In category view, show bag and traveler
                <>
                  {bagName && (
                    <Badge variant="outline" className={`px-2 py-0.5 rounded ${item.bagId ? 'bg-blue-100 text-primary border-blue-200' : 'bg-gray-100 text-gray-700'}`}>
                      {bagName}
                    </Badge>
                  )}
                  {bagName && travelerName && <span className="mx-1">•</span>}
                  {travelerName && (
                    <Badge variant="outline" className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border-emerald-200">
                      {travelerName}
                    </Badge>
                  )}
                </>
              )}
              {viewContext === 'bag' && (
                // In bag view, show category and traveler
                <>
                  {categoryName && (
                    <Badge variant="outline" className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 border-purple-200">
                      {categoryName}
                    </Badge>
                  )}
                  {categoryName && travelerName && <span className="mx-1">•</span>}
                  {travelerName && (
                    <Badge variant="outline" className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 border-emerald-200">
                      {travelerName}
                    </Badge>
                  )}
                </>
              )}
              {viewContext === 'traveler' && (
                // In traveler view, show category and bag
                <>
                  {categoryName && (
                    <Badge variant="outline" className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 border-purple-200">
                      {categoryName}
                    </Badge>
                  )}
                  {categoryName && bagName && <span className="mx-1">•</span>}
                  {bagName && (
                    <Badge variant="outline" className={`px-2 py-0.5 rounded ${item.bagId ? 'bg-blue-100 text-primary border-blue-200' : 'bg-gray-100 text-gray-700'}`}>
                      {bagName}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Always show buttons on mobile, show on hover for desktop */}
          <div className={`flex items-center space-x-1 ${hovering ? 'opacity-100' : 'opacity-100 md:opacity-0 group-hover:opacity-100'}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-gray-500 hover:bg-gray-200"
              onClick={handleEditClick}
              type="button"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-gray-500 hover:bg-gray-200 hover:text-red-500"
              onClick={handleDeleteClick}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* No local Edit Item Modal - using the one from parent component */}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the item from your packing list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteItemMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
