import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { parse } from 'cookie';
import { storage } from './storage';
import { logDebug } from './fileLogger';

// Create a simple logger object using the logDebug function
const logger = {
  info: (message: string, data?: any) => logDebug('websocket', message, data),
  error: (message: string, error?: any, context?: any) => logDebug('websocket', `ERROR: ${message}`, { error, context }),
  warn: (message: string, data?: any) => logDebug('websocket', `WARNING: ${message}`, data),
  debug: (message: string, data?: any) => logDebug('websocket', message, data)
};

export function setupWebSocketServer(server: http.Server) {
  // Create a simpler WebSocket server attached directly to the HTTP server
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  // Map to track connections by packing list ID
  const rooms = new Map<number, Set<WebSocket>>();

  wss.on('connection', (ws, req) => {
    let userId: number | null = null;
    let packingListId: number | null = null;
    
    // Extract user ID from session (simplified approach)
    // In a real app, you'd properly parse the session cookie
    // For now, we'll get it from the join message
    
    logger.info(`WebSocket connection established for user ${userId}`);

    // Send welcome message to confirm connection
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to WebSocket server',
      timestamp: Date.now()
    }));

    ws.on('message', async (rawMessage) => {
      try {
        // Make sure to properly parse the message
        const messageString = rawMessage.toString();
        logger.debug(`Received raw message: ${messageString}`);
        
        const data = JSON.parse(messageString);
        logger.debug(`Parsed message data: ${JSON.stringify(data)}`);

        // Handle join room message
        if (data.type === 'join') {
          packingListId = parseInt(data.packingListId);
          userId = data.userId || 1; // Get user ID from the message
          
          if (isNaN(packingListId)) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid packing list ID' 
            }));
            return;
          }

          try {
            // Verify access permission
            if (!userId) {
              logger.warn(`No user ID provided for room ${packingListId}`);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'User ID required' 
              }));
              return;
            }
            
            const hasAccess = await storage.canUserAccessPackingList(userId, packingListId);
            if (!hasAccess) {
              logger.warn(`User ${userId} attempted to join room ${packingListId} without permission`);
              ws.send(JSON.stringify({ 
                type: 'error', 
                message: 'Access denied' 
              }));
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
              userId,
              timestamp: Date.now()
            }));

            logger.info(`User ${userId} joined room ${packingListId}`);
          } catch (error) {
            logger.error('Error handling join request', error);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Server error processing join request' 
            }));
          }
        }
        // Handle other message types as needed
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
        // Send a simple error message to avoid complex serialization
        try {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        } catch (sendError) {
          logger.error('Error sending error message:', sendError);
        }
      }
    });

    ws.on('close', () => {
      if (packingListId && rooms.has(packingListId)) {
        // Remove from room
        rooms.get(packingListId)?.delete(ws);
        logger.info(`User ${userId} disconnected from room ${packingListId}`);
        
        // Clean up empty rooms
        if (rooms.get(packingListId)?.size === 0) {
          rooms.delete(packingListId);
          logger.debug(`Removed empty room ${packingListId}`);
        }
      }
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  // Function to broadcast messages to all clients in a room
  function broadcastToRoom(packingListId: number, message: any) {
    const room = rooms.get(packingListId);
    if (room) {
      const messageString = JSON.stringify(message);
      logger.debug(`Broadcasting to room ${packingListId}: ${messageString}`);
      
      room.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        }
      });
    }
  }

  // Store the broadcast function globally for export
  globalBroadcastFunction = broadcastToRoom;

  return wss;
}

// Global variable to store the broadcast function
let globalBroadcastFunction: ((packingListId: number, message: any) => void) | null = null;

// Export the broadcast function
export function broadcastToRoom(packingListId: number, message: any) {
  if (globalBroadcastFunction) {
    globalBroadcastFunction(packingListId, message);
  }
}