import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const scannedFiles = pgTable("scanned_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  path: text("path").notNull(),
  relativePath: text("relative_path").notNull(),
  size: integer("size").notNull(),
  modified: timestamp("modified").notNull(),
  type: text("type").notNull(), // "Model", "Controller", "View", "Test", "Configuration", etc.
  scanId: varchar("scan_id").notNull(),
});

export const scanSessions = pgTable("scan_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directory: text("directory").notNull(),
  includeSubdirectories: boolean("include_subdirectories").notNull().default(true),
  showHiddenFiles: boolean("show_hidden_files").notNull().default(false),
  selectedLanguages: text("selected_languages").array().notNull().default(sql`'{"ruby"}'`), // Array of language codes: ruby, python, c, fortran
  status: text("status").notNull().default("pending"), // "pending", "scanning", "completed", "error"
  totalFiles: integer("total_files").default(0),
  foundFiles: integer("found_files").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const insertScannedFileSchema = createInsertSchema(scannedFiles).omit({
  id: true,
});

export const insertScanSessionSchema = createInsertSchema(scanSessions).omit({
  id: true,
  createdAt: true,
});

export const scanOptionsSchema = z.object({
  directory: z.string().min(1, "Directory path is required"),
  includeSubdirectories: z.boolean().default(true),
  showHiddenFiles: z.boolean().default(false),
  selectedLanguages: z.array(z.enum(["ruby", "python", "c", "fortran"])).min(1, "At least one language must be selected").default(["ruby"]),
});

export const exportOptionsSchema = z.object({
  format: z.enum(["txt", "csv", "json"]),
  filename: z.string().min(1, "Filename is required"),
  includePaths: z.boolean().default(true),
  includeSizes: z.boolean().default(true),
  includeModified: z.boolean().default(false),
  scanId: z.string(),
});

export type ScannedFile = typeof scannedFiles.$inferSelect;
export type InsertScannedFile = z.infer<typeof insertScannedFileSchema>;
export type ScanSession = typeof scanSessions.$inferSelect;
export type InsertScanSession = z.infer<typeof insertScanSessionSchema>;
export type ScanOptions = z.infer<typeof scanOptionsSchema>;
export type ExportOptions = z.infer<typeof exportOptionsSchema>;
