/**
 * Entry point for the bags feature
 * Exports all components and hooks related to bags
 */

// Components
export { default as BagCard } from './components/BagCard';

// Hooks
export { default as useBags } from './hooks/useBags';

/**
 * Feature Status:
 * - Created BagCard with proper TypeScript typing
 * - Used shared services for logging, API calls, and query invalidation
 * - Created custom hook for bags data management
 * - Added proper error handling and user feedback
 */