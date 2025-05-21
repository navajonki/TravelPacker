/**
 * Entry point for the collaboration feature
 * Exports all components and hooks related to collaboration
 */

// Components
export { 
  CollaborationView,
  InvitationHandler,
  InvitationsList,
  InviteDialog
} from './components';

// Hooks
export {
  useCollaborators,
  useInvitations,
  usePendingInvitations,
  useInvitation
} from './hooks';

/**
 * Feature Status:
 * - Created collaboration management components with proper TypeScript typing
 * - Created hooks for collaborators and invitations data management
 * - Used shared services for logging, API calls, and query invalidation
 * - Added proper error handling and user feedback
 */