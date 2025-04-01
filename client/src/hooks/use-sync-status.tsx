import React, { createContext, useState, useContext, useEffect } from 'react';

interface SyncContextType {
  pendingOperations: number;
  isPending: boolean;
  incrementPending: () => void;
  decrementPending: () => void;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncStatusProvider({ children }: { children: React.ReactNode }) {
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isPending, setIsPending] = useState(false);
  
  // Update isPending whenever pendingOperations changes
  useEffect(() => {
    setIsPending(pendingOperations > 0);
  }, [pendingOperations]);
  
  const incrementPending = () => {
    setPendingOperations(prev => prev + 1);
  };
  
  const decrementPending = () => {
    setPendingOperations(prev => Math.max(0, prev - 1));
  };
  
  return (
    <SyncContext.Provider value={{ 
      pendingOperations, 
      isPending, 
      incrementPending, 
      decrementPending 
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}