import React from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import { Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Component that displays an indicator when the user is offline
 */
const OfflineIndicator = () => {
  const { isOnline, connectionQuality } = useNetwork();

  if (isOnline && connectionQuality !== 'poor') {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-md ${
            !isOnline ? 'bg-red-500' : 'bg-yellow-500'
          }`}>
            {!isOnline ? (
              <WifiOff className="h-5 w-5 text-white" />
            ) : (
              <Wifi className="h-5 w-5 text-white" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          {!isOnline ? (
            <p>You are offline. Some features may not be available.</p>
          ) : (
            <p>Poor connection detected. Performance may be affected.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OfflineIndicator;