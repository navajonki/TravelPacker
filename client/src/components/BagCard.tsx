import { useState } from 'react';
import { Edit, Trash2, Plus, MoreHorizontal, CheckSquare, Square, ListChecks, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import ItemRow from './ItemRow';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
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

interface BagCardProps {
  bag: {
    id: number;
    name: string;
    items: any[];
    totalItems: number;
    packedItems: number;
    packingListId: number;
  };
  onEditBag: (bagId: number) => void;
  onDeleteBag: (bagId: number) => void;
  onAddItem: (bagId: number) => void;
  onEditItem?: (itemId: number) => void;
}

export default function BagCard({ 
  bag, 
  onEditBag, 
  onDeleteBag, 
  onAddItem,
  onEditItem
}: BagCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const percentComplete = bag.totalItems > 0 
    ? Math.round((bag.packedItems / bag.totalItems) * 100) 
    : 0;
    
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDeleteBag(bag.id);
    setShowDeleteDialog(false);
  };

  const addItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/items', {
        name: newItemName,
        bagId: bag.id,
        packingListId: bag.packingListId,
        quantity: 1,
        packed: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/travelers`] });
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
  
  const bulkActionMutation = useMutation({
    mutationFn: async (action: string) => {
      let data = {};
      
      if (action === "pack") {
        data = { packed: true };
      } else if (action === "unpack") {
        data = { packed: false };
      } else if (action === "packRemaining") {
        // This is handled differently - we only want to affect unpacked items
        const remainingItems = bag.items
          .filter(item => !item.packed)
          .map(item => item.id);
          
        if (remainingItems.length === 0) {
          throw new Error("No remaining items to pack");
        }
        
        return await apiRequest('PATCH', '/api/items/bulk-update', { 
          ids: remainingItems, 
          data: { packed: true } 
        });
      }
      
      return await apiRequest('PATCH', `/api/bags/${bag.id}/bulk-update-items`, data);
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}/travelers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${bag.packingListId}`] });
      
      let successMessage = "";
      if (action === "pack") {
        successMessage = `All items in ${bag.name} marked as packed`;
      } else if (action === "unpack") {
        successMessage = `All items in ${bag.name} marked as unpacked`;
      } else if (action === "packRemaining") {
        successMessage = `Remaining items in ${bag.name} marked as packed`;
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

  return (
    <div>
      <div 
        className="bg-white rounded-lg shadow overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">{bag.name}</h2>
            
            <div className={`flex space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-primary"
                onClick={() => onEditBag(bag.id)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditBag(bag.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    <span>Edit Bag</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-red-600 focus:text-red-600"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    <span>Delete Bag</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {bag.packedItems} of {bag.totalItems} items packed
            </div>
            <div className="text-sm font-medium text-primary">
              {percentComplete}%
            </div>
          </div>
          
          <Progress 
            value={percentComplete} 
            className="h-1.5 mt-1" 
          />
        </div>
        
        <div className="divide-y divide-gray-100">
          {bag.items?.map((item: any) => (
            <ItemRow 
              key={item.id} 
              item={item}
              packingListId={bag.packingListId}
              onEditItem={onEditItem}
              viewContext="bag"
            />
          ))}
          
          {showAddItem && (
            <div className="p-2">
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
                <div className="flex-shrink-0 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => newItemName.trim() && addItemMutation.mutate()}
                    disabled={!newItemName.trim() || addItemMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        
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
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the "{bag.name}" bag and all its assigned items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
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