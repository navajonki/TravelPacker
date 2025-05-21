/**
 * Custom hook to fetch and manage invitations for a packing list
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, CreateInvitationRequest, InvitationWithDetails } from '@shared/types';
import { CollaborationInvitation } from '@shared/schema';
import { CollaborationApi } from '@/api/apiClient';
import { invalidateInvitations } from '@/services/queryInvalidation';
import { createLogger } from '@/services/logging';

const logger = createLogger('collab');

interface UseInvitationsProps {
  packingListId: number;
}

interface UseInvitationsResult {
  invitations: CollaborationInvitation[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  createInvitation: (email: string, permissionLevel: string) => Promise<any>;
  cancelInvitation: (invitationId: number) => Promise<void>;
}

export default function useInvitations({ packingListId }: UseInvitationsProps): UseInvitationsResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all invitations for a packing list
  const {
    data: invitations = [],
    isLoading,
    isError,
    error
  } = useQuery<CollaborationInvitation[], ApiError>({
    queryKey: [`/api/packing-lists/${packingListId}/invitations`],
    queryFn: () => CollaborationApi.getInvitations(packingListId),
    enabled: !!packingListId,
  });
  
  // Mutation to create a new invitation
  const createMutation = useMutation({
    mutationFn: ({ email, permissionLevel }: { email: string; permissionLevel: string }) => {
      logger.debug('Creating invitation', { packingListId, email, permissionLevel });
      return CollaborationApi.createInvitation({
        email,
        packingListId,
        permissionLevel: permissionLevel as any
      });
    },
    onSuccess: (data) => {
      logger.info('Invitation created successfully', { packingListId });
      invalidateInvitations(queryClient, packingListId);
      return data;
    },
    onError: (error: ApiError) => {
      logger.error('Failed to create invitation', error, { packingListId });
      throw error;
    }
  });
  
  // Mutation to cancel an invitation
  const cancelMutation = useMutation({
    mutationFn: (invitationId: number) => {
      logger.debug('Canceling invitation', { invitationId });
      // Using the DELETE /api/invitations/{id} endpoint
      return apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      logger.info('Invitation canceled successfully');
      invalidateInvitations(queryClient, packingListId);
    },
    onError: (error: ApiError) => {
      logger.error('Failed to cancel invitation', error);
    }
  });

  // Helper function for direct API requests
  const apiRequest = async (method: string, url: string, data?: any): Promise<any> => {
    const response = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }

    if (response.status === 204) {
      return null;
    }
    
    return response.json();
  };

  // Wrapped mutation handlers with nicer API
  const createInvitation = async (email: string, permissionLevel: string): Promise<any> => {
    return await createMutation.mutateAsync({ email, permissionLevel });
  };
  
  const cancelInvitation = async (invitationId: number): Promise<void> => {
    await cancelMutation.mutateAsync(invitationId);
  };

  return {
    invitations,
    isLoading,
    isError,
    error: error || null,
    createInvitation,
    cancelInvitation
  };
}