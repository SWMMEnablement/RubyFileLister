# Overview

This is a Just Counting GitHub File Scanner web application built with a full-stack TypeScript architecture. The application allows users to scan directories for code files, analyze file structures, and export results in multiple formats. It supports Ruby, Python, C, and Fortran files and features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints with consistent error handling
- **File System**: Native Node.js fs/promises for directory scanning
- **Session Management**: Built-in memory storage with PostgreSQL option

## Data Storage
- **Primary Database**: PostgreSQL via Neon Database serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Tables**: 
  - `scan_sessions` - Track directory scan operations
  - `scanned_files` - Store discovered file metadata
- **Migrations**: Drizzle Kit for schema management

## Key Features
- **Directory Scanning**: Recursive file system traversal with filtering options
- **File Classification**: Automatic categorization (Model, Controller, View, Test, etc.)
- **Real-time Progress**: Live updates during scanning operations
- **Export Functionality**: Multiple format support (TXT, CSV, JSON)
- **Search and Filter**: Client-side file searching and type filtering

## Development Setup
- **Build System**: Vite for frontend, esbuild for backend bundling
- **Development**: Hot module replacement with Vite middleware
- **Production**: Static file serving with Express
- **Environment**: Replit-optimized with cartographer and dev banner plugins

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Connection**: @neondatabase/serverless driver

## UI Framework
- **Radix UI**: Comprehensive component primitives library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TanStack Query**: Server state synchronization
- **React Hook Form**: Form validation and state management
- **Zod**: Runtime type validation for API contracts

## Build and Deployment
- **Vite**: Frontend build tool and development server
- **esbuild**: Fast JavaScript bundler for backend
- **tsx**: TypeScript execution for development
- **Replit Plugins**: Development banner and cartographer for Replit environment