# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server (runs both client and server)
- `npm run build` - Build application for production
- `npm run start` - Start production server
- `npm run check` - Run TypeScript type checking
- `npm run setup:local` - Run local setup script
- `npm run dev:clean` - Clean dist and start development server

### Database
- `npm run db:push` - Push database schema changes using Drizzle
- `npm run db:migrate` - Run database migrations

### Testing
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Local Development Setup
For local development, see `LOCAL_SETUP.md` for detailed instructions. Quick start:
1. `npm run setup:local` - Run setup script
2. Configure `.env` file with local database credentials
3. `npm run db:push` - Set up database schema
4. `npm run dev` - Start development server

## Architecture Overview

### Project Structure
This is a full-stack TypeScript application with a React frontend and Express backend:

- **client/** - React frontend using Vite
- **server/** - Express backend with authentication and WebSocket support
- **shared/** - Shared types and database schema (Drizzle ORM)
- **migrations/** - Database migration files

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express, TypeScript, Passport.js authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket for collaboration features
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for client-side routing
- **Testing**: Jest with React Testing Library

### Database Schema
The application uses Drizzle ORM with the following main entities:
- **users** - User accounts with authentication
- **packingLists** - Travel packing lists owned by users
- **packingListCollaborators** - Junction table for list sharing
- **collaborationInvitations** - Email invitations for list collaboration
- **categories** - Organizational categories within lists
- **bags** - Physical bags for packing organization
- **travelers** - People associated with a packing list
- **items** - Individual items to pack, with associations to categories/bags/travelers

### Authentication & Authorization
- Uses Passport.js with local strategy
- Session-based authentication with PostgreSQL session store
- Password reset functionality with email tokens
- Collaboration system with email invitations

### Key Application Features
- Multi-user packing list management
- Real-time collaboration with WebSocket synchronization
- Offline support with local storage fallback
- Item organization by categories, bags, and travelers
- Bulk item editing and assignment
- Email-based collaboration invitations
- Mobile-responsive design

### Frontend Architecture
- **Components**: Organized in feature-based structure under `/components/`
- **Contexts**: Authentication, NetworkContext, PackingListContext for global state
- **Hooks**: Custom hooks for data fetching and state management
- **Services**: Error handling, logging, offline storage, sync services
- **Pages**: Main application routes (Dashboard, PackingList, Auth, etc.)

### Key Patterns
- Feature-based component organization (bags/, categories/, travelers/, items/)
- React Query for server state management with optimistic updates
- Error boundaries for graceful error handling
- Context providers for global application state
- Custom hooks for reusable logic
- TypeScript interfaces in shared/types.ts for type safety

### Development Notes
- Server runs on port 5000 in all environments
- Database migrations run automatically in production
- WebSocket server is integrated with the main Express server
- All API routes are prefixed with `/api/`
- Client-side routing handles authentication redirects
- Error handling uses custom error boundary components

### Testing Setup
- Jest configuration in client/src/tests/setupTests.ts
- Mocks for React Query, localStorage, and DOM APIs
- Testing utilities in client/src/tests/testUtils.tsx