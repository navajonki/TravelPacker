import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import UnassignedItemsCard from "./UnassignedItemsCard";

interface UnassignedItemsSectionProps {
  packingListId: number;
  viewMode: 'category' | 'bag' | 'traveler';
  onEditItem?: (itemId: number) => void;
}

export default function UnassignedItemsSection({ 
  packingListId, 
  viewMode,
  onEditItem 
}: UnassignedItemsSectionProps) {
  // Get all items for the packing list
  const { data: allItems, isLoading } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/items`],
    enabled: !!packingListId,
    // Decrease cache time to ensure frequent refreshes
    cacheTime: 30 * 1000, // 30 seconds
    // Always refetch on window focus to ensure data is fresh
    refetchOnWindowFocus: true,
    // Ensure we get fresh data when component remounts
    refetchOnMount: true
  });

  if (isLoading) {
    return <Skeleton className="w-full h-32" />;
  }

  if (!allItems || !Array.isArray(allItems)) {
    return null;
  }

  // Filter based on viewMode
  const uncategorizedItems = allItems.filter(item => item.categoryId === null);
  const unassignedBagItems = allItems.filter(item => item.bagId === null);
  const unassignedTravelerItems = allItems.filter(item => item.travelerId === null);

  // Only show the section relevant to the current view
  if (viewMode === 'category' && uncategorizedItems.length === 0) {
    return null;
  }
  if (viewMode === 'bag' && unassignedBagItems.length === 0) {
    return null;
  }
  if (viewMode === 'traveler' && unassignedTravelerItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      {viewMode === 'category' && uncategorizedItems.length > 0 && (
        <UnassignedItemsCard
          items={uncategorizedItems}
          packingListId={packingListId}
          title="Uncategorized Items"
          field="categoryId"
          onEditItem={onEditItem}
          viewContext="category"
        />
      )}
      
      {viewMode === 'bag' && unassignedBagItems.length > 0 && (
        <UnassignedItemsCard
          items={unassignedBagItems}
          packingListId={packingListId}
          title="Unassigned Items (No Bag)"
          field="bagId"
          onEditItem={onEditItem}
          viewContext="bag"
        />
      )}
      
      {viewMode === 'traveler' && unassignedTravelerItems.length > 0 && (
        <UnassignedItemsCard
          items={unassignedTravelerItems}
          packingListId={packingListId}
          title="Unassigned Items (No Traveler)"
          field="travelerId"
          onEditItem={onEditItem}
          viewContext="traveler"
        />
      )}
    </div>
  );
}