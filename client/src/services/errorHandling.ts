/**
 * Centralized error handling service for the application.
 * Provides consistent error handling patterns and utilities.
 */
import { ApiError } from '@shared/types';
import { createLogger } from './logging';

const logger = createLogger('error');

/**
 * Network error types
 */
export enum NetworkErrorType {
  TIMEOUT = 'TIMEOUT',
  OFFLINE = 'OFFLINE',
  SERVER_ERROR = 'SERVER_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Extended API error with additional context
 */
export interface ExtendedApiError extends ApiError {
  networkErrorType?: NetworkErrorType;
  originalError?: any;
  componentStack?: string;
  context?: Record<string, any>;
}

/**
 * Formats an error response from fetch into a standardized ApiError
 */
export async function formatApiError(response: Response): Promise<ApiError> {
  try {
    // Try to parse as JSON first
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      
      return {
        message: errorData.message || `Error: ${response.status} ${response.statusText}`,
        status: response.status,
        errors: errorData.errors
      };
    } else {
      // Fall back to text
      const text = await response.text() || response.statusText;
      return {
        message: text || `Error: ${response.status} ${response.statusText}`,
        status: response.status
      };
    }
  } catch (parseError) {
    // If JSON parsing fails, use the status text
    return {
      message: response.statusText || 'Unknown error occurred',
      status: response.status
    };
  }
}

/**
 * Detect network error type based on error object or status code
 */
export function detectNetworkErrorType(error: any, status?: number): NetworkErrorType {
  // Check for timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return NetworkErrorType.TIMEOUT;
  }
  
  // Check if user is offline
  if (!navigator.onLine) {
    return NetworkErrorType.OFFLINE;
  }
  
  // Check for status codes if available
  if (status) {
    if (status >= 500) {
      return NetworkErrorType.SERVER_ERROR;
    }
    
    if (status === 401 || status === 403) {
      return NetworkErrorType.AUTH_ERROR;
    }
    
    if (status === 0 || status === 502 || status === 503 || status === 504) {
      return NetworkErrorType.CONNECTION_ERROR;
    }
  }
  
  // Check for fetch errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return NetworkErrorType.CONNECTION_ERROR;
  }
  
  return NetworkErrorType.UNKNOWN;
}

/**
 * Creates a user-friendly error message based on the error type
 */
export function getUserFriendlyErrorMessage(error: ExtendedApiError): string {
  // Use the explicit message if available
  if (error.message && error.message !== 'Unknown error') {
    return error.message;
  }
  
  // Create message based on network error type
  switch(error.networkErrorType) {
    case NetworkErrorType.TIMEOUT:
      return "The request took too long to complete. Please try again.";
    
    case NetworkErrorType.OFFLINE:
      return "You appear to be offline. Please check your internet connection and try again.";
    
    case NetworkErrorType.SERVER_ERROR:
      return "The server encountered an error. Please try again later.";
    
    case NetworkErrorType.AUTH_ERROR:
      return "You don't have permission to perform this action. Please sign in again.";
    
    case NetworkErrorType.CONNECTION_ERROR:
      return "Could not connect to the server. Please check your connection and try again.";
    
    default:
      if (error.status === 404) {
        return "The requested resource was not found.";
      }
      
      if (error.status === 400) {
        return "The request was invalid. Please check your input and try again.";
      }
      
      return "An unexpected error occurred. Please try again.";
  }
}

/**
 * Processes and enhances an error with additional context
 */
export function processError(error: any, context?: Record<string, any>): ExtendedApiError {
  let processedError: ExtendedApiError;
  
  // Handle API errors
  if (error && 'status' in error && 'message' in error) {
    // This is already an API error, use it as is
    processedError = error as ApiError;
  } 
  // Handle Response objects
  else if (error instanceof Response) {
    // This will be processed asynchronously later, create a placeholder
    processedError = {
      message: 'Error processing response',
      status: error.status,
      originalError: error
    };
  } 
  // Handle generic errors
  else if (error instanceof Error) {
    // Convert standard Error to ExtendedApiError
    processedError = {
      message: error.message,
      status: 0,
      originalError: error
    };
  } 
  // Handle unknown errors
  else {
    // Create a generic error 
    processedError = {
      message: error?.toString?.() || 'Unknown error',
      status: 0,
      originalError: error
    };
  }
  
  // Add network error type
  processedError.networkErrorType = detectNetworkErrorType(error, processedError.status);
  
  // Add context if provided
  if (context) {
    processedError.context = context;
  }
  
  // Log the error
  logger.error('Error occurred', processedError, processedError.context);
  
  return processedError;
}

/**
 * Error boundary handler for React components
 */
export function logComponentError(error: Error, componentStack: string, componentName: string): void {
  const errorWithStack: ExtendedApiError = {
    message: error.message,
    status: 0,
    componentStack,
    context: { componentName }
  };
  
  logger.error('React component error', error, errorWithStack);
}

/**
 * Retries an async function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number,
    initialDelayMs?: number,
    maxDelayMs?: number,
    backoffFactor?: number,
    shouldRetry?: (error: any) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffFactor = 2,
    shouldRetry = (error) => {
      // By default, retry on network errors but not on 4xx errors
      const networkType = detectNetworkErrorType(error, error?.status);
      return networkType === NetworkErrorType.SERVER_ERROR || 
             networkType === NetworkErrorType.CONNECTION_ERROR ||
             networkType === NetworkErrorType.TIMEOUT;
    }
  } = options;
  
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (!shouldRetry(error) || attempt >= maxRetries - 1) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffFactor, attempt),
        maxDelayMs
      );
      
      // Log the retry
      logger.warn(`Retrying failed operation (attempt ${attempt + 1}/${maxRetries})`, {
        delay,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never happen due to the throw in the loop,
  // but TypeScript needs it for type safety
  throw lastError;
}

/**
 * Creates an AbortController that will automatically timeout
 */
export function createTimeoutController(timeoutMs: number = 30000): {
  controller: AbortController;
  clear: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    controller,
    clear: () => clearTimeout(timeoutId)
  };
}

/**
 * Tries to parse a JSON string safely, returning null if it fails
 */
export function safeJsonParse(jsonString: string): any | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    logger.warn('Failed to parse JSON', { jsonString: jsonString.substring(0, 100) });
    return null;
  }
}

export default {
  formatApiError,
  detectNetworkErrorType,
  getUserFriendlyErrorMessage,
  processError,
  logComponentError,
  retryWithBackoff,
  createTimeoutController,
  safeJsonParse
};