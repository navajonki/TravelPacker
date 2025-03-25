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
    bagId?: number;
    travelerId?: number;
    categoryId: number;
  };
  packingListId: number;
  isMultiEditMode: boolean;
  isSelected: boolean;
  onSelectChange: (itemId: number, isSelected: boolean) => void;
}

export default function SelectableItemRow({ 
  item, 
  packingListId,
  isMultiEditMode,
  isSelected,
  onSelectChange
}: SelectableItemRowProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for toggling the packed status
  const { mutate: togglePacked } = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/items/${item.id}`, "PATCH", {
        packed: !item.packed
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
    },
    onError: () => {
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