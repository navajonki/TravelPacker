# TravelPacker Real-Time Collaboration Implementation Plan

This document outlines the implementation plan for adding real-time collaboration features to TravelPacker, allowing multiple users to work on packing lists simultaneously with offline support.  It's absolutely critical that when new code is added, it should take into account the existing codebase. Where new functions replace old ones, the old ones should be removed. The architecture of the existing application must be carefully taken into consideration. The code snippets in this file are to be taken as suggestions: if in the course of implementation you find a better way to achieve the goals, please use your best judgement.

## Current State Assessment

The application already has several key components that provide a foundation for collaboration:

1. **Collaboration Model**:
   - Database schema for collaborators and invitations
   - UI for inviting collaborators and managing permissions
   - API endpoints for managing collaborators

2. **Network Awareness**:
   - `NetworkContext` to detect online/offline status
   - `OfflineIndicator` component for displaying connection status
   - Connection quality detection

3. **Synchronization Infrastructure**:
   - `useSyncStatus` hook for tracking pending operations
   - `SyncStatusIndicator` component for displaying sync status
   - Optimistic UI updates with rollback capability

4. **Dependencies**:
   - `ws` WebSocket package is already installed
   - Tanstack Query for data fetching and cache management

## Proposed Architecture

We'll implement a WebSocket-based real-time collaboration system with IndexedDB for offline persistence, following a conflict-free replicated data type (CRDT) approach.

### 1. Real-Time Communication Layer

**Server-Side WebSocket Server:**
```typescript
// server/websocket.ts
import WebSocket from 'ws';
import http from 'http';
import { parse } from 'cookie';
import { storage } from './storage';

export function setupWebSocketServer(server: http.Server) {
  const wss = new WebSocket.Server({ noServer: true });

  // Map to track connections by packing list ID
  const rooms = new Map<number, Set<WebSocket>>();

  server.on('upgrade', async (request, socket, head) => {
    // Parse session cookies for authentication
    const cookies = parse(request.headers.cookie || '');
    const sessionId = cookies['connect.sid'];

    if (!sessionId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Verify user session
    const session = await storage.getSession(sessionId);
    if (!session) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, session);
    });
  });

  wss.on('connection', (ws, request, session) => {
    let packingListId: number | null = null;
    const userId = session.userId;

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Handle join room message
        if (data.type === 'join') {
          packingListId = parseInt(data.packingListId);

          // Verify access permission
          const hasAccess = await storage.canUserAccessPackingList(userId, packingListId);
          if (!hasAccess) {
            ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
            return;
          }

          // Add to room
          if (!rooms.has(packingListId)) {
            rooms.set(packingListId, new Set());
          }
          rooms.get(packingListId)?.add(ws);

          // Send acknowledgment
          ws.send(JSON.stringify({ type: 'joined', packingListId }));

          // Broadcast user presence
          broadcastToRoom(packingListId, {
            type: 'presence',
            userId,
            status: 'online',
            timestamp: Date.now()
          }, ws);
        }

        // Handle other message types (updates, etc.)
        else if (data.type === 'update') {
          if (!packingListId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must join a room first' }));
            return;
          }

          // Apply update to database
          const result = await applyUpdate(data, userId);

          // Broadcast to room
          broadcastToRoom(packingListId, {
            type: 'update',
            operation: data.operation,
            entity: data.entity,
            entityId: data.entityId,
            changes: data.changes,
            userId,
            timestamp: Date.now(),
            version: result.version
          }, ws);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (packingListId && rooms.has(packingListId)) {
        rooms.get(packingListId)?.delete(ws);

        // Broadcast user disconnected
        broadcastToRoom(packingListId, {
          type: 'presence',
          userId,
          status: 'offline',
          timestamp: Date.now()
        });

        // Clean up empty rooms
        if (rooms.get(packingListId)?.size === 0) {
          rooms.delete(packingListId);
        }
      }
    });
  });

  function broadcastToRoom(roomId: number, message: any, excludeWs?: WebSocket) {
    const room = rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  async function applyUpdate(data: any, userId: number) {
    // Apply updates to database based on operation type
    switch (data.operation) {
      case 'create':
        return await handleCreateOperation(data, userId);
      case 'update':
        return await handleUpdateOperation(data, userId);
      case 'delete':
        return await handleDeleteOperation(data, userId);
      default:
        throw new Error(`Unknown operation: ${data.operation}`);
    }
  }

  return wss;
}
```

