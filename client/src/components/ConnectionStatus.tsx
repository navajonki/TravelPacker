import React from 'react';
import { Wifi, WifiOff, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  isOnline: boolean;
  lastSuccessfulFetch?: Date | null;
  dataAge?: number | null;
  isDataStale?: boolean;
  className?: string;
}

export function ConnectionStatus({
  isOnline,
  lastSuccessfulFetch,
  dataAge,
  isDataStale,
  className
}: ConnectionStatusProps) {
  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    
    if (isDataStale && dataAge) {
      const minutes = Math.floor(dataAge / (1000 * 60));
      if (minutes > 0) {
        return `Data ${minutes}m old`;
      }
    }
    
    return 'Online';
  };

  const getStatusColor = () => {
    if (!isOnline) {
      return 'text-red-500';
    }
    
    if (isDataStale) {
      return 'text-amber-500';
    }
    
    return 'text-green-500';
  };

  const getIcon = () => {
    if (!isOnline) {
      return <WifiOff className="w-4 h-4" />;
    }
    
    if (isDataStale) {
      return <Clock className="w-4 h-4" />;
    }
    
    return <Wifi className="w-4 h-4" />;
  };

  return (
    <div className={cn(
      'flex items-center gap-2 text-sm',
      getStatusColor(),
      className
    )}>
      {getIcon()}
      <span className="hidden sm:inline">{getStatusText()}</span>
    </div>
  );
}