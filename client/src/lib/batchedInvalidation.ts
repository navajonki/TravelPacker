import { QueryClient } from '@tanstack/react-query';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debouncedFunction = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T & { cancel: () => void };
  
  debouncedFunction.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFunction;
}

interface InvalidationBatch {
  packingListId: number;
  queryKeys: Set<string>;
  timestamp: number;
}

class BatchedInvalidationManager {
  private queryClient: QueryClient;
  private batches = new Map<number, InvalidationBatch>();
  private debouncedInvalidate: ReturnType<typeof debounce>;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
    this.debouncedInvalidate = debounce(this.processBatches.bind(this), 150);
  }

  /**
   * Add queries to invalidation batch for a specific packing list
   */
  addToInvalidationBatch(packingListId: number, queryKeys: string[]) {
    if (!this.batches.has(packingListId)) {
      this.batches.set(packingListId, {
        packingListId,
        queryKeys: new Set(),
        timestamp: Date.now()
      });
    }

    const batch = this.batches.get(packingListId)!;
    queryKeys.forEach(key => batch.queryKeys.add(key));
    batch.timestamp = Date.now();

    this.debouncedInvalidate();
  }

  /**
   * Process all batched invalidations
   */
  private processBatches() {
    const now = Date.now();
    
    this.batches.forEach((batch, packingListId) => {
      // Only process batches that are at least 100ms old to allow for more batching
      if (now - batch.timestamp >= 100) {
        this.invalidateQueriesForList(packingListId, Array.from(batch.queryKeys));
        this.batches.delete(packingListId);
      }
    });

    // If there are still batches, schedule another processing
    if (this.batches.size > 0) {
      setTimeout(() => this.processBatches(), 50);
    }
  }

  /**
   * Invalidate queries for a specific packing list using broader patterns
   */
  private invalidateQueriesForList(packingListId: number, queryKeys: string[]) {
    console.log(`Batch invalidating ${queryKeys.length} queries for list ${packingListId}`);

    // CRITICAL: Always invalidate the /complete endpoint that holds the actual UI data
    this.queryClient.invalidateQueries({
      queryKey: [`/api/packing-lists/${packingListId}/complete`]
    });

    // Group queries by type to use broader invalidation patterns
    const hasItems = queryKeys.some(key => 
      key.includes('/items') || 
      key.includes('/all-items') || 
      key.includes('/unassigned') ||
      key.includes('/complete')
    );
    
    const hasCategories = queryKeys.some(key => key.includes('/categories'));
    const hasBags = queryKeys.some(key => key.includes('/bags'));
    const hasTravelers = queryKeys.some(key => key.includes('/travelers'));
    const hasListDetails = queryKeys.some(key => key === `/api/packing-lists/${packingListId}`);

    // Use broader query patterns to invalidate related queries efficiently
    if (hasItems) {
      this.queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}`],
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key.includes('/items') || 
                 key.includes('/all-items') || 
                 key.includes('/unassigned') ||
                 key.includes('/complete') ||
                 key === `/api/packing-lists/${packingListId}`;
        }
      });
    }

    if (hasCategories) {
      this.queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}/categories`]
      });
    }

    if (hasBags) {
      this.queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}/bags`]
      });
    }

    if (hasTravelers) {
      this.queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}/travelers`]
      });
    }

    if (hasListDetails) {
      this.queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}`]
      });
    }
  }

  /**
   * Immediately invalidate queries without batching (for critical updates)
   */
  immediateInvalidate(packingListId: number, queryKeys: string[]) {
    this.invalidateQueriesForList(packingListId, queryKeys);
  }

  /**
   * Clear all pending batches
   */
  clearBatches() {
    this.batches.clear();
    this.debouncedInvalidate.cancel();
  }
}

// Export singleton instance
export const batchedInvalidationManager = new BatchedInvalidationManager(
  // Will be initialized with queryClient in a provider
  null as any
);

/**
 * Initialize the batched invalidation manager with query client
 */
export function initializeBatchedInvalidation(queryClient: QueryClient) {
  (batchedInvalidationManager as any).queryClient = queryClient;
}

/**
 * Hook to use batched invalidation
 */
export function useBatchedInvalidation() {
  return {
    /**
     * Add queries to invalidation batch
     */
    batchInvalidate: (packingListId: number, queryKeys: string[]) => {
      batchedInvalidationManager.addToInvalidationBatch(packingListId, queryKeys);
    },

    /**
     * Immediately invalidate queries
     */
    immediateInvalidate: (packingListId: number, queryKeys: string[]) => {
      batchedInvalidationManager.immediateInvalidate(packingListId, queryKeys);
    },

    /**
     * Clear all pending batches
     */
    clearBatches: () => {
      batchedInvalidationManager.clearBatches();
    }
  };
}

/**
 * Utility to get standard query keys for different operations
 */
export const getQueryKeysForOperation = (packingListId: number, operation: 'item' | 'category' | 'bag' | 'traveler') => {
  // CRITICAL: Always include the /complete endpoint that actually holds the UI data
  const baseKeys = [
    `/api/packing-lists/${packingListId}`,
    `/api/packing-lists/${packingListId}/complete`  // ← THE KEY FIX
  ];
  
  switch (operation) {
    case 'item':
      return [
        ...baseKeys,
        `/api/packing-lists/${packingListId}/categories`,
        `/api/packing-lists/${packingListId}/all-items`,
        `/api/packing-lists/${packingListId}/items`,
        `/api/packing-lists/${packingListId}/bags`,
        `/api/packing-lists/${packingListId}/travelers`,
        `/api/packing-lists/${packingListId}/unassigned/category`,
        `/api/packing-lists/${packingListId}/unassigned/bag`,
        `/api/packing-lists/${packingListId}/unassigned/traveler`
      ];
    case 'category':
      return [
        ...baseKeys,
        `/api/packing-lists/${packingListId}/categories`,
        `/api/packing-lists/${packingListId}/all-items`,
        `/api/packing-lists/${packingListId}/unassigned/category`
      ];
    case 'bag':
      return [
        ...baseKeys,
        `/api/packing-lists/${packingListId}/bags`,
        `/api/packing-lists/${packingListId}/all-items`,
        `/api/packing-lists/${packingListId}/unassigned/bag`
      ];
    case 'traveler':
      return [
        ...baseKeys,
        `/api/packing-lists/${packingListId}/travelers`,
        `/api/packing-lists/${packingListId}/all-items`,
        `/api/packing-lists/${packingListId}/unassigned/traveler`
      ];
    default:
      return baseKeys;
  }
};