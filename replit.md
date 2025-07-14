# TravelPack - Smart Packing Management System

## Overview

TravelPack is a collaborative packing list management application that allows users to create, organize, and share packing lists for travel. The application features real-time collaboration, offline support, and smart organization of items by categories, bags, and travelers.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **UI Components**: Radix UI components with Tailwind CSS styling
- **Forms**: React Hook Form with Zod validation
- **Real-time Communication**: WebSocket service for collaborative features

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Authentication**: Passport.js with local strategy and express-session
- **Real-time**: WebSocket server for collaboration features
- **File Structure**: Feature-based organization with shared schemas

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM
- **Session Store**: PostgreSQL-based session storage
- **Offline Storage**: IndexedDB for client-side caching and offline support
- **Schema**: Shared TypeScript schemas between client and server

## Key Components

### Authentication & Authorization
- User registration and login system using bcrypt for password hashing
- Session-based authentication with Passport.js
- Collaborative access control for packing lists
- Password reset functionality with email tokens

### Packing List Management
- **Core Entities**: Users, PackingLists, Items, Categories, Bags, Travelers
- **Hierarchical Organization**: Items can be assigned to categories, bags, and travelers
- **Flexible Assignment**: Items can remain unassigned to any of the organizational entities
- **Templates**: Reusable packing list templates for common trip types

### Collaboration System
- **Real-time Collaboration**: Multiple users can work on the same packing list simultaneously
- **Invitation System**: Email-based invitations with secure tokens
- **Permission Levels**: Owner, editor, and viewer roles
- **Live Updates**: WebSocket-based real-time synchronization of changes

### Offline Support
- **Network Detection**: Context-aware online/offline status tracking
- **Local Storage**: IndexedDB for caching data and pending operations
- **Sync Service**: Automatic synchronization when connection is restored
- **Optimistic Updates**: Immediate UI updates with rollback capability

## Data Flow

### Client-Server Communication
1. **API Layer**: RESTful endpoints for CRUD operations
2. **Real-time Layer**: WebSocket connections for live collaboration
3. **Caching Strategy**: TanStack Query for intelligent data caching and invalidation
4. **Error Handling**: Centralized error handling with user-friendly messages

### Offline-First Architecture
1. **Operation Queuing**: Store operations locally when offline
2. **Conflict Resolution**: Last-write-wins strategy for conflicting changes
3. **Background Sync**: Automatic synchronization when network is available
4. **Status Indicators**: Visual feedback for sync status and network state

## External Dependencies

### Email Services
- **Primary**: Mailjet for password reset emails (6,000 free emails/month)
- **Fallback**: SendGrid as backup email provider
- **Configuration**: Environment-based provider selection

### Build & Development Tools
- **Bundler**: Vite for fast development and optimized builds
- **Database Migrations**: Drizzle Kit for schema management
- **Type Safety**: Shared TypeScript schemas and strict type checking
- **Styling**: Tailwind CSS with Radix UI component primitives

### Real-time Infrastructure
- **WebSocket Library**: `ws` package for server-side WebSocket handling
- **Connection Management**: Room-based organization by packing list ID
- **Authentication**: Session-based WebSocket authentication

## Deployment Strategy

### Production Configuration
- **Platform**: Replit with autoscale deployment target
- **Build Process**: Vite build for client, esbuild for server bundling
- **Database**: PostgreSQL 16 with automatic migrations
- **Environment**: Node.js 20 runtime environment

### Development Workflow
- **Hot Reload**: Vite development server with HMR
- **Database Setup**: Automatic schema deployment with Drizzle
- **Session Management**: Secure session handling with proxy trust
- **CORS Configuration**: Flexible cross-origin support for development

### Security Considerations
- **Password Security**: bcrypt hashing with salt rounds
- **Session Security**: Secure cookies in production, HTTPOnly flags
- **CSRF Protection**: Same-site cookie configuration
- **SQL Injection**: Parameterized queries through Drizzle ORM

## Recent Changes

- **July 14, 2025**: Enhanced item creation in category view
  - Added traveler selection dropdown when adding items within categories
  - Maintained quick inline item entry without modal popups
  - Items can now be assigned to travelers during creation
  - Traveler assignment remains optional

- **June 24, 2025**: Fixed password reset frontend validation issues
  - Completely rebuilt ResetPasswordPage with proper conditional rendering logic
  - Fixed token validation flow that was showing error state prematurely
  - Added clear loading states and proper error handling
  - Verified complete end-to-end password reset functionality working
  - Backend APIs confirmed working: validation, reset, and login with new password

- **December 20, 2024**: Implemented complete email-based password reset system
  - Created secure password reset tokens with 1-hour expiration
  - Built ForgotPasswordPage and ResetPasswordPage with proper validation
  - Integrated SendGrid for reliable email delivery
  - Added "Forgot Password" link to authentication flow
  - System automatically handles token validation and one-time use

- **December 20, 2024**: Integrated free Mailjet email service
  - Added Mailjet as primary email provider (6,000 free emails/month)
  - Implemented intelligent provider selection (Mailjet → SendGrid fallback)
  - Created comprehensive setup guide for free email delivery
  - Eliminated email costs for small to medium usage
  - Successfully tested with zjbodnar@gmail.com and zikzaker@gmail.com
  - Password reset emails delivered via Mailjet free service
  - Token generation and validation working correctly on server
  - Fixed Mailjet click tracking interference with reset links

## Changelog

- June 24, 2025. Initial setup
- December 20, 2024. Complete password reset system implementation

## User Preferences

Preferred communication style: Simple, everyday language.