**Client-Side WebSocket Service:**
```typescript
// client/src/services/websocket.ts
import { createLogger } from '@/services/logging';

const logger = createLogger('websocket');

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private packingListId: number | null = null;
  private userId: number | null = null;
  private pendingMessages: WebSocketMessage[] = [];

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  connect(packingListId: number, userId: number) {
    if (this.socket || this.isConnecting) return;

    this.packingListId = packingListId;
    this.userId = userId;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    logger.info('Connecting to WebSocket server', { packingListId });

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = this.handleOpen;
    this.socket.onmessage = this.handleMessage;
    this.socket.onclose = this.handleClose;
    this.socket.onerror = this.handleError;
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.isConnecting = false;
    this.packingListId = null;
    this.userId = null;
  }

  send(message: WebSocketMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }

    // Queue message for when we reconnect
    this.pendingMessages.push(message);
    return false;
  }

  subscribe(messageType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)?.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  private handleOpen = () => {
    logger.info('WebSocket connection established');
    this.isConnecting = false;

    // Join room
    if (this.packingListId) {
      this.send({
        type: 'join',
        packingListId: this.packingListId,
        userId: this.userId
      });
    }

    // Send any pending messages
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) this.send(message);
    }
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      logger.debug('WebSocket message received', { type: data.type });

      // Notify all handlers for this message type
      const handlers = this.messageHandlers.get(data.type);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }

      // Also notify 'all' handlers
      const allHandlers = this.messageHandlers.get('all');
      if (allHandlers) {
        allHandlers.forEach(handler => handler(data));
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message', error);
    }
  };

  private handleClose = (event: CloseEvent) => {
    logger.warn('WebSocket connection closed', { code: event.code, reason: event.reason });
    this.socket = null;
    this.isConnecting = false;

    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect();
    }
  };

  private handleError = (event: Event) => {
    logger.error('WebSocket error', event);
    // Error handling is followed by onclose, so reconnection will be handled there
  };

  private handleOnline = () => {
    if (this.packingListId && !this.socket && !this.isConnecting) {
      logger.info('Network back online, reconnecting WebSocket');
      this.connect(this.packingListId, this.userId!);
    }
  };

  private handleOffline = () => {
    logger.warn('Network offline, WebSocket will disconnect');
    // We don't force close here, let the browser do it
  };

  private scheduleReconnect() {
    // Exponential backoff
    const delay = Math.min(5000, 1000 * Math.pow(2, Math.min(this.reconnectAttempts, 5)));

    logger.info('Scheduling WebSocket reconnect', { delay });

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(() => {
      if (this.packingListId && navigator.onLine) {
        logger.info('Attempting to reconnect WebSocket');
        this.connect(this.packingListId, this.userId!);
      }
    }, delay);
  }

  // Counter for reconnection attempts to implement exponential backoff
  private reconnectAttempts = 0;
}

// Create singleton instance
export const webSocketService = new WebSocketService();
```

### 2. Offline Data Persistence with IndexedDB

