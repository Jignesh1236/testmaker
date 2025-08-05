# Auto Test Generator

## Overview

Auto Test Generator is a full-stack web application designed for creating and administering online tests. The platform allows administrators to upload questions (MCQ format), automatically generate tests with unique shareable links, and track live results through a centralized dashboard. Students can take tests without registration using simple links, making the testing process streamlined and accessible.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Radix UI components with shadcn/ui for consistent, accessible design system
- **Styling**: Tailwind CSS with CSS variables for theming support
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for end-to-end type safety
- **API Design**: RESTful API structure with organized route handlers
- **File Handling**: Multer middleware for Excel/CSV file uploads
- **Session Management**: Express sessions with PostgreSQL store
- **Error Handling**: Centralized error handling middleware

### Database Design
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Four main entities:
  - `users`: Admin authentication and management
  - `tests`: Test metadata (title, duration, timestamps)
  - `questions`: Question content with multiple choice options
  - `testAttempts`: Student submissions and scoring data
- **Relationships**: Proper foreign key constraints and cascading deletes

### Key Features Architecture
- **Test Creation**: Manual question entry and bulk upload via Excel/CSV
- **Test Taking**: Timer-based interface with auto-submission
- **Real-time Results**: Live dashboard with automatic data refresh
- **Shareable Links**: UUID-based test identification for secure access
- **Scoring System**: Automatic calculation with configurable marks per question

### Development Tools
- **Type Safety**: Shared TypeScript schemas between frontend and backend
- **Validation**: Zod schemas for runtime validation and type inference
- **Code Quality**: ESLint and TypeScript compiler checks
- **Build Process**: Separate client and server builds with ESBuild

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle Kit**: Database migration and schema management tools

### UI Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Icon library for consistent iconography
- **React Hook Form**: Form handling with validation support
- **Class Variance Authority**: Utility for component variant management

### Development Dependencies
- **TanStack Query**: Server state management and caching
- **React Router**: Client-side navigation (wouter)
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing and autoprefixing
- **Date-fns**: Date manipulation and formatting utilities

### Backend Services
- **Express.js**: Web framework for Node.js
- **WebSocket Support**: Real-time communication capabilities
- **File Upload**: Multer for handling multipart form data
- **Session Store**: PostgreSQL-based session management

### Build and Development
- **Vite**: Frontend build tool and development server
- **ESBuild**: Fast JavaScript bundler for production
- **TypeScript**: Static type checking and compilation
- **Replit Integration**: Development environment optimizations