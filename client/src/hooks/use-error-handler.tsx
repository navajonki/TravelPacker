import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyErrorMessage } from "@/services/errorHandling";
import { ExtendedApiError } from "@shared/types";
import { useCallback } from "react";

interface ErrorHandlerOptions {
  showToast?: boolean;
  toastTitle?: string;
  onError?: (error: ExtendedApiError) => void;
}

/**
 * Hook that provides standardized error handling
 * 
 * @example
 * const { handleError } = useErrorHandler();
 * 
 * try {
 *   await someApiCall();
 * } catch (error) {
 *   handleError(error);
 * }
 */
export function useErrorHandler(defaultOptions: ErrorHandlerOptions = {}) {
  const { toast } = useToast();
  
  const { 
    showToast = true,
    toastTitle = "Error",
    onError
  } = defaultOptions;
  
  /**
   * Handles an error by showing a toast notification and/or calling an error handler
   */
  const handleError = useCallback((error: any, options?: ErrorHandlerOptions) => {
    // Use provided options or default to the hook options
    const { 
      showToast: showToastOption = showToast,
      toastTitle: toastTitleOption = toastTitle,
      onError: onErrorOption = onError
    } = options || {};
    
    // Cast the error to our ExtendedApiError type if possible
    const apiError = error as ExtendedApiError;
    
    // Get a user-friendly error message
    const errorMessage = getUserFriendlyErrorMessage(apiError);
    
    // Show toast notification if enabled
    if (showToastOption) {
      toast({
        title: toastTitleOption,
        description: errorMessage,
        variant: "destructive"
      });
    }
    
    // Call the error handler if provided
    if (onErrorOption) {
      onErrorOption(apiError);
    }
    
    // Return the processed error for further handling if needed
    return apiError;
  }, [toast, showToast, toastTitle, onError]);
  
  /**
   * Creates an async error handler that wraps a function and handles any errors
   */
  const createAsyncErrorHandler = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options?: ErrorHandlerOptions
  ) => {
    return async (...args: T): Promise<R | undefined> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        return undefined;
      }
    };
  }, [handleError]);
  
  return {
    handleError,
    createAsyncErrorHandler
  };
}

export default useErrorHandler;