```typescript
// client/src/services/offlineStorage.ts
import { createLogger } from '@/services/logging';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const logger = createLogger('offlineStorage');

interface TravelPackDB extends DBSchema {
  operations: {
    key: number;
    value: {
      id?: number;
      operation: 'create' | 'update' | 'delete';
      entity: string;
      entityId?: number;
      data: any;
      timestamp: number;
      synced: boolean;
      packingListId: number;
    };
    indexes: { 'by-synced': boolean, 'by-packing-list': number };
  };
  entities: {
    key: string; // `${entity}:${id}`
    value: {
      id: number;
      entity: string;
      data: any;
      lastModified: number;
      packingListId: number;
      version: number;
    };
    indexes: { 'by-entity': string, 'by-packing-list': number };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<TravelPackDB> | null = null;

  async init() {
    try {
      this.db = await openDB<TravelPackDB>('travel-pack', 1, {
        upgrade(db) {
          // Operations store
          const operationsStore = db.createObjectStore('operations', {
            keyPath: 'id',
            autoIncrement: true
          });
          operationsStore.createIndex('by-synced', 'synced');
          operationsStore.createIndex('by-packing-list', 'packingListId');

          // Entities store
          const entitiesStore = db.createObjectStore('entities', {
            keyPath: 'id'
          });
          entitiesStore.createIndex('by-entity', 'entity');
          entitiesStore.createIndex('by-packing-list', 'packingListId');
        }
      });

      logger.info('IndexedDB initialized');
      return true;
    } catch (error) {
      logger.error('Failed to initialize IndexedDB', error);
      return false;
    }
  }

  async saveOperation(operation: Omit<TravelPackDB['operations']['value'], 'id' | 'synced'>) {
    if (!this.db) await this.init();

    try {
      const id = await this.db!.add('operations', {
        ...operation,
        synced: false
      });

      logger.debug('Operation saved to offline storage', { id, operation });
      return id;
    } catch (error) {
      logger.error('Failed to save operation to offline storage', error);
      throw error;
    }
  }

  async getUnsynced(packingListId?: number) {
    if (!this.db) await this.init();

    try {
      let operations;

      if (packingListId) {
        const tx = this.db!.transaction('operations', 'readonly');
        const index = tx.store.index('by-packing-list');
        operations = await index.getAll(packingListId);
        await tx.done;
      } else {
        operations = await this.db!.getAllFromIndex('operations', 'by-synced', false);
      }

      operations.sort((a, b) => a.timestamp - b.timestamp);

      logger.debug('Retrieved unsynced operations', { count: operations.length });
      return operations;
    } catch (error) {
      logger.error('Failed to get unsynced operations', error);
      return [];
    }
  }

  async markAsSynced(id: number) {
    if (!this.db) await this.init();

    try {
      const tx = this.db!.transaction('operations', 'readwrite');
      const operation = await tx.store.get(id);

      if (operation) {
        operation.synced = true;
        await tx.store.put(operation);
      }

      await tx.done;
      logger.debug('Operation marked as synced', { id });
    } catch (error) {
      logger.error('Failed to mark operation as synced', error);
    }
  }

  async cacheEntity(entity: string, id: number, data: any, packingListId: number, version: number) {
    if (!this.db) await this.init();

    try {
      const key = `${entity}:${id}`;

      await this.db!.put('entities', {
        id: key,
        entity,
        data,
        lastModified: Date.now(),
        packingListId,
        version
      });

      logger.debug('Entity cached', { entity, id });
    } catch (error) {
      logger.error('Failed to cache entity', error);
    }
  }

  async getEntity(entity: string, id: number) {
    if (!this.db) await this.init();

    try {
      const key = `${entity}:${id}`;
      const result = await this.db!.get('entities', key);
      return result?.data || null;
    } catch (error) {
      logger.error('Failed to get entity from cache', error);
      return null;
    }
  }

  async getAllEntities(entity: string, packingListId: number) {
    if (!this.db) await this.init();

    try {
      const tx = this.db!.transaction('entities', 'readonly');
      const packingListIndex = tx.store.index('by-packing-list');
      const allEntities = await packingListIndex.getAll(packingListId);
      await tx.done;

      // Filter by entity type
      return allEntities
        .filter(item => item.entity === entity)
        .map(item => item.data);
    } catch (error) {
      logger.error('Failed to get all entities from cache', error);
      return [];
    }
  }

  async deleteEntity(entity: string, id: number) {
    if (!this.db) await this.init();

    try {
      const key = `${entity}:${id}`;
      await this.db!.delete('entities', key);
      logger.debug('Entity deleted from cache', { entity, id });
    } catch (error) {
      logger.error('Failed to delete entity from cache', error);
    }
  }

  async clearCache(packingListId?: number) {
    if (!this.db) await this.init();

    try {
      if (packingListId) {
        // Delete all entities for this packing list
        const tx = this.db!.transaction('entities', 'readwrite');
        const index = tx.store.index('by-packing-list');
        const keys = await index.getAllKeys(packingListId);

        for (const key of keys) {
          await tx.store.delete(key);
        }

        await tx.done;
      } else {
        // Clear entire cache
        await this.db!.clear('entities');
      }

      logger.info('Cache cleared', { packingListId: packingListId || 'all' });
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }
}

export const offlineStorage = new OfflineStorage();
```

### 3. Synchronization Service

