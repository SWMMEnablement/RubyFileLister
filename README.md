RubyFileLister

RubyFileLister is a full-stack web app for recursively scanning a source-code directory tree, classifying the files it finds, and exporting the resulting inventory. It supports Ruby, Python, C, and Fortran source files, sorting them into categories such as model, controller, view, and test, and lets you search and filter the scanned results in the browser with real-time progress updates while a scan runs.

The app can export scan results as TXT, CSV, or JSON, and when a scanned directory is backed by GitHub, it can fetch and display file-level commit metadata, including author, message, date, and a link to the commit. The frontend is built with React, TypeScript, and Vite using shadcn/ui components, and the backend is Node.js and Express with PostgreSQL via Drizzle ORM for storing scan sessions and file results.

Released under the MIT License (see LICENSE).
