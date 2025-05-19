import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import UnassignedItemsCard from "./UnassignedItemsCard";

interface UncategorizedItemsProps {
  packingListId: number;
  viewMode: 'category' | 'bag' | 'traveler';
  onEditItem?: (itemId: number) => void;
}

export default function UncategorizedItems({ 
  packingListId, 
  viewMode,
  onEditItem 
}: UncategorizedItemsProps) {
  // Query for all items in this packing list
  const { data: allPackingListItems, isLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/all-items`],
    enabled: !!packingListId
  });

  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }

  if (!allPackingListItems || !Array.isArray(allPackingListItems)) {
    console.log("No items data available for uncategorized items");
    return null;
  }

  // Filter based on viewMode
  if (viewMode === 'category') {
    const uncategorizedItems = allPackingListItems.filter(item => item.categoryId === null);
    
    if (uncategorizedItems.length === 0) {
      return null;
    }
    
    console.log(`Found ${uncategorizedItems.length} uncategorized items`);
    
    return (
      <UnassignedItemsCard
        items={uncategorizedItems}
        packingListId={packingListId}
        title="Uncategorized Items"
        field="categoryId"
        onEditItem={onEditItem}
        viewContext="category"
      />
    );
  } 
  
  if (viewMode === 'bag') {
    const unassignedBagItems = allPackingListItems.filter(item => item.bagId === null);
    
    if (unassignedBagItems.length === 0) {
      return null;
    }
    
    console.log(`Found ${unassignedBagItems.length} unassigned bag items`);
    
    return (
      <UnassignedItemsCard
        items={unassignedBagItems}
        packingListId={packingListId}
        title="Items Without Bag"
        field="bagId"
        onEditItem={onEditItem}
        viewContext="bag"
      />
    );
  }
  
  if (viewMode === 'traveler') {
    const unassignedTravelerItems = allPackingListItems.filter(item => item.travelerId === null);
    
    if (unassignedTravelerItems.length === 0) {
      return null;
    }
    
    console.log(`Found ${unassignedTravelerItems.length} unassigned traveler items`);
    
    return (
      <UnassignedItemsCard
        items={unassignedTravelerItems}
        packingListId={packingListId}
        title="Items Without Traveler"
        field="travelerId"
        onEditItem={onEditItem}
        viewContext="traveler"
      />
    );
  }
  
  return null;
}