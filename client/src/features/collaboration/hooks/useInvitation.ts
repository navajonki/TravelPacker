/**
 * Custom hook to fetch and manage a specific invitation by token
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, InvitationWithDetails } from '@shared/types';
import { CollaborationApi } from '@/api/apiClient';
import { createLogger } from '@/services/logging';

const logger = createLogger('collab');

interface UseInvitationProps {
  token: string;
}

interface UseInvitationResult {
  invitation: InvitationWithDetails | null;
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  acceptInvitation: () => Promise<any>;
}

export default function useInvitation({ token }: UseInvitationProps): UseInvitationResult {
  const queryClient = useQueryClient();
  
  // Query to fetch invitation details by token
  const {
    data: invitation,
    isLoading,
    isError,
    error
  } = useQuery<InvitationWithDetails, ApiError>({
    queryKey: [`/api/invitations/${token}`],
    queryFn: () => CollaborationApi.getInvitationByToken(token),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });
  
  // Mutation to accept the invitation
  const acceptMutation = useMutation({
    mutationFn: () => {
      logger.debug('Accepting invitation', { token });
      return CollaborationApi.acceptInvitation(token);
    },
    onSuccess: (data) => {
      logger.info('Invitation accepted successfully');
      // Invalidate packing lists and shared lists
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-packing-lists'] });
      return data;
    },
    onError: (error: ApiError) => {
      logger.error('Failed to accept invitation', error);
      throw error;
    }
  });

  // Wrapped mutation handler with nicer API
  const acceptInvitation = async (): Promise<any> => {
    return await acceptMutation.mutateAsync();
  };

  return {
    invitation: invitation || null,
    isLoading,
    isError,
    error: error || null,
    acceptInvitation
  };
}