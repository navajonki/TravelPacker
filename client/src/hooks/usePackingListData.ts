/**
 * Connection-aware hook for packing list data optimized for poor internet connections
 * Fetches all data in a single request and handles offline scenarios
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { createLogger } from '@/services/logging';

const logger = createLogger('packingListData');

interface PackingListCompleteData {
  packingList: {
    id: number;
    name: string;
    theme?: string;
    dateRange?: string;
    userId: number;
    itemCount: number;
    packedItemCount: number;
    progress: number;
    collaboratorCount: number;
    createdAt: string;
  };
  categories: any[];
  bags: any[];
  travelers: any[];
  items: any[];
  collaborators: any[];
  stats: {
    totalItems: number;
    packedItems: number;
    progress: number;
    collaboratorCount: number;
  };
}

interface UsePackingListDataOptions {
  packingListId: number;
  enabled?: boolean;
}

export function usePackingListData({ packingListId, enabled = true }: UsePackingListDataOptions) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSuccessfulFetch, setLastSuccessfulFetch] = useState<Date | null>(null);

  // Monitor connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Connection restored - enabling queries');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      logger.info('Connection lost - using cached data');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Single comprehensive query for all packing list data
  const {
    data: completeData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useQuery<PackingListCompleteData>({
    queryKey: [`/api/packing-lists/${packingListId}/complete`],
    queryFn: async () => {
      const data = await apiRequest('GET', `/api/packing-lists/${packingListId}/complete`);
      setLastSuccessfulFetch(new Date());
      return data;
    },
    enabled: enabled && !!packingListId,
    staleTime: 5 * 60 * 1000, // 5 minutes - reasonable for poor connections
    gcTime: 30 * 60 * 1000, // 30 minutes - keep data longer for offline use
    refetchOnWindowFocus: isOnline, // Only refetch when online
    refetchOnMount: isOnline, // Only refetch when online
    retry: (failureCount, error) => {
      // Don't retry if offline
      if (!isOnline) return false;
      // Retry up to 3 times with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Smart cache invalidation that respects connection status
  const invalidateAndRefetch = async () => {
    if (!isOnline) {
      logger.warn('Skipping refetch - offline mode');
      return;
    }

    try {
      await queryClient.invalidateQueries({
        queryKey: [`/api/packing-lists/${packingListId}/complete`]
      });
      
      // Force refetch to get latest data
      await refetch();
    } catch (error) {
      logger.error('Failed to refetch data:', error);
    }
  };

  // Extract individual data pieces for backwards compatibility
  const packingList = completeData?.packingList;
  const categories = completeData?.categories || [];
  const bags = completeData?.bags || [];
  const travelers = completeData?.travelers || [];
  const items = completeData?.items || [];
  const collaborators = completeData?.collaborators || [];
  const stats = completeData?.stats;

  // Calculate data freshness
  const dataAge = lastSuccessfulFetch ? Date.now() - lastSuccessfulFetch.getTime() : null;
  const isDataStale = dataAge ? dataAge > 5 * 60 * 1000 : false; // 5 minutes

  return {
    // Individual data pieces
    packingList,
    categories,
    bags,
    travelers,
    items,
    collaborators,
    stats,
    
    // Complete data
    completeData,
    
    // Loading states
    isLoading,
    isRefetching,
    isError,
    error,
    
    // Connection awareness
    isOnline,
    lastSuccessfulFetch,
    dataAge,
    isDataStale,
    
    // Actions
    refetch: invalidateAndRefetch,
    forceRefetch: refetch,
    
    // Utilities
    hasData: !!completeData,
    isEmpty: !isLoading && !completeData,
  };
}

export default usePackingListData;