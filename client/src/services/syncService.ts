import { offlineStorage } from './offlineStorage';
import { webSocketService } from './websocket';
import { createLogger } from './logging';
import { useNetwork } from '@/contexts/NetworkContext';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { queryClient } from '@/lib/queryClient';
import { useEffect, useState } from 'react';

const logger = createLogger('sync');

/**
 * Service for synchronizing data between client and server
 */
class SyncService {
  private syncInProgress = false;
  private lastSyncTime = 0;
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the sync service
   */
  async init() {
    logger.info('Initializing sync service');
    
    // Listen for online events to trigger sync
    window.addEventListener('online', this.handleOnline);

    // Initialize offline storage
    await offlineStorage.init();

    // Periodic sync attempt (every 30 seconds)
    this.startPeriodicSync();

    // Listen for messages from WebSocket service
    webSocketService.subscribe('update', this.handleRemoteUpdate);
    
    logger.info('Sync service initialized');
  }

  /**
   * Start periodic sync attempts
   */
  private startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(this.attemptSync, 30000);
    logger.debug('Periodic sync started');
  }

  /**
   * Stop periodic sync attempts
   */
  private stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.debug('Periodic sync stopped');
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    this.stopPeriodicSync();
    logger.info('Sync service destroyed');
  }

  /**
   * Record an operation for syncing
   */
  async recordOperation(operation: {
    operation: 'create' | 'update' | 'delete';
    entity: string;
    entityId?: number;
    data: any;
    packingListId: number;
  }) {
    logger.debug('Recording operation', { operation });
    
    // Save to offline storage
    const opId = await offlineStorage.saveOperation({
      ...operation,
      timestamp: Date.now()
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      this.attemptSync();
    }

    return opId;
  }

  /**
   * Attempt to sync pending operations
   */
  attemptSync = async () => {
    // Don't run multiple syncs simultaneously
    if (this.syncInProgress) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    // Skip if offline
    if (!navigator.onLine) {
      logger.debug('Device offline, skipping sync');
      return;
    }

    this.syncInProgress = true;
    logger.debug('Starting sync attempt');

    try {
      const unsynced = await offlineStorage.getUnsynced();

      if (unsynced.length === 0) {
        logger.debug('No pending operations to sync');
        this.syncInProgress = false;
        return;
      }

      logger.info(`Attempting to sync ${unsynced.length} pending operations`);

      // Group operations by packing list for more efficient processing
      const byPackingList = unsynced.reduce((acc, op) => {
        if (!acc[op.packingListId]) {
          acc[op.packingListId] = [];
        }
        acc[op.packingListId].push(op);
        return acc;
      }, {} as Record<number, typeof unsynced>);

      // Process each packing list's operations
      for (const [packingListId, operations] of Object.entries(byPackingList)) {
        const packingListIdNum = parseInt(packingListId);
        
        // Check if we have a WebSocket connection for this packing list
        const isConnected = webSocketService.isConnected();
        
        if (!isConnected) {
          logger.debug(`Not connected to packing list ${packingListId}, trying to connect`);
          // We would need the user ID here, but we can't access hooks in a non-React context
          // In a real implementation, this would need to be handled differently
          continue;
        }

        // Process operations in order
        for (const op of operations) {
          try {
            // Send via WebSocket
            const sent = webSocketService.send({
              type: 'update',
              operation: op.operation,
              entity: op.entity,
              entityId: op.entityId,
              changes: op.data,
              timestamp: op.timestamp
            });

            if (sent) {
              // Mark as synced
              await offlineStorage.markAsSynced(op.id!);
              logger.debug(`Operation ${op.id} synced successfully`);
            } else {
              logger.debug(`Failed to send operation ${op.id}, will retry later`);
            }
          } catch (error) {
            logger.error('Failed to sync operation', { operation: op, error });
            // Continue with next operation
          }
        }
      }

      this.lastSyncTime = Date.now();
      logger.info('Sync completed successfully');
    } catch (error) {
      logger.error('Sync process failed', error);
    } finally {
      this.syncInProgress = false;
    }
  };

  /**
   * Handle online status change
   */
  private handleOnline = () => {
    logger.info('Device back online, triggering sync');
    this.attemptSync();
  };

  /**
   * Handle updates from other clients
   */
  private handleRemoteUpdate = async (data: any) => {
    logger.debug('Received remote update', data);

    // Skip if this is our own update
    // In a real implementation, we would compare user IDs
    // For now, we'll just process all updates
    
    // Apply update to local data
    const { entity, entityId, operation, changes, version, packingListId } = data;

    // Cache the entity with its new version
    if (operation === 'create' || operation === 'update') {
      if (operation === 'create') {
        await offlineStorage.cacheEntity(
          entity,
          entityId,
          changes,
          packingListId,
          version
        );
      } else {
        // For updates, merge with existing data
        const existingData = await offlineStorage.getEntity(entity, entityId);
        await offlineStorage.cacheEntity(
          entity,
          entityId,
          { ...existingData, ...changes },
          packingListId,
          version
        );
      }
    } else if (operation === 'delete') {
      await offlineStorage.deleteEntity(entity, entityId);
    }

    // Invalidate relevant queries
    this.invalidateQueriesForEntity(entity, packingListId);
  };

  /**
   * Invalidate relevant queries when data changes
   */
  private invalidateQueriesForEntity(entity: string, packingListId: number) {
    switch (entity) {
      case 'item':
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/items`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/category`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/bag`] });
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/unassigned/traveler`] });
        break;
      case 'category':
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/categories`] });
        break;
      case 'bag':
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/bags`] });
        break;
      case 'traveler':
        queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}/travelers`] });
        break;
      // Add more entity types as needed
    }

    // Always invalidate the main packing list query
    queryClient.invalidateQueries({ queryKey: [`/api/packing-lists/${packingListId}`] });
  }

  /**
   * Get sync status - used by components to show sync state
   */
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress
    };
  }

  /**
   * Force a sync attempt
   */
  forceSync() {
    return this.attemptSync();
  }
}

// Create singleton instance
export const syncService = new SyncService();

// Initialize on import
syncService.init().catch(error => {
  logger.error('Failed to initialize sync service', error);
});

/**
 * Hook for using the sync service in React components
 */
export function useSyncService() {
  const { isOnline } = useNetwork();
  const { incrementPending, decrementPending } = useSyncStatus();
  const [pendingOperations, setPendingOperations] = useState(0);
  
  // Periodically update the pending operations count
  useEffect(() => {
    let mounted = true;
    
    const updatePendingCount = async () => {
      const count = await offlineStorage.getPendingOperationCount();
      if (mounted) {
        setPendingOperations(count);
      }
    };
    
    // Update immediately
    updatePendingCount();
    
    // Then update every 5 seconds
    const intervalId = setInterval(updatePendingCount, 5000);
    
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  return {
    syncService,
    isOnline,
    pendingOperations,
    syncInProgress: syncService.getSyncStatus().syncInProgress,
    lastSyncTime: syncService.getSyncStatus().lastSyncTime,
    
    // Record an operation and track pending state
    recordOperation: async (operation: Parameters<typeof syncService.recordOperation>[0]) => {
      incrementPending();
      try {
        const result = await syncService.recordOperation(operation);
        return result;
      } finally {
        decrementPending();
      }
    },
    
    // Force a sync attempt
    forceSync: () => syncService.forceSync()
  };
}