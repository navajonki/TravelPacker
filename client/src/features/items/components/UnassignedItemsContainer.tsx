/**
 * A unified component for displaying unassigned items
 * This replaces UncategorizedItems, UncategorizedItemsDisplay,
 * UnassignedItemsCard, and UnassignedItemsSection
 */
import { useState } from "react";
import { Plus, MoreHorizontal, CheckSquare, Square, ListChecks, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import ItemRow from "@/components/ItemRow"; // Will be moved to features/items folder later
import SelectableItemRow from "@/components/SelectableItemRow";
import { Item } from "@shared/schema";
import { ViewContext } from "@shared/types";
import { useUnassignedItems } from "../hooks/useUnassignedItems";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ItemApi } from "@/api/apiClient";

interface UnassignedItemsContainerProps {
  packingListId: number;
  viewContext: ViewContext;
  onEditItem?: (itemId: number) => void;
  onAddItem?: () => void;
  isMultiEditMode?: boolean;
  selectedItemIds?: number[];
  onSelectChange?: (itemId: number, isSelected: boolean) => void;
}

export default function UnassignedItemsContainer({
  packingListId,
  viewContext,
  onEditItem,
  onAddItem,
  isMultiEditMode = false,
  selectedItemIds = [],
  onSelectChange
}: UnassignedItemsContainerProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use our custom hook for unassigned items
  const { 
    data: unassignedItemsData, 
    isLoading, 
    forceRefresh 
  } = useUnassignedItems(packingListId, viewContext);
  
  // Ensure we have a proper array with type safety
  const unassignedItems: Item[] = unassignedItemsData || [];
  
  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const field = viewContext === 'category' 
        ? { categoryId: null } 
        : viewContext === 'bag' 
          ? { bagId: null } 
          : { travelerId: null };
      
      // Ensure packingListId is included
      return ItemApi.create({
        name: newItemName,
        packingListId,
        ...field
      });
    },
    onSuccess: () => {
      // Clear the input
      setNewItemName("");
      setShowAddItem(false);
      
      // Show success message
      toast({
        title: "Success",
        description: "Item added successfully",
      });
      
      // Refresh data
      forceRefresh();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  });
  
  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (action: "pack" | "unpack" | "packRemaining") => {
      let itemIds: number[] = [];
      
      if (action === "packRemaining") {
        // Handle only unpacked items
        itemIds = unassignedItems
          .filter(item => !item.packed)
          .map(item => item.id);
          
        if (itemIds.length === 0) {
          throw new Error("No remaining items to pack");
        }
      } else {
        // Handle all items
        itemIds = unassignedItems.map(item => item.id);
      }
      
      return ItemApi.bulkUpdate(
        itemIds, 
        { packed: action === "pack" || action === "packRemaining" }
      );
    },
    onSuccess: (_, action) => {
      // Show success message
      let successMessage = "";
      if (action === "pack") {
        successMessage = `All unassigned items marked as packed`;
      } else if (action === "unpack") {
        successMessage = `All unassigned items marked as unpacked`;
      } else if (action === "packRemaining") {
        successMessage = `Remaining unassigned items marked as packed`;
      }
      
      toast({
        title: "Success",
        description: successMessage,
      });
      
      // Refresh data
      forceRefresh();
    },
    onError: (error: any, action) => {
      let errorMessage = "Failed to update items";
      
      if (action === "packRemaining" && error.message === "No remaining items to pack") {
        errorMessage = "No unpacked items remaining";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  const handleAddItemKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newItemName.trim()) {
      e.preventDefault();
      await addItemMutation.mutate();
    } else if (e.key === 'Escape') {
      setShowAddItem(false);
      setNewItemName("");
    }
  };
  
  const handleBulkAction = (action: "pack" | "unpack" | "packRemaining") => {
    bulkActionMutation.mutate(action);
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      await forceRefresh();
      
      toast({
        title: "Data Refreshed",
        description: `Refreshed unassigned items`,
        duration: 1500,
      });
    } catch (error) {
      console.error("Error refreshing unassigned items:", error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh the data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Return early if loading
  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  // Get UI text based on the current view context
  let containerTitle = "Uncategorized Items";
  let helperText = "Items will appear here when they have no category";
  
  if (viewContext === "bag") {
    containerTitle = "Unassigned to Bags";
    helperText = "Items will appear here when they are not assigned to any bag";
  } else if (viewContext === "traveler") {
    containerTitle = "Unassigned to Travelers";
    helperText = "Items will appear here when they are not assigned to any traveler";
  }
  
  // Calculate statistics
  const totalItems = unassignedItems.length;
  const packedItems = unassignedItems.filter(item => item.packed).length;
  
  // If there are no items, consider showing an empty state instead of nothing
  if (totalItems === 0) {
    return (
      <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
        <CardHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="font-medium">{containerTitle} (0)</h3>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            {helperText}
          </div>
        </CardContent>
        
        <CardFooter className="p-2">
          <Button
            variant="ghost"
            className="w-full flex items-center justify-center p-2 text-sm text-gray-500 hover:bg-gray-50 rounded-md bg-red-200"
            onClick={() => {
              console.log('🔴 EMPTY STATE Add item button clicked, showAddItem before:', showAddItem);
              setShowAddItem(true);
              console.log('🔴 EMPTY STATE Add item button clicked, showAddItem after should be true');
              alert('DEBUG: Empty state button clicked! showAddItem is now: ' + true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span>🔴 Add an item (EMPTY STATE DEBUG)</span>
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Debug current state
  console.log('UnassignedItemsContainer render state:', {
    showAddItem,
    newItemName,
    unassignedItemsCount: unassignedItems.length,
    isLoading
  });

  // Test: Add a simple visual indicator when showAddItem is true
  if (showAddItem) {
    console.log('🟡 SHOULD SHOW ADD ITEM INPUT - showAddItem is true');
  }

  // Otherwise show the full card with items
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">{containerTitle} ({totalItems})</h3>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-500">{packedItems}/{totalItems}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleBulkAction("pack")}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  <span>Pack All Items</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("unpack")}>
                  <Square className="h-4 w-4 mr-2" />
                  <span>Unpack All Items</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("packRemaining")}>
                  <ListChecks className="h-4 w-4 mr-2" />
                  <span>Pack Remaining Items</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {unassignedItems.map(item => (
            isMultiEditMode ? (
              <SelectableItemRow
                key={item.id}
                item={item}
                packingListId={packingListId}
                isMultiEditMode={true}
                isSelected={selectedItemIds.includes(item.id)}
                onSelectChange={onSelectChange || (() => {})}
                onEditItem={onEditItem || (() => {})}
              />
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                packingListId={packingListId}
                onEditItem={onEditItem}
                viewContext={viewContext}
              />
            )
          ))}
          
          {/* DEBUG: Force show input regardless of state */}
          <li className="p-2 bg-red-100">
            <div className="text-sm text-red-800">
              DEBUG: showAddItem = {String(showAddItem)}
              {showAddItem ? " (INPUT SHOULD BE VISIBLE)" : " (INPUT SHOULD BE HIDDEN)"}
            </div>
          </li>
          
          {/* Add item input - let's force it to always show for debugging */}
          <li className="p-2 bg-green-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" disabled />
              </div>
              <div className="ml-3 flex-1">
                <Input
                  type="text"
                  autoFocus
                  className="h-8 text-sm border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Item name (ALWAYS VISIBLE FOR DEBUG)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleAddItemKeyDown}
                />
              </div>
            </div>
          </li>
        </ul>
      </CardContent>
      
      <CardFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-center p-2 text-sm text-gray-500 hover:bg-gray-50 rounded-md bg-blue-200"
          onClick={() => {
            console.log('🔵 FOOTER Add item button clicked, showAddItem before:', showAddItem);
            setShowAddItem(true);
            console.log('🔵 FOOTER Add item button clicked, showAddItem after should be true');
            alert('DEBUG: Footer button clicked! showAddItem is now: ' + true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>🔵 Add an item (FOOTER DEBUG)</span>
        </Button>
      </CardFooter>
    </Card>
  );
}