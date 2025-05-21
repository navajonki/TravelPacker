import React, { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { PackingListProvider } from '@/contexts/PackingListContext';
import AppErrorBoundary from '@/components/AppErrorBoundary';
import OfflineIndicator from '@/components/OfflineIndicator';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Combined providers for the application
 * 
 * This component wraps the application with all necessary providers in the correct order.
 */
const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <PackingListProvider>
            {children}
            <OfflineIndicator />
          </PackingListProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
};

export default AppProviders;