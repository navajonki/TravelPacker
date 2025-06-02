import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SelectableItemRowProps {
  item: {
    id: number;
    name: string;
    packed: boolean;
    quantity: number;
    bagId?: number | null;
    travelerId?: number | null;
    categoryId: number | null;
  };
  packingListId: number;
  isMultiEditMode: boolean;
  isSelected: boolean;
  onSelectChange: (itemId: number, isSelected: boolean) => void;
  onEditItem: (itemId: number) => void;
}

export default function SelectableItemRow({ 
  item, 
  packingListId,
  isMultiEditMode,
  isSelected,
  onSelectChange,
  onEditItem
}: SelectableItemRowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for toggling the packed status
  const { mutate: togglePacked } = useMutation({
    mutationFn: async () => {
      console.log(`[DEBUG] SelectableItemRow: Updating packed status for item ${item.id} to ${!item.packed}`);
      const response = await apiRequest(
        "PATCH", 
        `/api/items/${item.id}`, 
        { 
          packed: !item.packed,
          // Include packingListId to ensure proper item association
          packingListId: packingListId
        }
      );
      return response;
    },
    onSuccess: () => {
      // Invalidate ALL related queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('item-packed-status-changed', {
        detail: { itemId: item.id, newState: !item.packed }
      }));
    },
    onError: (error) => {
      console.error(`[ERROR] Failed to update packed status for item ${item.id}:`, error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        {isMultiEditMode ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => {
              onSelectChange(item.id, checked === true);
            }}
            className="border-blue-500"
          />
        ) : (
          <Checkbox
            checked={item.packed}
            onCheckedChange={() => togglePacked()}
          />
        )}
        <div className="flex flex-col">
          <span className={item.packed ? "line-through text-gray-500" : ""}>
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="text-xs text-gray-500">
              Quantity: {item.quantity}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}