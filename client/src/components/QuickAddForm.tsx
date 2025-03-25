import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [selectedBagId, setSelectedBagId] = useState<string | undefined>(undefined);
  const [selectedTravelerId, setSelectedTravelerId] = useState<string | undefined>(undefined);
  
  // Define interfaces for type safety
  interface CategoryData {
    id: number;
    name: string;
    packingListId: number;
    position: number;
    createdAt: string;
    items?: any[];
    totalItems?: number;
    packedItems?: number;
  }
  
  interface BagData {
    id: number;
    name: string;
    packingListId: number;
    createdAt: string;
    items?: any[];
    totalItems?: number;
    packedItems?: number;
  }
  
  interface TravelerData {
    id: number;
    name: string;
    packingListId: number;
    createdAt: string;
    items?: any[];
    totalItems?: number;
    packedItems?: number;
  }
  
  const { data: bags, isLoading: isLoadingBags } = useQuery<BagData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<CategoryData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
  });

  const { data: travelers, isLoading: isLoadingTravelers } = useQuery<TravelerData[]>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Return if no item name or no categories available
    if (!itemName.trim()) return;
    if (!categories || !Array.isArray(categories) || categories.length === 0) return;
    
    // Use the selected category or default to the first one
    const categoryId = selectedCategoryId 
      ? parseInt(selectedCategoryId) 
      : categories[0]?.id;
    
    if (!categoryId) return;
    
    await onAddItem({
      name: itemName.trim(),
      categoryId,
      bagId: selectedBagId && selectedBagId !== "none" ? parseInt(selectedBagId) : undefined,
      travelerId: selectedTravelerId && selectedTravelerId !== "none" ? parseInt(selectedTravelerId) : undefined,
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
      
      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
        <div className="flex items-center space-x-2">
          <Label htmlFor="category-select" className="text-gray-500 whitespace-nowrap">
            Category:
          </Label>
          {isLoadingCategories ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger id="category-select" className="w-[160px] h-9">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(categories) && categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="bag-select" className="text-gray-500 whitespace-nowrap">
            Bag:
          </Label>
          {isLoadingBags ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <Select value={selectedBagId} onValueChange={setSelectedBagId}>
              <SelectTrigger id="bag-select" className="w-[160px] h-9">
                <SelectValue placeholder="Select bag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Array.isArray(bags) && bags.map((bag) => (
                  <SelectItem key={bag.id} value={bag.id.toString()}>
                    {bag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Label htmlFor="traveler-select" className="text-gray-500 whitespace-nowrap">
            Traveler:
          </Label>
          {isLoadingTravelers ? (
            <Skeleton className="h-9 w-32" />
          ) : (
            <Select value={selectedTravelerId} onValueChange={setSelectedTravelerId}>
              <SelectTrigger id="traveler-select" className="w-[160px] h-9">
                <SelectValue placeholder="Select traveler" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Array.isArray(travelers) && travelers.map((traveler) => (
                  <SelectItem key={traveler.id} value={traveler.id.toString()}>
                    {traveler.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
    </div>
  );
}
