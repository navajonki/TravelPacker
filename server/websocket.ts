import WebSocket from 'ws';
import http from 'http';
import { parse } from 'cookie';
import { storage } from './storage';
import { createLogger } from './fileLogger';

const logger = createLogger('websocket');

export function setupWebSocketServer(server: http.Server) {
  const wss = new WebSocket.Server({ noServer: true });

  // Map to track connections by packing list ID
  const rooms = new Map<number, Set<WebSocket>>();

  server.on('upgrade', async (request, socket, head) => {
    // Parse session cookies for authentication
    const cookies = parse(request.headers.cookie || '');
    const sessionId = cookies['connect.sid'];

    if (!sessionId) {
      logger.warn('WebSocket connection attempt without session ID');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      // Verify user session (simplified - actual implementation will depend on your session store)
      // In a real implementation, you would get the session data and extract the user ID
      const userId = await getUserIdFromSession(sessionId);
      
      if (!userId) {
        logger.warn('WebSocket connection attempt with invalid session');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // If we reach here, the connection is authorized
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, userId);
      });
    } catch (error) {
      logger.error('Error during WebSocket authentication', error);
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    }
  });

  wss.on('connection', (ws, request, userId) => {
    let packingListId: number | null = null;
    logger.info(`WebSocket connection established for user ${userId}`);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.debug(`Received message: ${JSON.stringify(data)}`);

        // Handle join room message
        if (data.type === 'join') {
          packingListId = parseInt(data.packingListId);

          // Verify access permission
          const hasAccess = await storage.canUserAccessPackingList(userId, packingListId);
          if (!hasAccess) {
            logger.warn(`User ${userId} attempted to join room ${packingListId} without permission`);
            ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
            return;
          }

          // Add to room
          if (!rooms.has(packingListId)) {
            rooms.set(packingListId, new Set());
          }
          rooms.get(packingListId)?.add(ws);

          // Send acknowledgment
          ws.send(JSON.stringify({ 
            type: 'joined', 
            packingListId,
            userId
          }));

          logger.info(`User ${userId} joined room ${packingListId}`);

          // Broadcast user presence
          broadcastToRoom(packingListId, {
            type: 'presence',
            userId,
            status: 'online',
            timestamp: Date.now()
          }, ws);
        }

        // Handle update messages
        else if (data.type === 'update') {
          if (!packingListId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Must join a room first' }));
            return;
          }

          // Verify the user still has access
          const hasAccess = await storage.canUserAccessPackingList(userId, packingListId);
          if (!hasAccess) {
            logger.warn(`User ${userId} attempted to update in room ${packingListId} without permission`);
            ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
            return;
          }

          // Apply update to database based on operation type
          const result = await applyUpdate(data, userId, packingListId);

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

          logger.info(`User ${userId} sent update in room ${packingListId}: ${data.operation} on ${data.entity} ${data.entityId}`);
        }
      } catch (error) {
        logger.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (packingListId && rooms.has(packingListId)) {
        rooms.get(packingListId)?.delete(ws);
        logger.info(`User ${userId} disconnected from room ${packingListId}`);

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
          logger.debug(`Removed empty room ${packingListId}`);
        }
      }
    });
  });

  function broadcastToRoom(roomId: number, message: any, excludeWs?: WebSocket) {
    const room = rooms.get(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        sentCount++;
      }
    });

    logger.debug(`Broadcast message to ${sentCount} clients in room ${roomId}`);
  }

  async function applyUpdate(data: any, userId: number, packingListId: number) {
    // This is a placeholder implementation. In a real app, you would:
    // 1. Validate the operation
    // 2. Apply it to your database
    // 3. Return the result with a version number for conflict resolution

    logger.debug(`Applying update: ${JSON.stringify(data)}`);
    
    // Placeholder for version tracking
    const version = Date.now();

    // Apply updates to database based on operation type
    switch (data.operation) {
      case 'create':
        return await handleCreateOperation(data, userId, packingListId, version);
      case 'update':
        return await handleUpdateOperation(data, userId, packingListId, version);
      case 'delete':
        return await handleDeleteOperation(data, userId, packingListId, version);
      default:
        throw new Error(`Unknown operation: ${data.operation}`);
    }
  }

  // Temporary function to extract user ID from session
  // In a real implementation, this would use your session store
  async function getUserIdFromSession(sessionId: string): Promise<number | null> {
    // This is a placeholder. In a real implementation, you would:
    // 1. Parse the session ID from the cookie format
    // 2. Look up the session in your session store
    // 3. Extract and return the user ID
    
    // For now, we'll assume a valid session and return a dummy user ID
    // This should be replaced with actual session validation
    try {
      // Placeholder implementation
      return 1; // Return a dummy user ID for now
    } catch (error) {
      logger.error('Error getting user ID from session', error);
      return null;
    }
  }

  // Handlers for different operation types
  async function handleCreateOperation(data: any, userId: number, packingListId: number, version: number) {
    // Implementation depends on your entity types and storage layer
    logger.debug(`Create operation for ${data.entity}`);
    
    // This is a placeholder. In a real implementation, you would create the entity in your database.
    return { success: true, version };
  }

  async function handleUpdateOperation(data: any, userId: number, packingListId: number, version: number) {
    // Implementation depends on your entity types and storage layer
    logger.debug(`Update operation for ${data.entity} ${data.entityId}`);
    
    // This is a placeholder. In a real implementation, you would update the entity in your database.
    return { success: true, version };
  }

  async function handleDeleteOperation(data: any, userId: number, packingListId: number, version: number) {
    // Implementation depends on your entity types and storage layer
    logger.debug(`Delete operation for ${data.entity} ${data.entityId}`);
    
    // This is a placeholder. In a real implementation, you would delete the entity from your database.
    return { success: true, version };
  }

  return wss;
}