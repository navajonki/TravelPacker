import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ItemRow from "./ItemRow";
import { Button } from "./ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Use the specialized endpoint for unassigned items
  const { 
    data, 
    isLoading,
    refetch
  } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/unassigned/${viewContext}`],
    enabled: !!packingListId,
    staleTime: 0, // Always refetch to ensure fresh data
    refetchInterval: 1500, // Automatically refresh every 1.5 seconds
  });
  
  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  // Ensure we have an array of items
  const uncategorizedItems = Array.isArray(data) ? data : [];
  
  // Get UI text based on the current view context
  let containerTitle = "Uncategorized Items";
  let helperText = "Items will appear here when they have no category";
  
  if (viewContext === "bag") {
    containerTitle = "Unassigned to Bags";
    helperText = "Items will appear here when they are not assigned to any bag";
  } else if (viewContext === "traveler") {
    containerTitle = "Unassigned to Travelers";
    helperText = "Items will appear here when they are not assigned to any traveler";
  }

  // Handler to force refresh the data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/${viewContext}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
      
      // Execute the refetch
      await refetch();
      
      toast({
        title: "Data Refreshed",
        description: `Refreshed ${containerTitle.toLowerCase()}`,
        duration: 1500,
      });
    } catch (error) {
      console.error("Error refreshing uncategorized items:", error);
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Could not refresh the data. Please try again.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow border-dashed border-2 border-gray-300 mb-4">
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">{containerTitle} ({uncategorizedItems.length})</h3>
          </div>
          <Button 
            variant="ghost"
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {uncategorizedItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {helperText}
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