import { RefreshCw, Check } from 'lucide-react';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { useEffect, useState } from 'react';

export default function SyncStatusIndicator() {
  const { isPending } = useSyncStatus();
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
  
  // Don't render anything if nothing is happening and the "Synced" animation is complete
  if (!isPending && !showSynced) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 transition-opacity duration-300">
      {isPending ? (
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md shadow-sm border border-blue-200 animate-pulse">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs font-medium">Saving changes...</span>
        </div>
      ) : showSynced && (
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-md shadow-sm border border-emerald-200 transition-opacity duration-300">
          <Check className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">All changes saved</span>
        </div>
      )}
    </div>
  );
}