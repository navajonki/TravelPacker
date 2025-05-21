/**
 * Centralized logging service for the application.
 * Provides consistent logging patterns and levels.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Configuration for the logger
const config = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  groupColors: {
    api: 'color: #2563eb',
    ui: 'color: #059669',
    auth: 'color: #7c3aed',
    data: 'color: #b91c1c',
    sync: 'color: #0891b2',
    items: 'color: #c026d3',
    collab: 'color: #f59e0b',
  },
};

// Map of numeric values for log levels for comparison
const logLevelValues: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Check if a given log level should be logged
const shouldLog = (level: LogLevel): boolean => {
  return logLevelValues[level] >= logLevelValues[config.level as LogLevel];
};

// Format a log message with additional context
const formatMessage = (
  message: string,
  context?: Record<string, any>
): string => {
  if (!context) return message;
  
  try {
    const contextStr = Object.entries(context)
      .map(([key, value]) => {
        // For objects and arrays, stringify them
        if (typeof value === 'object' && value !== null) {
          try {
            return `${key}: ${JSON.stringify(value)}`;
          } catch (e) {
            return `${key}: [Complex Object]`;
          }
        }
        return `${key}: ${value}`;
      })
      .join(', ');
    
    return `${message} (${contextStr})`;
  } catch (e) {
    return `${message} (Error formatting context)`;
  }
};

// Basic logger implementation
const baseLogger = {
  debug: (message: string, context?: Record<string, any>): void => {
    if (!shouldLog('debug') || !config.enableConsole) return;
    console.debug(formatMessage(message, context));
  },
  
  info: (message: string, context?: Record<string, any>): void => {
    if (!shouldLog('info') || !config.enableConsole) return;
    console.info(formatMessage(message, context));
  },
  
  warn: (message: string, context?: Record<string, any>): void => {
    if (!shouldLog('warn') || !config.enableConsole) return;
    console.warn(formatMessage(message, context));
  },
  
  error: (message: string, error?: any, context?: Record<string, any>): void => {
    if (!shouldLog('error') || !config.enableConsole) return;
    
    // Merge error properties into context if provided
    let enhancedContext = context || {};
    if (error) {
      if (error instanceof Error) {
        enhancedContext = {
          ...enhancedContext,
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        };
      } else {
        enhancedContext = {
          ...enhancedContext,
          error,
        };
      }
    }
    
    console.error(formatMessage(message, enhancedContext));
    
    // Send to remote logging service in production
    if (config.enableRemote) {
      // Implement remote logging (e.g., Sentry) here
      // Example: Sentry.captureException(error || new Error(message), { extra: enhancedContext });
    }
  },
};

// Create a logger that tracks a specific group/component
export const createLogger = (group: string) => {
  const groupStyle = (config.groupColors as any)[group] || 'color: #6b7280';
  
  return {
    debug: (message: string, context?: Record<string, any>): void => {
      if (!shouldLog('debug') || !config.enableConsole) return;
      console.debug(`%c[${group}]`, groupStyle, formatMessage(message, context));
    },
    
    info: (message: string, context?: Record<string, any>): void => {
      if (!shouldLog('info') || !config.enableConsole) return;
      console.info(`%c[${group}]`, groupStyle, formatMessage(message, context));
    },
    
    warn: (message: string, context?: Record<string, any>): void => {
      if (!shouldLog('warn') || !config.enableConsole) return;
      console.warn(`%c[${group}]`, groupStyle, formatMessage(message, context));
    },
    
    error: (message: string, error?: any, context?: Record<string, any>): void => {
      if (!shouldLog('error') || !config.enableConsole) return;
      
      // Merge error properties into context if provided
      let enhancedContext = context || {};
      if (error) {
        if (error instanceof Error) {
          enhancedContext = {
            ...enhancedContext,
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          };
        } else {
          enhancedContext = {
            ...enhancedContext,
            error,
          };
        }
      }
      
      console.error(`%c[${group}]`, groupStyle, formatMessage(message, enhancedContext));
      
      // Send to remote logging service in production
      if (config.enableRemote) {
        // Implement remote logging (e.g., Sentry) here
        // Example: Sentry.captureException(error || new Error(message), { extra: enhancedContext, tags: { group } });
      }
    },
    
    // Create a console group for related logs
    group: (name: string, collapsed = false): void => {
      if (!config.enableConsole) return;
      if (collapsed) {
        console.groupCollapsed(`%c[${group}] ${name}`, groupStyle);
      } else {
        console.group(`%c[${group}] ${name}`, groupStyle);
      }
    },
    
    // End a console group
    groupEnd: (): void => {
      if (!config.enableConsole) return;
      console.groupEnd();
    },
    
    // Time an operation
    time: (label: string): void => {
      if (!config.enableConsole) return;
      console.time(`[${group}] ${label}`);
    },
    
    // End timing an operation
    timeEnd: (label: string): void => {
      if (!config.enableConsole) return;
      console.timeEnd(`[${group}] ${label}`);
    },
  };
};

// Pre-create loggers for common module groups
export const apiLogger = createLogger('api');
export const uiLogger = createLogger('ui');
export const authLogger = createLogger('auth');
export const dataLogger = createLogger('data');
export const syncLogger = createLogger('sync');
export const itemsLogger = createLogger('items');
export const collabLogger = createLogger('collab');

// Export the base logger as default
export default baseLogger;