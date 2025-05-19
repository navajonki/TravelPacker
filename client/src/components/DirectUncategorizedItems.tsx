import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import ItemRow from "./ItemRow";

interface DirectUncategorizedItemsProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
}

export default function DirectUncategorizedItems({ 
  packingListId,
  onEditItem 
}: DirectUncategorizedItemsProps) {
  // Get packing list data including all items
  const { data: packingList, isLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId
  });

  // Get all uncategorized items 
  const uncategorizedItems = useMemo(() => {
    // Safely handle null or undefined packingList
    if (!packingList) return [];
    
    // Access items array safely with optional chaining
    const items = packingList.items || [];
    
    // Add extra logging to debug the data structure
    console.log("PackingList items total count:", items.length);
    
    // Filter for items with null categoryId
    const result = items.filter((item: any) => item.categoryId === null);
    console.log("Found uncategorized items:", result.length);
    
    return result;
  }, [packingList]);
  
  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  if (!uncategorizedItems || uncategorizedItems.length === 0) {
    return null;
  }
  
  console.log(`Rendering ${uncategorizedItems.length} uncategorized items`);
  
  // Show a simple card with the uncategorized items
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">Uncategorized Items ({uncategorizedItems.length})</h3>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {uncategorizedItems.map((item: any) => (
            <ItemRow
              key={item.id}
              item={item}
              packingListId={packingListId}
              onEditItem={onEditItem}
              viewContext="category"
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}