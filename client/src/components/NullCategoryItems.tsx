import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ItemRow from "./ItemRow";

interface NullCategoryItemsProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
}

export default function NullCategoryItems({ packingListId, onEditItem }: NullCategoryItemsProps) {
  // Get all items for this packing list
  const { data: packingList, isLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId
  });

  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  if (!packingList || !packingList.items) {
    return null;
  }
  
  // Filter for uncategorized items
  const uncategorizedItems = packingList.items.filter(
    (item) => item.categoryId === null
  );
  
  // Always render the container, even if empty
  const itemCount = uncategorizedItems.length;
  
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">Uncategorized Items ({itemCount})</h3>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ul className="divide-y divide-gray-100">
          {uncategorizedItems.map((item) => (
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