import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ItemRow from "./ItemRow";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";

interface UncategorizedItemsDisplayProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
  viewContext?: "category" | "bag" | "traveler";
}

export default function UncategorizedItemsDisplay({ 
  packingListId, 
  onEditItem,
  viewContext = "category"
}: UncategorizedItemsDisplayProps) {
  const { 
    data: packingList, 
    isLoading,
    refetch
  } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId
  });
  
  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  // Find items with null categoryId
  const uncategorizedItems = packingList?.items?.filter(
    (item: any) => item.categoryId === null
  ) || [];
  
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">Uncategorized Items ({uncategorizedItems.length})</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {uncategorizedItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Items will appear here when they have no category
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {uncategorizedItems.map((item: any) => (
              <ItemRow
                key={item.id}
                item={item}
                packingListId={packingListId}
                onEditItem={onEditItem}
                viewContext={viewContext}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}