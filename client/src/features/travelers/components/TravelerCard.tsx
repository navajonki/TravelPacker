import { useState } from 'react';
import { Edit, Trash2, Plus, MoreHorizontal, CheckSquare, Square, ListChecks } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

// Import types, API client, and services
import { TravelerWithItems, BaseCardProps } from '@shared/types';
import { ItemApi } from '@/api/apiClient';
import { invalidateTravelers, invalidateCategories, invalidateBags } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';
import ItemRow from "@/components/ItemRow"; // Will be migrated to features/items/components later

// Create a traveler-specific logger
const logger = createLogger('travelers');

interface TravelerCardProps extends BaseCardProps {
  traveler: TravelerWithItems;
  onEditTraveler: (travelerId: number) => void;
  onDeleteTraveler: (travelerId: number) => void;
  onAddItem: (travelerId: number) => void;
}

export default function TravelerCard({ 
  traveler, 
  packingListId,
  onEditTraveler, 
  onDeleteTraveler, 
  onAddItem,
  onEditItem
}: TravelerCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const percentComplete = traveler.totalItems > 0 
    ? Math.round((traveler.packedItems / traveler.totalItems) * 100) 
    : 0;
    
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDeleteTraveler(traveler.id);
    setShowDeleteDialog(false);
  };
  
  const bulkActionMutation = useMutation({
    mutationFn: async (action: "pack" | "unpack" | "packRemaining") => {
      logger.debug('Performing bulk action on traveler items', { 
        travelerId: traveler.id, 
        action, 
        itemCount: traveler.items.length 
      });
      
      if (action === "packRemaining") {
        // Handle pack remaining items action
        const remainingItems = traveler.items
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
        
        return await fetch(`/api/travelers/${traveler.id}/bulk-update-items`, {
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
        successMessage = `All items for ${traveler.name} marked as packed`;
      } else if (action === "unpack") {
        successMessage = `All items for ${traveler.name} marked as unpacked`;
      } else if (action === "packRemaining") {
        successMessage = `Remaining items for ${traveler.name} marked as packed`;
      }
      
      logger.info('Bulk action completed successfully', { 
        travelerId: traveler.id, 
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
        travelerId: traveler.id, 
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
      <div 
        className="bg-white rounded-lg shadow overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">{traveler.name}</h2>
            
            <div className={`flex space-x-1 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-500 hover:text-primary"
                onClick={() => onEditTraveler(traveler.id)}
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
                  <DropdownMenuItem onClick={() => onEditTraveler(traveler.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    <span>Edit Traveler</span>
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
                    <span>Delete Traveler</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="mt-2 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {traveler.packedItems} of {traveler.totalItems} items packed
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
          {traveler.items?.map((item) => (
            <ItemRow 
              key={item.id} 
              item={item}
              packingListId={packingListId}
              onEditItem={onEditItem}
              viewContext="traveler"
            />
          ))}
          
          <div 
            className="p-2 flex items-center justify-center hover:bg-gray-50 cursor-pointer"
            onClick={() => onAddItem(traveler.id)}
          >
            <Plus className="h-4 w-4 mr-1 text-primary" />
            <span className="text-sm text-primary font-medium">Add Item</span>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the "{traveler.name}" traveler and all their assigned items.
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