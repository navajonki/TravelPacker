import { useMemo } from 'react';
import { Item } from '@shared/schema';

interface FilterOptions {
  selectedCategories: number[];
  selectedBags: number[];
  selectedTravelers: number[];
  showPacked: boolean;
  showUnpacked: boolean;
  groupBy: 'none' | 'category' | 'bag' | 'traveler';
}

interface UseFilteredItemsOptions {
  allItems: Item[];
  categories: any[];
  bags: any[];
  travelers: any[];
  filters: FilterOptions;
}

interface GroupedItems {
  [key: string]: {
    groupKey: number | null;
    groupName: string;
    items: Item[];
  };
}

export function useFilteredItems({
  allItems,
  categories,
  bags,
  travelers,
  filters
}: UseFilteredItemsOptions) {
  // Memoize the filtered items
  const filteredItems = useMemo(() => {
    if (!allItems) return [];

    return allItems.filter(item => {
      // Filter by packed status
      if (item.packed && !filters.showPacked) return false;
      if (!item.packed && !filters.showUnpacked) return false;
      
      // If no specific filters are selected, show all items
      if (filters.selectedCategories.length === 0 && 
          filters.selectedBags.length === 0 && 
          filters.selectedTravelers.length === 0) {
        return true;
      }
      
      // Check category filter (handle unassigned with ID -1)
      const categoryMatch = filters.selectedCategories.length === 0 || 
                          (item.categoryId && filters.selectedCategories.includes(item.categoryId)) ||
                          (filters.selectedCategories.includes(-1) && !item.categoryId);
      
      // Check bag filter (handle unassigned with ID -2)
      const bagMatch = filters.selectedBags.length === 0 || 
                    (item.bagId && filters.selectedBags.includes(item.bagId)) ||
                    (filters.selectedBags.includes(-2) && !item.bagId);
      
      // Check traveler filter (handle unassigned with ID -3)
      const travelerMatch = filters.selectedTravelers.length === 0 || 
                         (item.travelerId && filters.selectedTravelers.includes(item.travelerId)) ||
                         (filters.selectedTravelers.includes(-3) && !item.travelerId);
      
      return categoryMatch && bagMatch && travelerMatch;
    });
  }, [allItems, filters]);

  // Memoize the grouped items
  const groupedItems = useMemo(() => {
    if (filters.groupBy === 'none') {
      return null;
    }

    const groups: GroupedItems = {};
    
    filteredItems.forEach(item => {
      let groupKey: number | null = null;
      let groupName = 'Unassigned';
      
      if (filters.groupBy === 'category') {
        groupKey = item.categoryId;
        if (groupKey) {
          const category = categories?.find(c => c.id === groupKey);
          groupName = category?.name || 'Unknown Category';
        }
      } else if (filters.groupBy === 'bag') {
        groupKey = item.bagId;
        if (groupKey) {
          const bag = bags?.find(b => b.id === groupKey);
          groupName = bag?.name || 'Unknown Bag';
        }
      } else if (filters.groupBy === 'traveler') {
        groupKey = item.travelerId;
        if (groupKey) {
          const traveler = travelers?.find(t => t.id === groupKey);
          groupName = traveler?.name || 'Unknown Traveler';
        }
      }
      
      const groupId = groupKey?.toString() || 'unassigned';
      
      if (!groups[groupId]) {
        groups[groupId] = {
          groupKey,
          groupName,
          items: []
        };
      }
      
      groups[groupId].items.push(item);
    });
    
    return groups;
  }, [filteredItems, filters.groupBy, categories, bags, travelers]);

  // Memoize the sorted groups
  const sortedGroups = useMemo(() => {
    if (!groupedItems) return null;

    return Object.entries(groupedItems).sort(([keyA, groupA], [keyB, groupB]) => {
      // Unassigned groups come first
      if (keyA === 'unassigned') return -1;
      if (keyB === 'unassigned') return 1;
      
      // Sort by group name
      return groupA.groupName.localeCompare(groupB.groupName);
    });
  }, [groupedItems]);

  return {
    filteredItems,
    groupedItems,
    sortedGroups,
    totalFilteredItems: filteredItems.length
  };
}

/**
 * Hook to generate filter dropdown options
 */
export function useFilterOptions({ 
  categories, 
  bags, 
  travelers, 
  allItems 
}: {
  categories: any[];
  bags: any[];
  travelers: any[];
  allItems: Item[];
}) {
  const categoryOptions = useMemo(() => {
    if (!categories || !allItems) return [];
    
    return [
      // Add unassigned option
      { 
        id: -1, 
        name: "(unassigned)", 
        count: allItems.filter(item => !item.categoryId).length 
      },
      // Regular categories
      ...categories.map(cat => ({ 
        id: cat.id, 
        name: cat.name, 
        count: cat.totalItems || 0
      }))
    ];
  }, [categories, allItems]);

  const bagOptions = useMemo(() => {
    if (!bags || !allItems) return [];
    
    return [
      // Add unassigned option
      { 
        id: -2, 
        name: "(unassigned)", 
        count: allItems.filter(item => !item.bagId).length 
      },
      // Regular bags
      ...bags.map(bag => ({ 
        id: bag.id, 
        name: bag.name, 
        count: bag.totalItems || 0
      }))
    ];
  }, [bags, allItems]);

  const travelerOptions = useMemo(() => {
    if (!travelers || !allItems) return [];
    
    return [
      // Add unassigned option
      { 
        id: -3, 
        name: "(unassigned)", 
        count: allItems.filter(item => !item.travelerId).length 
      },
      // Regular travelers
      ...travelers.map(traveler => ({ 
        id: traveler.id, 
        name: traveler.name, 
        count: traveler.totalItems || 0
      }))
    ];
  }, [travelers, allItems]);

  return {
    categoryOptions,
    bagOptions,
    travelerOptions
  };
}