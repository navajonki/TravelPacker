import { AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useSyncStatus } from '@/hooks/use-sync-status';

export default function SyncStatusIndicator() {
  const { isPending } = useSyncStatus();
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isPending ? (
        <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-md shadow-sm border border-amber-200">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-xs">Syncing...</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md shadow-sm border border-emerald-200">
          <Check className="h-4 w-4" />
          <span className="text-xs">Synced</span>
        </div>
      )}
    </div>
  );
}