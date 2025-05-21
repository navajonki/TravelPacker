import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { createLogger } from '@/services/logging';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const logger = createLogger('packingList');

interface PackingListInfo {
  id: number;
  name: string;
  theme?: string;
  dateRange?: string;
  userId: number;
  isOwner: boolean;
  collaboratorCount: number;
  itemCount: number;
  progress: number;
}

interface PackingListContextType {
  activeListId: number | null;
  setActiveListId: (id: number | null) => void;
  activeList: PackingListInfo | null;
  isLoading: boolean;
  isError: boolean;
  navigateToList: (id: number) => void;
  recentLists: PackingListInfo[];
  addRecentList: (list: PackingListInfo) => void;
}

const PackingListContext = createContext<PackingListContextType | undefined>(undefined);

interface PackingListProviderProps {
  children: ReactNode;
}

export const PackingListProvider: React.FC<PackingListProviderProps> = ({ children }) => {
  const [activeListId, setActiveListId] = useState<number | null>(null);
  const [recentLists, setRecentLists] = useState<PackingListInfo[]>([]);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to fetch active list details
  const {
    data: activeList,
    isLoading,
    isError
  } = useQuery<PackingListInfo>({
    queryKey: [`/api/packing-lists/${activeListId}`],
    queryFn: () => apiRequest('GET', `/api/packing-lists/${activeListId}`),
    enabled: !!activeListId,
    onSuccess: (data) => {
      addRecentList(data);
    },
    onError: (error) => {
      logger.error('Failed to fetch active packing list', error, { listId: activeListId });
      toast({
        title: 'Error',
        description: 'Failed to load packing list details',
        variant: 'destructive'
      });
    }
  });

  // Save recent lists to local storage
  useEffect(() => {
    try {
      localStorage.setItem('recentLists', JSON.stringify(recentLists));
    } catch (error) {
      logger.error('Failed to save recent lists to localStorage', error);
    }
  }, [recentLists]);

  // Load recent lists from local storage on mount
  useEffect(() => {
    try {
      const savedLists = localStorage.getItem('recentLists');
      if (savedLists) {
        setRecentLists(JSON.parse(savedLists));
      }
    } catch (error) {
      logger.error('Failed to load recent lists from localStorage', error);
    }
  }, []);

  // Function to add a list to recent lists
  const addRecentList = (list: PackingListInfo) => {
    setRecentLists(prevLists => {
      // Remove the list if it already exists (to avoid duplicates)
      const filteredLists = prevLists.filter(l => l.id !== list.id);
      
      // Add the list to the beginning of the array
      const newLists = [list, ...filteredLists];
      
      // Limit to most recent 5 lists
      return newLists.slice(0, 5);
    });
  };

  // Function to navigate to a list
  const navigateToList = (id: number) => {
    setActiveListId(id);
    setLocation(`/list/${id}`);
  };

  return (
    <PackingListContext.Provider value={{
      activeListId,
      setActiveListId,
      activeList,
      isLoading,
      isError,
      navigateToList,
      recentLists,
      addRecentList
    }}>
      {children}
    </PackingListContext.Provider>
  );
};

// Hook to use the packing list context
export function usePackingList() {
  const context = useContext(PackingListContext);
  
  if (context === undefined) {
    throw new Error('usePackingList must be used within a PackingListProvider');
  }
  
  return context;
}

export default PackingListContext;