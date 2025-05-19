import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ItemRow from "./ItemRow";

interface UncategorizedItemsDisplayProps {
  packingListId: number;
  onEditItem?: (itemId: number) => void;
}

export default function UncategorizedItemsDisplay({ 
  packingListId, 
  onEditItem 
}: UncategorizedItemsDisplayProps) {
  // Hard-coded test display for now - this will always appear
  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">Uncategorized Items (Empty)</h3>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="p-4 text-center text-gray-500">
          Items will appear here when they have no category
        </div>
      </CardContent>
    </Card>
  );
}