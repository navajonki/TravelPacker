import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [isHovered, setIsHovered] = useState(false);
  const queryClient = useQueryClient();
  
  const togglePackedMutation = useMutation({
    mutationFn: async (packed: boolean) => {
      return await apiRequest('PATCH', `/api/items/${item.id}`, { packed });
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
    }
  });
  
  const handleTogglePacked = () => {
    togglePackedMutation.mutate(!item.packed);
  };
  
  return (
    <div 
      className="py-2 px-2 hover:bg-gray-50 flex items-center justify-between"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center flex-1 min-w-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 mr-2 rounded-full p-0"
          onClick={handleTogglePacked}
        >
          {item.packed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div className={`truncate text-sm ${item.packed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {item.name}
          </div>
          {item.quantity > 1 && (
            <div className="text-xs text-gray-500">
              Qty: {item.quantity}
            </div>
          )}
        </div>
      </div>
      
      {/* Selection checkbox for multi-edit mode */}
      {isMultiEditMode && (
        <Checkbox 
          checked={isSelected}
          onCheckedChange={(checked) => onSelectChange(item.id, checked === true)}
          className="ml-2 h-4 w-4"
        />
      )}
    </div>
  );
}