```typescript
// client/src/services/syncService.ts
import { offlineStorage } from './offlineStorage';
import { webSocketService } from './websocket';
import { createLogger } from '@/services/logging';
import { useNetwork } from '@/contexts/NetworkContext';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { queryClient } from '@/lib/queryClient';

const logger = createLogger('sync');

class SyncService {
  private syncInProgress = false;
  private lastSyncTime = 0;

  // Initialize the sync service
  async init() {
    // Listen for online events to trigger sync
    window.addEventListener('online', this.handleOnline);

    // Initialize offline storage
    await offlineStorage.init();

    // Periodic sync attempt (every 30 seconds)
    setInterval(this.attemptSync, 30000);

    // Listen for messages from WebSocket service
    webSocketService.subscribe('update', this.handleRemoteUpdate);
  }

  // Record an operation
  async recordOperation(operation: {
    operation: 'create' | 'update' | 'delete';
    entity: string;
    entityId?: number;
    data: any;
    packingListId: number;
  }) {
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

  // Attempt to sync pending operations
  private attemptSync = async () => {
    // Don't run multiple syncs simultaneously
    if (this.syncInProgress) return;

    // Skip if offline
    if (!navigator.onLine) return;

    this.syncInProgress = true;

    try {
      const unsynced = await offlineStorage.getUnsynced();

      if (unsynced.length === 0) {
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
        // Ensure we're connected to this packing list's room
        webSocketService.connect(parseInt(packingListId), /* userId from auth context */);

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
            }
          } catch (error) {
            logger.error('Failed to sync operation', { operation: op, error });
            // Continue with next operation
          }
        }
      }

      this.lastSyncTime = Date.now();
    } catch (error) {
      logger.error('Sync process failed', error);
    } finally {
      this.syncInProgress = false;
    }
  };

  // Handle online status change
  private handleOnline = () => {
    logger.info('Device back online, triggering sync');
    this.attemptSync();
  };

  // Handle updates from other clients
  private handleRemoteUpdate = async (data: any) => {
    logger.debug('Received remote update', data);

    // Skip if this is our own update
    if (data.userId === /* current user ID */) return;

    // Apply update to local data
    const { entity, entityId, operation, changes, version } = data;

    // Cache the entity with its new version
    if (operation === 'update' || operation === 'create') {
      await offlineStorage.cacheEntity(
        entity,
        entityId,
        operation === 'create' ? changes : { ...await offlineStorage.getEntity(entity, entityId), ...changes },
        data.packingListId,
        version
      );
    } else if (operation === 'delete') {
      await offlineStorage.deleteEntity(entity, entityId);
    }

    // Invalidate relevant queries
    this.invalidateQueriesForEntity(entity, data.packingListId);
  };

  // Invalidate relevant queries when data changes
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

  // Get sync status - used by components to show sync state
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress
    };
  }
}

export const syncService = new SyncService();
```

### 4. Enhanced UI Components for Collaboration

```typescript
// client/src/components/CollaborationPresence.tsx
import { useState, useEffect } from 'react';
import { webSocketService } from '@/services/websocket';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CollaboratorPresence {
  userId: number;
  username: string;
  status: 'online' | 'offline';
  lastActive: number;
}

interface CollaborationPresenceProps {
  packingListId: number;
}

export default function CollaborationPresence({ packingListId }: CollaborationPresenceProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);

  useEffect(() => {
    // Connect to WebSocket for this packing list
    webSocketService.connect(packingListId, /* userId from auth context */);

    // Handle presence updates
    const unsubscribe = webSocketService.subscribe('presence', (data) => {
      setCollaborators(prev => {
        // Find existing collaborator
        const index = prev.findIndex(c => c.userId === data.userId);

        if (index >= 0) {
          // Update existing
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            status: data.status,
            lastActive: data.timestamp
          };
          return updated;
        } else {
          // Add new
          return [...prev, {
            userId: data.userId,
            username: data.username || `User ${data.userId}`,
            status: data.status,
            lastActive: data.timestamp
          }];
        }
      });
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, [packingListId]);

  // Only show online collaborators
  const onlineCollaborators = collaborators.filter(c => c.status === 'online');

  if (onlineCollaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex -space-x-2 overflow-hidden p-2">
      <TooltipProvider>
        {onlineCollaborators.map(collaborator => (
          <Tooltip key={collaborator.userId}>
            <TooltipTrigger asChild>
              <Avatar className="border-2 border-background inline-block">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {collaborator.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{collaborator.username} is online</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}
```

