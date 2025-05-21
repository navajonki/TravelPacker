/**
 * Custom hook to fetch and manage collaborators for a packing list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, UserWithDetails } from '@shared/types';
import { PackingListCollaborator } from '@shared/schema';
import { CollaborationApi } from '@/api/apiClient';
import { invalidateCollaborators } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';

const logger = createLogger('collab');

interface UseCollaboratorsProps {
  packingListId: number;
}

interface UseCollaboratorsResult {
  collaborators: PackingListCollaborator[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  removeCollaborator: (userId: number) => Promise<void>;
}

export default function useCollaborators({ packingListId }: UseCollaboratorsProps): UseCollaboratorsResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all collaborators for a packing list
  const {
    data: collaborators = [],
    isLoading,
    isError,
    error
  } = useQuery<PackingListCollaborator[], ApiError>({
    queryKey: [`/api/packing-lists/${packingListId}/collaborators`],
    queryFn: () => CollaborationApi.getCollaborators(packingListId),
    enabled: !!packingListId,
  });
  
  // Mutation to remove a collaborator
  const removeMutation = useMutation({
    mutationFn: (userId: number) => {
      logger.debug('Removing collaborator', { packingListId, userId });
      return CollaborationApi.removeCollaborator(packingListId, userId);
    },
    onSuccess: () => {
      logger.info('Collaborator removed successfully', { packingListId });
      invalidateCollaborators(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to remove collaborator', error, { packingListId });
    }
  });

  // Wrapped mutation handler with nicer API
  const removeCollaborator = async (userId: number): Promise<void> => {
    await removeMutation.mutateAsync(userId);
  };

  return {
    collaborators,
    isLoading,
    isError,
    error: error || null,
    removeCollaborator
  };
}