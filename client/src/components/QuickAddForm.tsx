import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickAddFormProps {
  packingListId: number;
  onAddItem: (item: {
    name: string;
    categoryId: number;
    bagId?: number;
    travelerId?: number;
  }) => Promise<void>;
  onOpenAdvancedAdd: () => void;
}

export default function QuickAddForm({ 
  packingListId, 
  onAddItem, 
  onOpenAdvancedAdd 
}: QuickAddFormProps) {
  const [itemName, setItemName] = useState("");
  const [selectedBagId, setSelectedBagId] = useState<number | null>(null);
  
  const { data: bags, isLoading: isLoadingBags } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemName.trim() || !categories || categories.length === 0) return;
    
    // Add to the first category by default
    const categoryId = categories[0].id;
    
    await onAddItem({
      name: itemName.trim(),
      categoryId,
      bagId: selectedBagId || undefined
    });
    
    setItemName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <form className="flex items-center space-x-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <Input 
            type="text" 
            placeholder="Add item (press Enter to add)..."
            className="pl-10 pr-4 py-2 w-full"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="absolute left-3 top-2.5 text-gray-400">+</span>
        </div>
        
        <div className="flex-shrink-0">
          <Button 
            type="button"
            variant="outline"
            size="icon"
            className="w-9 h-9"
            onClick={onOpenAdvancedAdd}
          >
            <Settings className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </form>
      
      <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
        <span className="text-gray-500">Quick add to:</span>
        <div className="inline-flex items-center space-x-2">
          {isLoadingBags ? (
            <Skeleton className="h-7 w-20 rounded-md" />
          ) : (
            bags?.map((bag: any) => (
              <Button
                key={bag.id}
                variant="outline"
                size="sm"
                className={`text-xs h-7 px-2 ${selectedBagId === bag.id ? 'bg-blue-100 text-primary border-blue-200' : ''}`}
                onClick={() => setSelectedBagId(bag.id === selectedBagId ? null : bag.id)}
              >
                {bag.name}
              </Button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
