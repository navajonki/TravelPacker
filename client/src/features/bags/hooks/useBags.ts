/**
 * Custom hook to fetch and manage bags for a packing list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BagWithItems, ApiError } from '@shared/types';
import { InsertBag } from '@shared/schema';
import { BagApi } from '@/api/apiClient';
import { invalidateBags, invalidateAllPackingListData } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';

const logger = createLogger('bags');

interface UseBagsProps {
  packingListId: number;
}

interface UseBagsResult {
  bags: BagWithItems[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  createBag: (data: InsertBag) => Promise<void>;
  updateBag: (id: number, data: Partial<InsertBag>) => Promise<void>;
  deleteBag: (id: number) => Promise<void>;
}

export default function useBags({ packingListId }: UseBagsProps): UseBagsResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all bags for a packing list
  const {
    data: bags = [],
    isLoading,
    isError,
    error
  } = useQuery<BagWithItems[], ApiError>({
    queryKey: [`/api/packing-lists/${packingListId}/bags`],
    queryFn: () => BagApi.getAllForPackingList(packingListId),
    enabled: !!packingListId,
  });
  
  // Mutation to create a new bag
  const createMutation = useMutation({
    mutationFn: (data: InsertBag) => {
      logger.debug('Creating bag', { packingListId, name: data.name });
      return BagApi.create(data);
    },
    onSuccess: () => {
      logger.info('Bag created successfully', { packingListId });
      invalidateBags(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to create bag', error, { packingListId });
    }
  });
  
  // Mutation to update an existing bag
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertBag> }) => {
      logger.debug('Updating bag', { bagId: id, updates: data });
      return BagApi.update(id, data);
    },
    onSuccess: () => {
      logger.info('Bag updated successfully');
      invalidateBags(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to update bag', error);
    }
  });
  
  // Mutation to delete a bag
  const deleteMutation = useMutation({
    mutationFn: (bagId: number) => {
      logger.debug('Deleting bag', { bagId });
      return BagApi.delete(bagId);
    },
    onSuccess: () => {
      logger.info('Bag deleted successfully');
      // Invalidate all data since items might have been affected
      invalidateAllPackingListData(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to delete bag', error);
    }
  });

  // Wrapped mutation handlers with nicer API
  const createBag = async (data: InsertBag): Promise<void> => {
    await createMutation.mutateAsync(data);
  };
  
  const updateBag = async (id: number, data: Partial<InsertBag>): Promise<void> => {
    await updateMutation.mutateAsync({ id, data });
  };
  
  const deleteBag = async (id: number): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    bags,
    isLoading,
    isError,
    error: error || null,
    createBag,
    updateBag,
    deleteBag
  };
}