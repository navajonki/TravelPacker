import { RefreshCw, Check, Cloud, CloudOff, AlertTriangle } from 'lucide-react';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useNetwork } from '@/contexts/NetworkContext';
import { useEffect, useState } from 'react';
import { useSyncService } from '@/services/syncService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function SyncStatusIndicator() {
  const { isPending } = useSyncStatus();
  const { isOnline } = useNetwork();
  const { pendingOperations } = useSyncService();
  const [showSynced, setShowSynced] = useState(false);
  
  // When isPending changes to false, show the "Synced" state briefly
  useEffect(() => {
    if (!isPending) {
      setShowSynced(true);
      const timer = setTimeout(() => {
        setShowSynced(false);
      }, 1500); // Hide the "Synced" message after 1.5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isPending]);
  
  // Show nothing if everything is fine and synced
  if (!isPending && !showSynced && isOnline && pendingOperations === 0) {
    return null;
  }

  // Choose the appropriate status to display
  let status: 'saving' | 'saved' | 'offline' | 'pending' | 'error' = 'saved';
  
  if (isPending) {
    status = 'saving';
  } else if (!isOnline && pendingOperations > 0) {
    status = 'offline';
  } else if (!isOnline) {
    status = 'offline';
  } else if (pendingOperations > 0) {
    status = 'pending';
  } else if (showSynced) {
    status = 'saved';
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 transition-opacity duration-300">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              {status === 'saving' && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md shadow-sm border border-blue-200 animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs font-medium">Saving changes...</span>
                </div>
              )}
              
              {status === 'saved' && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md shadow-sm border border-emerald-200 transition-opacity duration-300">
                  <Check className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">All changes saved</span>
                </div>
              )}
              
              {status === 'offline' && (
                <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-md shadow-sm border border-orange-200">
                  <CloudOff className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {pendingOperations > 0 
                      ? `${pendingOperations} pending change${pendingOperations > 1 ? 's' : ''}`
                      : 'Offline mode'}
                  </span>
                </div>
              )}
              
              {status === 'pending' && (
                <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-md shadow-sm border border-yellow-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {pendingOperations} pending change{pendingOperations > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" align="center">
            {status === 'saving' && (
              <p>Saving your changes...</p>
            )}
            
            {status === 'saved' && (
              <p>All your changes have been saved successfully.</p>
            )}
            
            {status === 'offline' && pendingOperations > 0 && (
              <p>You're currently offline. {pendingOperations} change{pendingOperations > 1 ? 's' : ''} will sync when you reconnect.</p>
            )}
            
            {status === 'offline' && pendingOperations === 0 && (
              <p>You're currently offline. Changes you make will sync when you reconnect.</p>
            )}
            
            {status === 'pending' && (
              <p>{pendingOperations} change{pendingOperations > 1 ? 's are' : ' is'} waiting to be synchronized.</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}