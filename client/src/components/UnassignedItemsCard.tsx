import { useState } from "react";
import { Plus, MoreHorizontal, CheckSquare, Square, ListChecks } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ItemRow from "./ItemRow";
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

interface UnassignedItemsCardProps {
  items: any[];
  packingListId: number;
  title: string;
  field: 'categoryId' | 'bagId' | 'travelerId';
  onAddItem?: () => void;
  onEditItem?: (itemId: number) => void;
  viewContext?: 'category' | 'bag' | 'traveler';
}

export default function UnassignedItemsCard({ 
  items, 
  packingListId, 
  title,
  field,
  onAddItem,
  onEditItem,
  viewContext = 'category'
}: UnassignedItemsCardProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const addItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/items', {
        name: newItemName,
        packingListId: packingListId, // Add the missing packingListId
        quantity: 1,
        packed: false,
        // For unassigned items in category view, we need to set a category
        // For unassigned items in other views, we set the specified field to null
        ...(field === 'categoryId' 
          ? { categoryId: items[0]?.categoryId } 
          : {})
      });
    },
    onSuccess: () => {
      // Invalidate all queries to ensure updated data
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      setNewItemName("");
      setShowAddItem(false);
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
  
  const totalItems = items.length;
  const packedItems = items.filter(item => item.packed).length;
  
  const bulkActionMutation = useMutation({
    mutationFn: async (action: string) => {
      let data = {};
      
      if (action === "pack") {
        data = { packed: true };
      } else if (action === "unpack") {
        data = { packed: false };
      } else if (action === "packRemaining") {
        // This handles the remaining unpacked items
        const remainingItems = items
          .filter(item => !item.packed)
          .map(item => item.id);
          
        if (remainingItems.length === 0) {
          throw new Error("No remaining items to pack");
        }
        
        return await apiRequest('POST', '/api/items/multi-edit', { 
          itemIds: remainingItems, 
          updates: { packed: true } 
        });
      }
      
      // Use multi-edit for all items
      return await apiRequest('POST', '/api/items/multi-edit', { 
        itemIds: items.map(item => item.id), 
        updates: data 
      });
    },
    onSuccess: (_, action) => {
      // Invalidate all queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      
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
  
  const handleBulkAction = (action: "pack" | "unpack" | "packRemaining") => {
    bulkActionMutation.mutate(action);
  };

  if (items.length === 0) {
    return null; // Don't display the unassigned card if there are no items
  }

  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">{title}</h3>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-500">{packedItems}/{totalItems}</span>
            {onAddItem && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddItem}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Bulk action options */}
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
        <ul className="p-2 divide-y divide-gray-100">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              packingListId={packingListId}
              onEditItem={onEditItem}
              viewContext={viewContext}
            />
          ))}
          
          {/* Add item input */}
          {showAddItem && (
            <li className="p-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" disabled />
                </div>
                <div className="ml-3 flex-1">
                  <Input
                    type="text"
                    autoFocus
                    className="h-8 text-sm border-0 p-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Item name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={handleAddItemKeyDown}
                  />
                </div>
              </div>
            </li>
          )}
        </ul>
      </CardContent>
      
      <CardFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-center p-2 text-sm text-gray-500 hover:bg-gray-50 rounded-md"
          onClick={() => setShowAddItem(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Add an item</span>
        </Button>
      </CardFooter>
    </Card>
  );
}