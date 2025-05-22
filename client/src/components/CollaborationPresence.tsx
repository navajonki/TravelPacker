import { useState, useEffect } from 'react';
import { webSocketService } from '@/services/websocket';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createLogger } from '@/services/logging';
import { useAuth } from '@/hooks/use-auth';

const logger = createLogger('presence');

interface CollaboratorPresence {
  userId: number;
  username: string;
  status: 'online' | 'offline' | 'idle';
  lastActive: number;
}

interface CollaborationPresenceProps {
  packingListId: number;
}

/**
 * Component that displays avatars of active collaborators on the current packing list
 */
export default function CollaborationPresence({ packingListId }: CollaborationPresenceProps) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!packingListId || !user) {
      return;
    }

    logger.debug('Setting up presence tracking for packing list', { packingListId });

    // Connect to WebSocket for this packing list if not already connected
    const wsState = webSocketService.getState();
    if (wsState !== 'open') {
      webSocketService.connect(packingListId, user.id);
    }

    // Handle presence updates
    const unsubscribe = webSocketService.subscribe('presence', (data) => {
      logger.debug('Received presence update', { data });
      setCollaborators(prev => {
        // Find existing collaborator
        const index = prev.findIndex(c => c.userId === data.userId);

        // Skip our own presence updates
        if (data.userId === user.id) {
          return prev;
        }

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
  }, [packingListId, user]);

  // Filter out collaborators that have been offline for more than 24 hours
  const recentCollaborators = collaborators.filter(c => {
    if (c.status === 'offline') {
      const hoursSinceActive = (Date.now() - c.lastActive) / (1000 * 60 * 60);
      return hoursSinceActive < 24;
    }
    return true;
  });

  // Sort by status (online first) and then by username
  const sortedCollaborators = recentCollaborators.sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return a.username.localeCompare(b.username);
  });

  if (sortedCollaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex -space-x-2 overflow-hidden p-2 ml-auto">
      <TooltipProvider>
        {sortedCollaborators.map(collaborator => (
          <Tooltip key={collaborator.userId}>
            <TooltipTrigger asChild>
              <Avatar className={`border-2 ${
                collaborator.status === 'online' 
                  ? 'border-green-400 bg-green-100' 
                  : 'border-gray-300 bg-gray-100'
              } inline-block h-8 w-8 cursor-pointer transition-transform hover:scale-110 hover:z-10 relative`}>
                <AvatarFallback className={`text-sm ${
                  collaborator.status === 'online'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {collaborator.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{collaborator.username} {
                collaborator.status === 'online' 
                  ? 'is currently online' 
                  : 'was recently online'
              }</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
}