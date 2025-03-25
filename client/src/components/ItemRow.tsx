import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export default function ItemRow({ item, packingListId }: ItemRowProps) {
  const [hovering, setHovering] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  
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
  
  const togglePackedMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('PATCH', `/api/items/${item.id}`, {
        packed: !item.packed
      });
    },
    onSuccess: () => {
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
  
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/items/${item.id}`);
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
              checked={item.packed}
              onCheckedChange={() => togglePackedMutation.mutate()}
              className="w-4 h-4"
            />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${item.packed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
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
              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:bg-gray-200">
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
