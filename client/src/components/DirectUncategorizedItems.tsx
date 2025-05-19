import { useQuery } from "@tanstack/react-query";
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
  // Get items directly, bypassing the category structure
  const { data: items, isLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/directly-uncategorized`],
    queryFn: async () => {
      console.log("Fetching direct uncategorized items");
      const response = await fetch(`/api/packing-lists/${packingListId}/categories`);
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const categories = await response.json();
      
      // Also fetch all items for this packing list
      const allItemsResponse = await fetch(`/api/packing-lists/${packingListId}`);
      if (!allItemsResponse.ok) {
        throw new Error('Failed to fetch packing list');
      }
      
      const packingList = await allItemsResponse.json();
      const allItemIds = new Set();
      
      // Collect all item IDs in categories
      categories.forEach((category: any) => {
        if (category.items && Array.isArray(category.items)) {
          category.items.forEach((item: any) => {
            allItemIds.add(item.id);
          });
        }
      });
      
      // Find items not in any category
      const uncategorizedItems = packingList.items?.filter((item: any) => 
        item.categoryId === null
      ) || [];
      
      console.log(`Found ${uncategorizedItems.length} uncategorized items`);
      
      return uncategorizedItems;
    },
    enabled: !!packingListId
  });

  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  
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