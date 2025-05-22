import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
  // Get all categories to extract items from them
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/categories`],
    enabled: !!packingListId
  });

  // Get all bags to extract items from them
  const { data: bags, isLoading: isLoadingBags } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    enabled: !!packingListId
  });

  // Get all travelers to extract items from them
  const { data: travelers, isLoading: isLoadingTravelers } = useQuery({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    enabled: !!packingListId
  });

  // Combine all items from these sources
  const allItems = useMemo(() => {
    const items = [];
    
    // Add all items from categories
    if (categories && Array.isArray(categories)) {
      categories.forEach(category => {
        if (category.items && Array.isArray(category.items)) {
          items.push(...category.items);
        }
      });
    }
    
    // Add any unique items from bags that might not be in categories
    if (bags && Array.isArray(bags)) {
      bags.forEach(bag => {
        if (bag.items && Array.isArray(bag.items)) {
          bag.items.forEach(item => {
            // Check if this item is already in our collection
            if (!items.some(existingItem => existingItem.id === item.id)) {
              items.push(item);
            }
          });
        }
      });
    }
    
    // Add any unique items from travelers that might not be in categories or bags
    if (travelers && Array.isArray(travelers)) {
      travelers.forEach(traveler => {
        if (traveler.items && Array.isArray(traveler.items)) {
          traveler.items.forEach(item => {
            // Check if this item is already in our collection
            if (!items.some(existingItem => existingItem.id === item.id)) {
              items.push(item);
            }
          });
        }
      });
    }
    
    return items;
  }, [categories, bags, travelers]);

  const isLoading = isLoadingCategories || isLoadingBags || isLoadingTravelers;

  if (isLoading) {
    return <Skeleton className="w-full h-24 mt-4" />;
  }

  // Filter based on viewMode
  if (viewMode === 'category') {
    // Find items with null categoryId
    const uncategorizedItems = allItems.filter((item: any) => item.categoryId === null);
    
    if (uncategorizedItems.length === 0) {
      return null;
    }
    
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
    const unassignedBagItems = allItems.filter((item: any) => item.bagId === null);
    
    if (unassignedBagItems.length === 0) {
      return null;
    }
    
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
    const unassignedTravelerItems = allItems.filter((item: any) => item.travelerId === null);
    
    if (unassignedTravelerItems.length === 0) {
      return null;
    }
    
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