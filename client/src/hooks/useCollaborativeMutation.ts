import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/services/logging';

const logger = createLogger('collaborativeMutation');

interface CollaborativeMutationOptions<T = any, TVariables = any> {
  entity: string;
  packingListId: number;
  onSuccess?: (data: T, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  optimisticUpdate?: (variables: TVariables) => void;
  rollbackOnError?: boolean;
}

/**
 * Hook for collaborative mutations that work online and offline
 * This hook wraps useMutation from React Query and adds synchronization
 * capabilities for collaborative real-time updates
 */
export function useCollaborativeMutation<T = any, TVariables = any>({
  entity,
  packingListId,
  onSuccess,
  onError,
  optimisticUpdate,
  rollbackOnError = true
}: CollaborativeMutationOptions<T, TVariables>) {
  const { incrementPending, decrementPending } = useSyncStatus();
  const { isOnline } = useNetwork();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Create mutation for creating new entities
   */
  const createMutation = useMutation<T, Error, TVariables>({
    mutationFn: async (data) => {
      // Mark operation as pending
      incrementPending();

      try {
        // Record the operation for sync
        await syncService.recordOperation({
          operation: 'create',
          entity,
          data,
          packingListId
        });

        // For optimistic UI, we need to return something that looks like
        // what the server would return
        return {
          ...data,
          id: `temp-${Date.now()}`, // Temporary ID until server assigns one
          createdAt: new Date().toISOString()
        } as unknown as T;
      } finally {
        decrementPending();
      }
    },
    onMutate: async (data) => {
      // Apply optimistic update if provided
      if (optimisticUpdate) {
        optimisticUpdate(data);
      }

      // Default optimistic update for common entity types
      if (!optimisticUpdate) {
        // For items
        if (entity === 'item') {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });

          // Get current items
          const previousItems = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);

          // Optimistically add the new item
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], (old: any[] = []) => {
            return [...old, {
              ...data,
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString()
            }];
          });

          return { previousItems };
        }

        // For categories
        if (entity === 'category') {
          await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
          const previousCategories = queryClient.getQueryData([`/api/packing-lists/${packingListId}/categories`]);
          
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], (old: any[] = []) => {
            return [...old, {
              ...data,
              id: `temp-${Date.now()}`,
              createdAt: new Date().toISOString()
            }];
          });

          return { previousCategories };
        }
      }

      return {};
    },
    onError: (error, variables, context: any) => {
      // Show error toast if this was an online operation that failed
      if (isOnline) {
        toast({
          title: 'Error',
          description: `Failed to create ${entity}: ${error.message}`,
          variant: 'destructive'
        });
      }

      // Rollback optimistic update if we have context
      if (rollbackOnError && context) {
        if (entity === 'item' && context.previousItems) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
        }
        if (entity === 'category' && context.previousCategories) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], context.previousCategories);
        }
      }

      // Call custom error handler if provided
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      // If we're offline, show a message that changes will sync later
      if (!isOnline) {
        toast({
          title: 'Offline Changes',
          description: `Changes will be synchronized when you're back online.`,
          variant: 'default'
        });
      }

      // Call custom success handler
      onSuccess?.(data, variables);
    }
  });

  /**
   * Update mutation for updating existing entities
   */
  const updateMutation = useMutation<T, Error, { id: number; data: TVariables }>({
    mutationFn: async ({ id, data }) => {
      // Mark operation as pending
      incrementPending();

      try {
        // Record the operation for sync
        await syncService.recordOperation({
          operation: 'update',
          entity,
          entityId: id,
          data,
          packingListId
        });

        // Return optimistic result
        return {
          id,
          ...data
        } as unknown as T;
      } finally {
        decrementPending();
      }
    },
    onMutate: async ({ id, data }) => {
      // Optimistic update logic varies by entity
      if (entity === 'item') {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });
        
        // Get current data
        const previousItems = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);

        // Update optimistically
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], (old: any[] = []) => {
          return old.map(item =>
            item.id === id ? { ...item, ...data } : item
          );
        });

        return { previousItems };
      }

      if (entity === 'category') {
        await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        const previousCategories = queryClient.getQueryData([`/api/packing-lists/${packingListId}/categories`]);
        
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], (old: any[] = []) => {
          return old.map(category =>
            category.id === id ? { ...category, ...data } : category
          );
        });

        return { previousCategories };
      }

      return {};
    },
    onError: (error, variables, context: any) => {
      // Show error toast
      if (isOnline) {
        toast({
          title: 'Error',
          description: `Failed to update ${entity}: ${error.message}`,
          variant: 'destructive'
        });
      }

      // Rollback optimistic update
      if (rollbackOnError && context) {
        if (entity === 'item' && context.previousItems) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
        }
        if (entity === 'category' && context.previousCategories) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], context.previousCategories);
        }
      }

      // Call custom error handler
      onError?.(error, variables.data);
    },
    onSuccess: (data, variables) => {
      // If offline, show message
      if (!isOnline) {
        toast({
          title: 'Offline Changes',
          description: `Changes will be synchronized when you're back online.`,
          variant: 'default'
        });
      }

      // Call custom success handler
      onSuccess?.(data, variables.data);
    }
  });

  /**
   * Delete mutation for removing entities
   */
  const deleteMutation = useMutation<void, Error, number>({
    mutationFn: async (id) => {
      // Mark operation as pending
      incrementPending();

      try {
        // Record the operation for sync
        await syncService.recordOperation({
          operation: 'delete',
          entity,
          entityId: id,
          data: null,
          packingListId
        });
      } finally {
        decrementPending();
      }
    },
    onMutate: async (id) => {
      // Optimistic delete logic
      if (entity === 'item') {
        await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });
        const previousItems = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);

        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], (old: any[] = []) => {
          return old.filter(item => item.id !== id);
        });

        return { previousItems };
      }

      if (entity === 'category') {
        await queryClient.cancelQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        const previousCategories = queryClient.getQueryData([`/api/packing-lists/${packingListId}/categories`]);
        
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], (old: any[] = []) => {
          return old.filter(category => category.id !== id);
        });

        return { previousCategories };
      }

      return {};
    },
    onError: (error, variables, context: any) => {
      // Show error toast
      if (isOnline) {
        toast({
          title: 'Error',
          description: `Failed to delete ${entity}: ${error.message}`,
          variant: 'destructive'
        });
      }

      // Rollback optimistic update
      if (rollbackOnError && context) {
        if (entity === 'item' && context.previousItems) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
        }
        if (entity === 'category' && context.previousCategories) {
          queryClient.setQueryData([`/api/packing-lists/${packingListId}/categories`], context.previousCategories);
        }
      }

      // Call custom error handler
      onError?.(error, variables as unknown as TVariables);
    },
    onSuccess: (_, variables) => {
      // If offline, show message
      if (!isOnline) {
        toast({
          title: 'Offline Changes',
          description: `Changes will be synchronized when you're back online.`,
          variant: 'default'
        });
      }

      // Call custom success handler
      onSuccess?.(undefined as unknown as T, variables as unknown as TVariables);
    }
  });

  return {
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isLoading: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  };
}