/**
 * Custom hook to fetch and manage travelers for a packing list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TravelerWithItems, ApiError } from '@shared/types';
import { InsertTraveler } from '@shared/schema';
import { TravelerApi } from '@/api/apiClient';
import { invalidateTravelers, invalidateAllPackingListData } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';

const logger = createLogger('travelers');

interface UseTravelersProps {
  packingListId: number;
}

interface UseTravelersResult {
  travelers: TravelerWithItems[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  createTraveler: (data: InsertTraveler) => Promise<void>;
  updateTraveler: (id: number, data: Partial<InsertTraveler>) => Promise<void>;
  deleteTraveler: (id: number) => Promise<void>;
}

export default function useTravelers({ packingListId }: UseTravelersProps): UseTravelersResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all travelers for a packing list
  const {
    data: travelers = [],
    isLoading,
    isError,
    error
  } = useQuery<TravelerWithItems[], ApiError>({
    queryKey: [`/api/packing-lists/${packingListId}/travelers`],
    queryFn: () => TravelerApi.getAllForPackingList(packingListId),
    enabled: !!packingListId,
  });
  
  // Mutation to create a new traveler
  const createMutation = useMutation({
    mutationFn: (data: InsertTraveler) => {
      logger.debug('Creating traveler', { packingListId, name: data.name });
      return TravelerApi.create(data);
    },
    onSuccess: () => {
      logger.info('Traveler created successfully', { packingListId });
      invalidateTravelers(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to create traveler', error, { packingListId });
    }
  });
  
  // Mutation to update an existing traveler
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertTraveler> }) => {
      logger.debug('Updating traveler', { travelerId: id, updates: data });
      return TravelerApi.update(id, data);
    },
    onSuccess: () => {
      logger.info('Traveler updated successfully');
      invalidateTravelers(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to update traveler', error);
    }
  });
  
  // Mutation to delete a traveler
  const deleteMutation = useMutation({
    mutationFn: (travelerId: number) => {
      logger.debug('Deleting traveler', { travelerId });
      return TravelerApi.delete(travelerId);
    },
    onSuccess: () => {
      logger.info('Traveler deleted successfully');
      // Invalidate all data since items might have been affected
      invalidateAllPackingListData(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to delete traveler', error);
    }
  });

  // Wrapped mutation handlers with nicer API
  const createTraveler = async (data: InsertTraveler): Promise<void> => {
    await createMutation.mutateAsync(data);
  };
  
  const updateTraveler = async (id: number, data: Partial<InsertTraveler>): Promise<void> => {
    await updateMutation.mutateAsync({ id, data });
  };
  
  const deleteTraveler = async (id: number): Promise<void> => {
    await deleteMutation.mutateAsync(id);
  };

  return {
    travelers,
    isLoading,
    isError,
    error: error || null,
    createTraveler,
    updateTraveler,
    deleteTraveler
  };
}