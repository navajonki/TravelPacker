import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ItemRow from "./ItemRow";
import { Button } from "./ui/button";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track when this component refreshes
  useEffect(() => {
    console.log(`UncategorizedItemsDisplay (${viewContext}) rendered at ${new Date().toISOString()}`);
  }, [viewContext]);
  
  // Fetch all data for the packing list
  const { 
    data: packingList, 
    isLoading,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}`],
    enabled: !!packingListId,
    staleTime: 5000, // Reduce stale time to refresh more frequently
  });

  // Also fetch specific collections for more reliable item listing
  const { data: categoriesData } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId && viewContext === "category",
  });
  
  const { data: bagsData } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: !!packingListId && viewContext === "bag",
  });
  
  const { data: travelersData } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: !!packingListId && viewContext === "traveler",
  });
  
  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }
  
  // Get all items with null values for the appropriate field based on view context
  const uncategorizedItems = packingList?.items?.filter((item: any) => {
    if (viewContext === "category") {
      return item.categoryId === null;
    } else if (viewContext === "bag") {
      return item.bagId === null;
    } else if (viewContext === "traveler") {
      return item.travelerId === null;
    }
    return false;
  }) || [];
  
  // Check when data was last updated
  const dataAge = (new Date().getTime() - (dataUpdatedAt || 0)) / 1000;
  const isDataFresh = dataAge < 10; // Less than 10 seconds old
  
  // Get appropriate names for UI based on view context
  let containerTitle = "Uncategorized Items";
  if (viewContext === "bag") {
    containerTitle = "Unassigned to Bags";
  } else if (viewContext === "traveler") {
    containerTitle = "Unassigned to Travelers";
  }
  
  // Customize helper text based on view context
  let helperText = "Items will appear here when they have no category";
  if (viewContext === "bag") {
    helperText = "Items will appear here when they are not assigned to any bag";
  } else if (viewContext === "traveler") {
    helperText = "Items will appear here when they are not assigned to any traveler";
  }

  // Handler to force refresh all data
  const handleForceRefresh = async () => {
    setLastRefreshTime(new Date());
    
    // Manually invalidate all related queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
    
    if (viewContext === "category") {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
    } else if (viewContext === "bag") {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
    } else if (viewContext === "traveler") {
      queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
    }
    
    // Execute the refetch
    await refetch();
    
    toast({
      title: "Data Refreshed",
      description: `Refreshed ${containerTitle.toLowerCase()} at ${new Date().toLocaleTimeString()}`,
      duration: 2000,
    });
  };

  // Determine border color based on data freshness
  const borderColorClass = isDataFresh 
    ? "border-green-300 bg-green-50" 
    : "border-amber-300 bg-amber-50";

  return (
    <Card className={`rounded-lg shadow border-dashed border-2 ${borderColorClass} mb-4`}>
      <CardHeader className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h3 className="font-medium">{containerTitle} ({uncategorizedItems.length})</h3>
            {isDataFresh ? (
              <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 ml-2 text-amber-600" />
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleForceRefresh}
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