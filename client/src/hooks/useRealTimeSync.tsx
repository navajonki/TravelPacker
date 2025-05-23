/**
 * Real-time synchronization hook for collaborative packing lists
 * This ensures all collaborators see changes instantly
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';

interface SyncMessage {
  type: 'item_update' | 'item_create' | 'item_delete';
  packingListId: number;
  userId: number;
  data: any;
}

export function useRealTimeSync(packingListId: number, user: User | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket server
  const connect = () => {
    if (!packingListId || !user) return;

    try {
      // Get the correct WebSocket URL for the current environment
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;
      
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Real-time sync connected');
        // Subscribe to this packing list's updates
        ws.send(JSON.stringify({
          type: 'join',
          packingListId: packingListId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          
          // Only process updates from other users
          if (message.userId === user.id) return;
          
          // Handle different types of updates
          switch (message.type) {
            case 'item_update':
            case 'item_create':
            case 'item_delete':
              // Invalidate relevant queries to refresh the UI
              queryClient.invalidateQueries({ 
                queryKey: [`/api/packing-lists/${packingListId}/categories`] 
              });
              queryClient.invalidateQueries({ 
                queryKey: [`/api/packing-lists/${packingListId}/all-items`] 
              });
              
              // Show a notification
              toast({
                title: "Update from collaborator",
                description: "Another user made changes to the packing list",
                variant: "default"
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Real-time sync disconnected');
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to real-time sync:', error);
    }
  };

  // Send update to other collaborators
  const sendUpdate = (type: SyncMessage['type'], data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(JSON.stringify({
        type,
        packingListId,
        userId: user.id,
        data
      }));
    }
  };

  // Set up connection when component mounts
  useEffect(() => {
    connect();

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [packingListId, user?.id]);

  return { sendUpdate };
}