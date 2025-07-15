import { createLogger } from './logging';
import { useAuth } from '@/hooks/use-auth';

const logger = createLogger('websocket');

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type MessageHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private packingListId: number | null = null;
  private userId: number | null = null;
  private pendingMessages: WebSocketMessage[] = [];
  private reconnectAttempts = 0;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Connect to the WebSocket server for a specific packing list
   */
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

  /**
   * Disconnect from the WebSocket server
   */
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

  /**
   * Send a message to the WebSocket server
   * If the connection is not open, the message will be queued
   */
  send(message: WebSocketMessage): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      logger.debug('Sent WebSocket message', { type: message.type });
      return true;
    }

    // Queue message for when we reconnect
    logger.debug('Queuing WebSocket message for later', { type: message.type });
    this.pendingMessages.push(message);
    return false;
  }

  /**
   * Subscribe to messages of a specific type
   * Returns an unsubscribe function
   */
  subscribe(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }

    this.messageHandlers.get(messageType)?.add(handler);
    logger.debug(`Subscribed to message type: ${messageType}`);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
        logger.debug(`Unsubscribed from message type: ${messageType}`);
      }
    };
  }

  /**
   * Check if we're currently connected
   */
  isConnected(): boolean {
    return !!this.socket && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Get the current connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' | 'none' {
    if (!this.socket) return 'none';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'none';
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen = () => {
    logger.info('WebSocket connection established');
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    // Join room
    if (this.packingListId !== null && this.userId !== null) {
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

  /**
   * Handle WebSocket message event
   */
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

  /**
   * Handle WebSocket close event
   */
  private handleClose = (event: CloseEvent) => {
    logger.warn('WebSocket connection closed', { code: event.code, reason: event.reason });
    this.socket = null;
    this.isConnecting = false;

    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000 && event.code !== 1001) {
      this.scheduleReconnect();
    }
  };

  /**
   * Handle WebSocket error event
   */
  private handleError = (event: Event) => {
    logger.error('WebSocket error', event);
    // Error handling is followed by onclose, so reconnection will be handled there
  };

  /**
   * Handle online event
   */
  private handleOnline = () => {
    if (this.packingListId && !this.socket && !this.isConnecting) {
      logger.info('Network back online, reconnecting WebSocket');
      if (this.userId !== null) {
        this.connect(this.packingListId, this.userId);
      }
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    logger.warn('Network offline, WebSocket will disconnect');
    // We don't force close here, let the browser do it
  };

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect() {
    this.reconnectAttempts++;
    // Exponential backoff with max delay of 60 seconds (increased from 30)
    const delay = Math.min(60000, 2000 * Math.pow(2, Math.min(this.reconnectAttempts, 5)));

    logger.info('Scheduling WebSocket reconnect', { delay, attempt: this.reconnectAttempts });

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(() => {
      if (this.packingListId && navigator.onLine && this.userId !== null) {
        logger.info('Attempting to reconnect WebSocket');
        this.connect(this.packingListId, this.userId);
      }
    }, delay);
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

/**
 * Hook to access the WebSocket service
 */
export function useWebSocket() {
  const { user } = useAuth();
  
  return {
    service: webSocketService,
    connect: (packingListId: number) => {
      if (user && user.id) {
        webSocketService.connect(packingListId, user.id);
      } else {
        logger.warn('Cannot connect to WebSocket: User not authenticated');
      }
    },
    disconnect: () => webSocketService.disconnect(),
    send: (message: WebSocketMessage) => webSocketService.send(message),
    subscribe: (messageType: string, handler: MessageHandler) => 
      webSocketService.subscribe(messageType, handler),
    isConnected: () => webSocketService.isConnected(),
    getState: () => webSocketService.getState()
  };
}