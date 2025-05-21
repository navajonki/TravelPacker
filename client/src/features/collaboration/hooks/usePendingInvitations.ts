/**
 * Custom hook to fetch and manage pending invitations for the current user
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError, InvitationWithDetails } from '@shared/types';
import { CollaborationApi } from '@/api/apiClient';
import { createLogger } from '@/services/logging';

const logger = createLogger('collab');

interface UsePendingInvitationsResult {
  pendingInvitations: InvitationWithDetails[];
  isLoading: boolean;
  isError: boolean;
  error: ApiError | null;
  acceptInvitation: (token: string) => Promise<any>;
  declineInvitation: (invitationId: number) => Promise<void>;
}

export default function usePendingInvitations(): UsePendingInvitationsResult {
  const queryClient = useQueryClient();
  
  // Query to fetch all pending invitations for the current user
  const {
    data: pendingInvitations = [],
    isLoading,
    isError,
    error
  } = useQuery<InvitationWithDetails[], ApiError>({
    queryKey: ['/api/invitations'],
    queryFn: () => CollaborationApi.getPendingInvitations(),
  });
  
  // Mutation to accept an invitation
  const acceptMutation = useMutation({
    mutationFn: (token: string) => {
      logger.debug('Accepting invitation', { token });
      return CollaborationApi.acceptInvitation(token);
    },
    onSuccess: (data) => {
      logger.info('Invitation accepted successfully');
      // Invalidate pending invitations and packing lists
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packing-lists'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shared-packing-lists'] });
      return data;
    },
    onError: (error: ApiError) => {
      logger.error('Failed to accept invitation', error);
      throw error;
    }
  });
  
  // Mutation to decline an invitation
  const declineMutation = useMutation({
    mutationFn: (invitationId: number) => {
      logger.debug('Declining invitation', { invitationId });
      // Using the DELETE /api/invitations/{id} endpoint
      return apiRequest('DELETE', `/api/invitations/${invitationId}`);
    },
    onSuccess: () => {
      logger.info('Invitation declined successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
    },
    onError: (error: ApiError) => {
      logger.error('Failed to decline invitation', error);
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
  const acceptInvitation = async (token: string): Promise<any> => {
    return await acceptMutation.mutateAsync(token);
  };
  
  const declineInvitation = async (invitationId: number): Promise<void> => {
    await declineMutation.mutateAsync(invitationId);
  };

  return {
    pendingInvitations,
    isLoading,
    isError,
    error: error || null,
    acceptInvitation,
    declineInvitation
  };
}