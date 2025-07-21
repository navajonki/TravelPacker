import { useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, CheckSquare, Square, ListChecks, Check } from "lucide-react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Import types, API client, and services
import { CategoryWithItems, BaseCardProps } from '@shared/types';
import { ItemApi } from '@/api/apiClient';
import { invalidateCategories, invalidateBags, invalidateTravelers } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';
import ItemRow from "@/components/ItemRow"; // Will be migrated to features/items/components later

// Create a category-specific logger
const logger = createLogger('categories');

interface CategoryCardProps extends BaseCardProps {
  category: CategoryWithItems;
  onEditCategory: (categoryId: number) => void;
  onDeleteCategory: (categoryId: number) => void;
  onAddItem: (categoryId: number) => void;
}

export default function CategoryCard({ 
  category, 
  packingListId,
  onEditCategory,
  onDeleteCategory,
  onAddItem,
  onEditItem
}: CategoryCardProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const addItemMutation = useMutation({
    mutationFn: async () => {
      logger.debug('Adding new item to category', { categoryId: category.id, name: newItemName });
      return await ItemApi.create({
        name: newItemName,
        categoryId: category.id,
        packingListId,
        quantity: 1,
        packed: false
      });
    },
    onSuccess: () => {
      // Use centralized query invalidation service
      invalidateCategories(queryClient, packingListId);
      setNewItemName("");
      setShowAddItem(false);
      
      logger.info('Added new item to category', { categoryId: category.id });
      toast({
        title: "Item added",
        description: `${newItemName} has been added to ${category.name}`,
      });
    },
    onError: (error: any) => {
      logger.error('Failed to add item to category', error, { categoryId: category.id });
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
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
  
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };
  
  const handleConfirmDelete = () => {
    onDeleteCategory(category.id);
    setShowDeleteDialog(false);
  };
  
  const bulkActionMutation = useMutation({
    mutationFn: async (action: "pack" | "unpack" | "packRemaining") => {
      logger.debug('Performing bulk action on category items', { 
        categoryId: category.id, 
        action, 
        itemCount: category.items.length 
      });
      
      if (action === "packRemaining") {
        // Handle pack remaining items action
        const remainingItems = category.items
          .filter(item => !item.packed)
          .map(item => item.id);
          
        if (remainingItems.length === 0) {
          throw new Error("No remaining items to pack");
        }
        
        return await ItemApi.bulkUpdate(remainingItems, { 
          packed: true,
          packingListId // Include packingListId to ensure proper updates
        });
      } else {
        // Handle pack all or unpack all
        const updateData = { packed: action === "pack" };
        
        return await fetch(`/api/categories/${category.id}/bulk-update-items`, {
          method: 'PATCH',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
          credentials: "include",
        });
      }
    },
    onSuccess: (_, action) => {
      // Use centralized query invalidation service
      invalidateCategories(queryClient, packingListId);
      invalidateBags(queryClient, packingListId);
      invalidateTravelers(queryClient, packingListId);
      
      let successMessage = "";
      if (action === "pack") {
        successMessage = `All items in ${category.name} marked as packed`;
      } else if (action === "unpack") {
        successMessage = `All items in ${category.name} marked as unpacked`;
      } else if (action === "packRemaining") {
        successMessage = `Remaining items in ${category.name} marked as packed`;
      }
      
      logger.info('Bulk action completed successfully', { 
        categoryId: category.id, 
        action 
      });
      
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
      
      logger.error('Bulk action failed', error, { 
        categoryId: category.id, 
        action 
      });
      
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
    <>
      <Card className="bg-white rounded-lg shadow">
        <CardHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h3 className="font-medium">{category.name}</h3>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-sm text-gray-500">{category.packedItems}/{category.totalItems}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onAddItem(category.id)}>
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEditCategory(category.id)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    <span>Edit Category</span>
                  </DropdownMenuItem>
                  {/* Bulk action options */}
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
                    <span>Delete Category</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <ul className="p-2 divide-y divide-gray-100">
            {/* Key point: We don't sort the items by packed status, preserving original order */}
            {category.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                packingListId={packingListId}
                onEditItem={onEditItem}
                viewContext="category"
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the "{category.name}" category and all its items.
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
    </>
  );
}