### 5. Integration with Existing React Query Setup

```typescript
// client/src/hooks/useCollaborativeOperation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/services/logging';

const logger = createLogger('collaborativeOp');

interface OperationOptions {
  entity: string;
  packingListId: number;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useCollaborativeOperation<T = any, TVariables = any>({
  entity,
  packingListId,
  onSuccess,
  onError
}: OperationOptions) {
  const { incrementPending, decrementPending } = useSyncStatus();
  const { isOnline } = useNetwork();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create mutation
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

        // If online, this will be synced immediately
        // If offline, it will be queued for later

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
      // Optimistic update logic
      // This depends on the entity type, so we'll need to be specific

      // For example, if creating an item:
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

      // Revert optimistic update if we have context
      if (context && entity === 'item') {
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
      }

      // Call custom error handler if provided
      onError?.(error);
    },
    onSuccess: (data) => {
      // If we're offline, show a message that changes will sync later
      if (!isOnline) {
        toast({
          title: 'Offline Changes',
          description: `Changes will be synchronized when you're back online.`,
          variant: 'default'
        });
      }

      // Call custom success handler
      onSuccess?.(data);
    }
  });

  // Update mutation
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
        // Similar optimistic update logic as for create
        // But this time we update an existing item
        const previousItems = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);

        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], (old: any[] = []) => {
          return old.map(item =>
            item.id === id ? { ...item, ...data } : item
          );
        });

        return { previousItems };
      }

      return {};
    },
    // Similar error and success handlers as create
    onError: (error, variables, context: any) => {
      // Revert optimistic update
      if (context && entity === 'item') {
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
      }

      // Error toast and callback
      onError?.(error);
    },
    onSuccess: onSuccess
  });

  // Delete mutation
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
        const previousItems = queryClient.getQueryData([`/api/packing-lists/${packingListId}/items`]);

        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], (old: any[] = []) => {
          return old.filter(item => item.id !== id);
        });

        return { previousItems };
      }

      return {};
    },
    // Similar error and success handlers
    onError: (error, variables, context: any) => {
      if (context && entity === 'item') {
        queryClient.setQueryData([`/api/packing-lists/${packingListId}/items`], context.previousItems);
      }

      onError?.(error);
    },
    onSuccess
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
```

## Implementation Plan

### Phase 1: Server-Side WebSocket Setup (Estimated: 1 week)

- [x] Implement WebSocket server in Express
- [x] Add room-based communication
- [x] Add authentication middleware
- [x] Create event handlers for operations

#### Progress Notes for Phase 1

1. **WebSocket Server Implementation**:
   - Created a new file `server/websocket.ts` that implements the WebSocket server
   - Used the `ws` package which was already in the dependencies
   - Implemented the server using the "noServer" option to integrate with the existing HTTP server
   - Added room-based communication for packing list collaboration

2. **Authentication & Security**:
   - Added session-based authentication by parsing cookies from the upgrade request
   - Implemented access control to verify users can only join rooms for packing lists they have access to
   - Set up proper error handling for authentication failures

3. **Room Management**:
   - Implemented a room system where each packing list has its own collaboration room
   - Added tracking of users joining and leaving rooms
   - Implemented cleanup of empty rooms to prevent memory leaks

4. **Event Handling**:
   - Created handlers for different message types: 'join', 'update'
   - Implemented presence notifications when users connect/disconnect
   - Set up broadcasting mechanism to relay changes to all users in a room
   - Added placeholder implementations for create/update/delete operations

5. **Integration with Express**:
   - Updated `server/index.ts` to initialize the WebSocket server
   - Integrated WebSocket server with the existing HTTP server

6. **Next Steps**:
   - Implement actual database operations in the event handlers
   - Enhance logging and error handling
   - Add more sophisticated session handling

### Phase 2: Client-Side Infrastructure (Estimated: 1 week)

- [x] Add IDB dependency to package.json
- [x] Implement WebSocket service
- [x] Create IndexedDB storage service
- [x] Develop synchronization service
- [x] Add collaborative mutation hooks

#### Progress Notes for Phase 2

1. **Dependencies**:
   - Added the `idb` package to project dependencies for IndexedDB access
   - This complements the existing `ws` package already in the project

2. **WebSocket Service**:
   - Created a client-side WebSocket service in `client/src/services/websocket.ts`
   - Implemented connection management with automatic reconnection
   - Added event handling for different message types
   - Implemented room-based communication for packing lists
   - Created a React hook (`useWebSocket`) for components to interact with the service

3. **IndexedDB Storage**:
   - Implemented `client/src/services/offlineStorage.ts` using the IDB library
   - Created schema for operations and entities
   - Added methods for storing and retrieving data
   - Implemented operation tracking for offline changes
   - Added entity caching for offline access

4. **Synchronization Service**:
   - Created `client/src/services/syncService.ts` to tie WebSocket and IndexedDB together
   - Implemented bidirectional sync between server and client
   - Added periodic sync attempts with exponential backoff
   - Implemented handling of remote updates
   - Created integration with React Query for cache invalidation
   - Added React hook (`useSyncService`) for components

5. **Collaborative Mutation Hooks**:
   - Implemented `client/src/hooks/useCollaborativeMutation.ts`
   - Created hooks for create, update, and delete operations
   - Added optimistic updates for common entity types
   - Implemented error handling with rollbacks
   - Integrated with sync status indicators

6. **Integration with Existing Infrastructure**:
   - Leveraged existing `NetworkContext` for online/offline detection
   - Used existing `SyncStatusProvider` for tracking pending operations
   - Integrated with React Query for cache management
   - Utilized existing toast notifications for user feedback

7. **Next Steps**:
   - Create UI components for real-time collaboration
   - Implement presence indicators
   - Test the system with multiple users
   - Add conflict resolution for concurrent edits

### Phase 3: UI Enhancements (Estimated: 1 week)

- [x] Add presence indicators for active collaborators
- [x] Enhance SyncStatusIndicator to show offline queued changes
- [ ] Add conflict resolution UI when needed
- [ ] Update PackingList components to use collaborative hooks

#### Progress Notes for Phase 3

1. **CollaborationPresence Component**:
   - Created a new component in `client/src/components/CollaborationPresence.tsx`
   - Displays avatars of active collaborators in a packing list
   - Shows online status with color indicators
   - Includes tooltips with user status information
   - Handles WebSocket presence events

2. **Enhanced SyncStatusIndicator**:
   - Updated the existing component in `client/src/components/SyncStatusIndicator.tsx`
   - Added support for showing offline status and pending changes
   - Implemented different visual states for various sync conditions
   - Added tooltips with detailed status information
   - Integrated with the sync service to show pending operation count

3. **Next Steps**:
   - Implement conflict resolution UI for concurrent edits
   - Update PackingList components to use the collaborative mutation hooks
   - Add visual indicators for items being edited by other users

### Phase 4: Testing and Refinement (Estimated: 1 week)

- [ ] Test various network conditions
- [ ] Verify offline-to-online synchronization
- [ ] Test multiple concurrent users
- [ ] Implement error recovery mechanisms
- [ ] Performance optimization

## Additional Considerations

### Version Vector Conflict Resolution

We'll implement a simple version vector (per entity) to track changes:
- Each client maintains a vector clock of last seen changes
- Server resolves conflicts using last-write-wins with vector comparison

### Bandwidth Optimization

- Batch small changes when possible
- Compress WebSocket messages
- Only sync changes since last sync point

### Security Considerations

- Validate all operations against user permissions
- Encrypt sensitive data in IndexedDB
- Implement rate limiting on WebSocket connections

### Progressive Enhancement

- Design the system to work with or without WebSockets
- Allow REST fallback when WebSockets are unavailable
- Provide clear indicators of connection status

## Integration with Existing Components

This implementation leverages the following existing components:

1. `NetworkContext` - For detecting online/offline status
2. `SyncStatusIndicator` - To show sync status to users
3. `useSyncStatus` - For tracking pending operations
4. React Query - For data fetching and cache management

## Dependencies to Add

- `idb` - For IndexedDB access (already have ws for WebSockets)

## Testing Strategy

1. Unit tests for each service
2. Integration tests for WebSocket communication
3. End-to-end tests for offline-to-online synchronization
4. Manual testing across different devices and network conditions

## Success Criteria

- Multiple users can edit the same packing list simultaneously
- Changes sync automatically in real-time when online
- Users can make changes offline that sync when reconnected
- Conflicts are resolved with minimal data loss
- UI provides clear indication of connection and sync status
