/**
 * Entry point for the travelers feature
 * Exports all components and hooks related to travelers
 */

// Components
export { default as TravelerCard } from './components/TravelerCard';

// Hooks
export { default as useTravelers } from './hooks/useTravelers';

/**
 * Feature Status:
 * - Created TravelerCard with proper TypeScript typing
 * - Used shared services for logging, API calls, and query invalidation
 * - Created custom hook for travelers data management
 * - Added proper error handling and user feedback
 */