# RubyFileLister

A full-stack web application for scanning source-code directories, classifying files, and exporting structured file inventories with optional GitHub commit metadata.

**Repository:** [SWMMEnablement/RubyFileLister](https://github.com/SWMMEnablement/RubyFileLister)  
**Replit app:** [replit.com/@robertdickinson/RubyFileLister](https://replit.com/@robertdickinson/RubyFileLister)

---

## Overview

RubyFileLister is a directory-scanning and code-inventory tool built with a modern TypeScript full-stack architecture. It is designed to scan folders recursively, identify supported source files, classify them into useful categories, and present the results in a searchable web interface. [page:41]

According to the project documentation, the application supports **Ruby, Python, C, and Fortran** files and includes export options plus GitHub integration for viewing file-level commit details such as author, commit message, date, and URL. [page:41]

---

## What it does

RubyFileLister helps you answer practical questions about a codebase:

- What source files are present in this directory tree?
- Which files belong to categories such as model, controller, view, or test?
- How many files of each type exist?
- What are the most recent GitHub commit details for each file?
- How can the file inventory be exported for documentation or review?

The tool is useful both as a lightweight codebase explorer and as a documentation aid for engineering or scripting repositories. [page:41]

---

## Key features

- **Recursive directory scanning** with filtering options. [page:41]
- **File classification** into categories such as Model, Controller, View, and Test. [page:41]
- **Support for Ruby, Python, C, and Fortran** source files. [page:41]
- **Real-time progress updates** while scanning. [page:41]
- **Search and filtering** in the frontend for scanned files. [page:41]
- **Export formats** including **TXT**, **CSV**, and **JSON**. [page:41]
- **GitHub integration** for file-level commit metadata. [page:41]
- **Automatic repository detection** from scanned directory paths. [page:41]

---

## GitHub integration

One of the standout features of RubyFileLister is its GitHub integration layer. When scanning files inside a GitHub-backed repository, the app can fetch and display commit information including the commit author, message, date, and a direct GitHub URL for the file history context. [page:41]

The repository history also shows recent updates specifically adding GitHub integration and commit-detail viewing, along with schema changes to store GitHub commit information for scanned files. [page:41]

---

## Architecture

### Frontend

The frontend is built with **React 18**, **TypeScript**, and **Vite**, using **shadcn/ui** components on top of **Radix UI** primitives. Styling is handled with **Tailwind CSS**, while **TanStack Query** manages server state and **Wouter** provides lightweight client-side routing. Forms use **React Hook Form** with **Zod** validation. [page:41]

### Backend

The backend uses **Node.js**, **Express.js**, and **TypeScript** with ES modules. Directory scanning is performed with native Node.js `fs/promises`, and the API is described as RESTful with consistent error handling. [page:41]

### Data storage

The app is designed to work with **PostgreSQL** via **Neon Database** and **Drizzle ORM**. The documented schema includes two main tables: `scan_sessions` for tracking scan operations and `scanned_files` for storing file metadata and related results. [page:41]

---

## Repository structure

```text
RubyFileLister/
├── attached_assets/       # Bundled support files and reference assets
├── client/                # React frontend
├── server/                # Express backend
├── shared/                # Shared types and schema definitions
├── .replit                # Replit runtime configuration
├── components.json        # shadcn/ui configuration
├── drizzle.config.ts      # Drizzle ORM configuration
├── package.json           # Project scripts and dependencies
├── postcss.config.js      # PostCSS configuration
├── replit.md              # Project architecture and handover notes
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

The repository is mostly **TypeScript (97.7%)**, with a small amount of CSS and other supporting files. [page:41]

---

## Typical workflow

A normal workflow in RubyFileLister appears to be:

1. Select or provide a directory path to scan.
2. Run a recursive scan of the codebase.
3. Filter the results by file type or classification.
4. Search within the discovered file inventory.
5. Review GitHub commit metadata for matching files when available.
6. Export the results as TXT, CSV, or JSON.

This makes the application useful for code audits, repository documentation, and source-tree exploration. [page:41]

---

## Development

### Install dependencies

```bash
npm install
```

### Start the app locally

```bash
npm run dev
```

The development environment uses **Vite** for the frontend and **esbuild** for backend bundling, with **TSX** handling TypeScript execution in development and Vite middleware providing hot reload. [page:41]

---

## Technology stack

- **React 18** + **TypeScript** for the frontend. [page:41]
- **Express.js** + **Node.js** for the backend. [page:41]
- **Vite** for frontend development and builds. [page:41]
- **Tailwind CSS** + **Radix UI** + **shadcn/ui** for the interface. [page:41]
- **TanStack Query** for server state. [page:41]
- **React Hook Form** + **Zod** for validated form handling. [page:41]
- **Drizzle ORM** + **Neon PostgreSQL** for persistence. [page:41]

---

## Use cases

RubyFileLister is useful for:

- Scanning engineering or scripting repositories for supported code files.
- Building documentation-friendly file inventories.
- Reviewing project structure before refactoring or migration.
- Exporting file metadata for audit or reporting workflows.
- Linking file inventories to GitHub history for change tracking.

---

## Documentation

The main architectural notes currently live in `replit.md`, which documents the frontend and backend architecture, storage model, export behavior, and external dependencies. Since the repository does not currently have a public README, adding this file will make the project much easier to understand at a glance. [page:41]

---

## References

- [SWMMEnablement/RubyFileLister](https://github.com/SWMMEnablement/RubyFileLister)
- [Replit app](https://replit.com/@robertdickinson/RubyFileLister)

---

## License

Add the project license here if one is intended for public reuse.
