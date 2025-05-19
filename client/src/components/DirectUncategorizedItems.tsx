import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import ItemRow from "./ItemRow";

interface DirectUncategorizedItemsProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
}

export default function DirectUncategorizedItems({ 
  packingListId,
  onEditItem 
}: DirectUncategorizedItemsProps) {
  // Get all items for this packing list and identify those without a category
  const { data: allItemsData, isLoading: isLoadingPacking } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId
  });
  
  // Get all items, including the direct items for this packing list
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId
  });
  
  // Combined loading state
  const isLoading = isLoadingPacking || isLoadingCategories;
  
  // Find uncategorized items
  const items = useMemo(() => {
    // Safely access items array
    const packingListItems = allItemsData?.items || [];
    let allItems: any[] = Array.isArray(packingListItems) ? packingListItems : [];
    
    if (allItems.length === 0 && Array.isArray(categories)) {
      // Fallback: collect items from categories
      allItems = categories.flatMap((category: any) => category.items || []);
    }
    
    // Find items that have null categoryId
    const uncategorizedItems = allItems.filter((item: any) => 
      item.categoryId === null || item.categoryId === undefined
    );
    
    console.log(`Found ${uncategorizedItems.length} uncategorized items out of ${allItems.length} total items`);
    
    return uncategorizedItems;
  }, [allItemsData, categories]);

  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null; // Don't render anything if there are no items
  }
  
  console.log("About to render uncategorized items:", items);
  
  console.log(`Rendering ${items.length} uncategorized items`);
  
  // Show a simple card with the uncategorized items
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">Uncategorized Items</h3>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-500">{items.length} items</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {items.map((item: any) => (
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