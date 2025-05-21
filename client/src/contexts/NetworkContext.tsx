import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/services/logging';

const logger = createLogger('network');

interface NetworkContextType {
  isOnline: boolean;
  wasOffline: boolean;
  connectionQuality: 'good' | 'poor' | 'unknown';
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  wasOffline: false,
  connectionQuality: 'unknown'
});

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Provider component for network status
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
  const { toast } = useToast();

  useEffect(() => {
    // Function to handle online status change
    const handleOnline = () => {
      logger.info('Network connection restored');
      setIsOnline(true);
      
      // Check if we were previously offline
      if (!isOnline) {
        setWasOffline(true);
        // Show toast notification
        toast({
          title: 'Connection Restored',
          description: 'Your internet connection has been restored.',
          variant: 'default'
        });
      }
    };

    // Function to handle offline status change
    const handleOffline = () => {
      logger.warn('Network connection lost');
      setIsOnline(false);
      
      // Show toast notification
      toast({
        title: 'No Internet Connection',
        description: 'You are currently offline. Some features may be unavailable.',
        variant: 'destructive'
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection quality using Navigator.connection if available
    const connection = (navigator as any).connection;
    
    if (connection) {
      const updateConnectionQuality = () => {
        if (connection.downlink >= 2) {
          setConnectionQuality('good');
        } else if (connection.downlink > 0) {
          setConnectionQuality('poor');
        } else {
          setConnectionQuality('unknown');
        }
        
        logger.debug('Connection quality updated', {
          downlink: connection.downlink,
          effectiveType: connection.effectiveType,
          rtt: connection.rtt,
          quality: connectionQuality
        });
      };
      
      // Initial update
      updateConnectionQuality();
      
      // Listen for changes
      connection.addEventListener('change', updateConnectionQuality);
      
      // Cleanup connection listener
      return () => {
        connection.removeEventListener('change', updateConnectionQuality);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, isOnline]);

  return (
    <NetworkContext.Provider value={{ isOnline, wasOffline, connectionQuality }}>
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Hook to use the network context
 */
export function useNetwork() {
  const context = useContext(NetworkContext);
  
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  
  return context;
}

export default NetworkContext;