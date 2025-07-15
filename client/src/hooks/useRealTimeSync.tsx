/**
 * Real-time synchronization hook for collaborative packing lists
 * This ensures all collaborators see changes instantly
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User } from '@shared/schema';
import { useBatchedInvalidation, getQueryKeysForOperation } from '@/lib/batchedInvalidation';

interface SyncMessage {
  type: 'item_update' | 'item_create' | 'item_delete';
  packingListId: number;
  userId: number;
  data: any;
}

export function useRealTimeSync(packingListId: number, user: User | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { batchInvalidate } = useBatchedInvalidation();
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
        // Subscribe to this packing list's updates with user ID
        ws.send(JSON.stringify({
          type: 'join',
          packingListId: packingListId,
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: SyncMessage = JSON.parse(event.data);
          
          // Use batched invalidation system to reduce performance impact
          // Skip invalidation for own changes to avoid unnecessary work
          if (message.userId === user?.id) {
            return;
          }
          
          // Handle different types of updates with batched invalidation
          switch (message.type) {
            // Item-related changes
            case 'item_updated':
            case 'item_created':
            case 'item_deleted':
            case 'item_update':
            case 'item_create':
            case 'item_delete':
              batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'item'));
              console.log(`Batched invalidation for item change in list ${packingListId}`);
              break;
              
            // Category-related changes
            case 'category_created':
            case 'category_updated':
            case 'category_deleted':
              batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'category'));
              console.log(`Batched invalidation for category change in list ${packingListId}`);
              break;
              
            // Bag-related changes
            case 'bag_created':
            case 'bag_updated':
            case 'bag_deleted':
              batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'bag'));
              console.log(`Batched invalidation for bag change in list ${packingListId}`);
              break;
              
            // Traveler-related changes
            case 'traveler_created':
            case 'traveler_updated':
            case 'traveler_deleted':
              batchInvalidate(packingListId, getQueryKeysForOperation(packingListId, 'traveler'));
              console.log(`Batched invalidation for traveler change in list ${packingListId}`);
              break;
              
            default:
              console.log(`Unknown message type: ${message.type}`);
          }
          
          // Show a notification for remote changes
          toast({
            title: "Update from collaborator",
            description: "Another user made changes to the packing list",
            variant: "default"
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Real-time sync disconnected');
        // Attempt to reconnect after 5 seconds (reduced frequency)
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
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