import { useMemo } from 'react';
import { Item } from '@shared/schema';

interface CategoryData {
  id: number;
  name: string;
  items: Item[];
}

interface BagData {
  id: number;
  name: string;
  items: Item[];
}

interface TravelerData {
  id: number;
  name: string;
  items: Item[];
}

interface UseOptimizedDataProps {
  categories: CategoryData[];
  bags: BagData[];
  travelers: TravelerData[];
}

export function useOptimizedData({ categories, bags, travelers }: UseOptimizedDataProps) {
  // Memoize all items from categories to avoid repeated flatMap operations
  const allItemsFromCategories = useMemo(() => {
    if (!categories) return [];
    
    // Use reduce instead of flatMap for better performance
    return categories.reduce<Item[]>((acc, category) => {
      if (category.items) {
        acc.push(...category.items);
      }
      return acc;
    }, []);
  }, [categories]);

  // Memoize items without bag assignment
  const itemsWithoutBag = useMemo(() => {
    return allItemsFromCategories.filter(item => !item.bagId);
  }, [allItemsFromCategories]);

  // Memoize items without traveler assignment
  const itemsWithoutTraveler = useMemo(() => {
    return allItemsFromCategories.filter(item => !item.travelerId);
  }, [allItemsFromCategories]);

  // Memoize items without category assignment
  const itemsWithoutCategory = useMemo(() => {
    return allItemsFromCategories.filter(item => !item.categoryId);
  }, [allItemsFromCategories]);

  // Create lookup maps for faster access
  const categoryMap = useMemo(() => {
    if (!categories) return new Map();
    
    return categories.reduce((map, category) => {
      map.set(category.id, category);
      return map;
    }, new Map<number, CategoryData>());
  }, [categories]);

  const bagMap = useMemo(() => {
    if (!bags) return new Map();
    
    return bags.reduce((map, bag) => {
      map.set(bag.id, bag);
      return map;
    }, new Map<number, BagData>());
  }, [bags]);

  const travelerMap = useMemo(() => {
    if (!travelers) return new Map();
    
    return travelers.reduce((map, traveler) => {
      map.set(traveler.id, traveler);
      return map;
    }, new Map<number, TravelerData>());
  }, [travelers]);

  // Memoize item counts for performance
  const itemCounts = useMemo(() => {
    const totalItems = allItemsFromCategories.length;
    const packedItems = allItemsFromCategories.filter(item => item.packed).length;
    const unpackedItems = totalItems - packedItems;
    
    return {
      total: totalItems,
      packed: packedItems,
      unpacked: unpackedItems,
      unassignedCategory: itemsWithoutCategory.length,
      unassignedBag: itemsWithoutBag.length,
      unassignedTraveler: itemsWithoutTraveler.length
    };
  }, [allItemsFromCategories, itemsWithoutCategory, itemsWithoutBag, itemsWithoutTraveler]);

  // Memoize category statistics
  const categoryStats = useMemo(() => {
    if (!categories) return [];
    
    return categories.map(category => {
      const items = category.items || [];
      const packedCount = items.filter(item => item.packed).length;
      
      return {
        id: category.id,
        name: category.name,
        totalItems: items.length,
        packedItems: packedCount,
        unpackedItems: items.length - packedCount,
        progress: items.length > 0 ? (packedCount / items.length) * 100 : 0
      };
    });
  }, [categories]);

  // Memoize bag statistics
  const bagStats = useMemo(() => {
    if (!bags) return [];
    
    return bags.map(bag => {
      const items = bag.items || [];
      const packedCount = items.filter(item => item.packed).length;
      
      return {
        id: bag.id,
        name: bag.name,
        totalItems: items.length,
        packedItems: packedCount,
        unpackedItems: items.length - packedCount,
        progress: items.length > 0 ? (packedCount / items.length) * 100 : 0
      };
    });
  }, [bags]);

  // Memoize traveler statistics
  const travelerStats = useMemo(() => {
    if (!travelers) return [];
    
    return travelers.map(traveler => {
      const items = traveler.items || [];
      const packedCount = items.filter(item => item.packed).length;
      
      return {
        id: traveler.id,
        name: traveler.name,
        totalItems: items.length,
        packedItems: packedCount,
        unpackedItems: items.length - packedCount,
        progress: items.length > 0 ? (packedCount / items.length) * 100 : 0
      };
    });
  }, [travelers]);

  return {
    // Derived data
    allItemsFromCategories,
    itemsWithoutBag,
    itemsWithoutTraveler,
    itemsWithoutCategory,
    
    // Lookup maps
    categoryMap,
    bagMap,
    travelerMap,
    
    // Statistics
    itemCounts,
    categoryStats,
    bagStats,
    travelerStats
  };
}

/**
 * Hook to optimize search operations
 */
export function useSearchOptimization(items: Item[]) {
  // Create a search index for better performance
  const searchIndex = useMemo(() => {
    if (!items) return new Map();
    
    const index = new Map<string, Item[]>();
    
    items.forEach(item => {
      if (item.name) {
        const words = item.name.toLowerCase().split(' ');
        
        words.forEach(word => {
          if (word.length > 1) { // Skip single characters
            if (!index.has(word)) {
              index.set(word, []);
            }
            index.get(word)!.push(item);
          }
        });
      }
    });
    
    return index;
  }, [items]);

  // Optimized search function
  const searchItems = useMemo(() => {
    return (query: string): Item[] => {
      if (!query.trim()) return [];
      
      const searchTerm = query.toLowerCase().trim();
      const words = searchTerm.split(' ');
      
      if (words.length === 1) {
        // Single word search - use index
        const word = words[0];
        const exactMatches = searchIndex.get(word) || [];
        
        // Also search for partial matches
        const partialMatches = items.filter(item => 
          item.name?.toLowerCase().includes(word) && 
          !exactMatches.some(exact => exact.id === item.id)
        );
        
        return [...exactMatches, ...partialMatches];
      } else {
        // Multi-word search - fallback to linear search
        return items.filter(item => 
          item.name?.toLowerCase().includes(searchTerm)
        );
      }
    };
  }, [items, searchIndex]);

  return {
    searchIndex,
    searchItems
  };
}