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
}

export default function ItemRow({ item, packingListId, onEditItem }: ItemRowProps) {
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
      // Cancel any outgoing refetches 
      await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      
      // Store the current data for potential rollback
      const previousData = queryClient.getQueryData([`/api/packing-lists/${packingListId}/categories`]);
      
      // Set optimistic state
      setOptimisticPacked(!isItemPacked);
      
      // Update the query data with our optimistic result
      queryClient.setQueryData(
        [`/api/packing-lists/${packingListId}/categories`],
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((category: any) => {
            if (category.id === item.categoryId) {
              return {
                ...category,
                items: category.items.map((i: any) => 
                  i.id === item.id ? { ...i, packed: !isItemPacked } : i
                ),
                packedItems: !isItemPacked 
                  ? category.packedItems + 1 
                  : Math.max(0, category.packedItems - 1)
              };
            }
            return category;
          });
        }
      );
      
      // Return context with the previous state and data
      return { 
        previousState: isItemPacked,
        previousData
      };
    },
    onSuccess: (newItem) => {
      // We already updated the cache optimistically, and we don't want
      // to sort or reorder items, so we don't need to do anything here
    },
    onError: (_, __, context: any) => {
      // Reset to the previous state if there was an error
      if (context) {
        setOptimisticPacked(context.previousState);
        
        // Restore the previous data
        if (context.previousData) {
          queryClient.setQueryData(
            [`/api/packing-lists/${packingListId}/categories`],
            context.previousData
          );
        }
      }
    },
    onSettled: () => {
      // We want to keep our manual updates and NOT fetch from the server
      // which would reorder the items
      
      // Only invalidate the summary data
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
      if (item.bagId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      }
      
      if (item.travelerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      }
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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
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
            {(bagName || travelerName) && (
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
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
              </div>
            )}
          </div>
          {hovering && (
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-500 hover:bg-gray-200"
                onClick={() => onEditItem && onEditItem(item.id)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-gray-500 hover:bg-gray-200 hover:text-red-500"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
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
