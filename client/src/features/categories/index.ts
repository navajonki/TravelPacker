/**
 * Entry point for the categories feature
 * Exports all components and hooks related to categories
 */

// Components
export { default as CategoryCard } from './components/CategoryCard';

// Hooks
export { default as useCategories } from './hooks/useCategories';

/**
 * Feature Status:
 * - Created CategoryCard with proper TypeScript typing
 * - Used shared services for logging, API calls, and query invalidation
 * - Created custom hook for categories data management
 * - Added proper error handling and user feedback
 */