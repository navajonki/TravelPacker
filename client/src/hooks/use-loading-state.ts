import { useState, useEffect } from 'react';

/**
 * Types of loading states that can be managed
 */
export type LoadingStateType = 
  | 'initial'   // Initial loading, no data yet
  | 'refresh'   // Refreshing data that already exists
  | 'paginate'  // Loading more data (pagination)
  | 'mutation'  // Processing a mutation operation
  | 'success'   // Successfully completed
  | 'error';    // Error occurred

interface UseLoadingStateProps {
  isLoading?: boolean;
  isError?: boolean;
  delay?: number;
  minDuration?: number;
  type?: LoadingStateType;
}

/**
 * Hook to manage loading states with delay and minimum duration
 * to prevent loading flicker and provide a smoother UX
 */
export function useLoadingState({
  isLoading = false,
  isError = false,
  delay = 200,        // Delay before showing loading state (ms)
  minDuration = 500,  // Minimum duration for loading state (ms)
  type = 'initial',
}: UseLoadingStateProps = {}) {
  const [showLoading, setShowLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<LoadingStateType>(type);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  useEffect(() => {
    let delayTimer: number | null = null;
    let durationTimer: number | null = null;
    
    if (isLoading) {
      // Save the current type if we're starting to load
      setLoadingType(type);
      
      // Set the start time if not already set
      if (loadStartTime === null) {
        setLoadStartTime(Date.now());
      }
      
      // Set a delay timer before showing the loading state
      delayTimer = window.setTimeout(() => {
        setShowLoading(true);
      }, delay);
    } else if (loadStartTime !== null) {
      // Calculate how long we've been loading
      const elapsedTime = Date.now() - loadStartTime;
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      // Keep showing loading state for the minimum duration
      durationTimer = window.setTimeout(() => {
        setShowLoading(false);
        setLoadStartTime(null);
        
        // If there was an error, set the type to error
        if (isError) {
          setLoadingType('error');
        } else {
          setLoadingType('success');
        }
      }, remainingTime);
    }
    
    // Clean up timers
    return () => {
      if (delayTimer !== null) window.clearTimeout(delayTimer);
      if (durationTimer !== null) window.clearTimeout(durationTimer);
    };
  }, [isLoading, isError, delay, minDuration, type, loadStartTime]);
  
  return {
    isLoading: showLoading,
    loadingType,
    isFirstLoad: loadingType === 'initial' && showLoading,
    isRefreshing: loadingType === 'refresh' && showLoading,
    isPaginating: loadingType === 'paginate' && showLoading,
    isMutating: loadingType === 'mutation' && showLoading,
    isSuccess: loadingType === 'success' && !showLoading,
    isError: loadingType === 'error' || isError
  };
}

export default useLoadingState;