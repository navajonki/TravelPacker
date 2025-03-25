import { useState } from "react";
import { GripVertical, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenuTrigger 
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

interface CategoryCardProps {
  category: {
    id: number;
    name: string;
    items: any[];
    totalItems: number;
    packedItems: number;
    packingListId: number;
  };
  onEditCategory: (categoryId: number) => void;
  onDeleteCategory: (categoryId: number) => void;
  onAddItem: (categoryId: number) => void;
}

export default function CategoryCard({ 
  category, 
  onEditCategory,
  onDeleteCategory,
  onAddItem
}: CategoryCardProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const queryClient = useQueryClient();
  
  const addItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/items', {
        name: newItemName,
        categoryId: category.id,
        quantity: 1,
        packed: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${category.packingListId}/categories`] });
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
  
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };
  
  const handleConfirmDelete = () => {
    onDeleteCategory(category.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="bg-white rounded-lg shadow">
        <CardHeader className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="mr-2 text-gray-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
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
            {category.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                packingListId={category.packingListId}
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
