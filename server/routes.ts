import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanOptionsSchema, exportOptionsSchema } from "@shared/schema";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

function getFileType(filePath: string): string {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();
  const extension = path.extname(fileName).toLowerCase();
  
  // Ruby on Rails patterns
  if (dirPath.includes('/models/') || dirPath.includes('\\models\\')) return "Model";
  if (dirPath.includes('/controllers/') || dirPath.includes('\\controllers\\')) return "Controller";
  if (dirPath.includes('/views/') || dirPath.includes('\\views\\')) return "View";
  
  // TypeScript/JavaScript patterns
  if (dirPath.includes('/components/') || dirPath.includes('\\components\\') ||
      dirPath.includes('/src/components/') || dirPath.includes('\\src\\components\\')) return "View";
  if (dirPath.includes('/pages/') || dirPath.includes('\\pages\\') ||
      dirPath.includes('/src/pages/') || dirPath.includes('\\src\\pages\\')) return "View";
  if (dirPath.includes('/services/') || dirPath.includes('\\services\\') ||
      dirPath.includes('/src/services/') || dirPath.includes('\\src\\services\\')) return "Controller";
  if (dirPath.includes('/hooks/') || dirPath.includes('\\hooks\\') ||
      dirPath.includes('/src/hooks/') || dirPath.includes('\\src\\hooks\\')) return "Controller";
  if (dirPath.includes('/utils/') || dirPath.includes('\\utils\\') ||
      dirPath.includes('/src/utils/') || dirPath.includes('\\src\\utils\\')) return "Helper";
  if (dirPath.includes('/lib/') || dirPath.includes('\\lib\\') ||
      dirPath.includes('/src/lib/') || dirPath.includes('\\src\\lib\\')) return "Library";
  
  // Test patterns (for any project type)
  if (dirPath.includes('/spec/') || dirPath.includes('\\spec\\') || 
      dirPath.includes('/test/') || dirPath.includes('\\test\\') ||
      dirPath.includes('/__tests__/') || dirPath.includes('\\__tests__\\') ||
      fileName.includes('_spec.') || fileName.includes('_test.') ||
      fileName.includes('.spec.') || fileName.includes('.test.')) return "Test";
  
  // Configuration patterns
  if (dirPath.includes('/config/') || dirPath.includes('\\config\\') ||
      fileName.includes('config') || fileName.includes('.config.') ||
      extension === '.json' && (fileName.includes('package') || fileName.includes('tsconfig') || fileName.includes('vite.config'))) return "Configuration";
      
  // Shared/Schema patterns  
  if (dirPath.includes('/shared/') || dirPath.includes('\\shared\\') ||
      fileName.includes('schema') || fileName.includes('types')) return "Model";
  
  // Migrations patterns
  if (dirPath.includes('/migrations/') || dirPath.includes('\\migrations\\') ||
      dirPath.includes('/migrate/') || dirPath.includes('\\migrate\\')) return "Migration";
  
  return "Other";
}

async function scanDirectory(
  dirPath: string, 
  options: z.infer<typeof scanOptionsSchema>,
  onProgress?: (current: number, found: number) => void
): Promise<{ files: Array<{ name: string; path: string; relativePath: string; size: number; modified: Date; type: string }>, totalScanned: number }> {
  const files: Array<{ name: string; path: string; relativePath: string; size: number; modified: Date; type: string }> = [];
  let totalScanned = 0;

  async function scanRecursive(currentPath: string, basePath: string) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        // Skip hidden files if not requested
        if (!options.showHiddenFiles && entry.name.startsWith('.')) {
          continue;
        }
        
        if (entry.isDirectory() && options.includeSubdirectories) {
          await scanRecursive(fullPath, basePath);
        } else if (entry.isFile()) {
          totalScanned++;
          
          // Check if it's a Ruby file when rubyFilesOnly is true
          if (options.rubyFilesOnly && !entry.name.endsWith('.rb')) {
            continue;
          }
          
          try {
            const stats = await fs.stat(fullPath);
            const fileInfo = {
              name: entry.name,
              path: fullPath,
              relativePath: relativePath.startsWith('.') ? relativePath : `./${relativePath}`,
              size: stats.size,
              modified: stats.mtime,
              type: getFileType(fullPath)
            };
            
            files.push(fileInfo);
            
            if (onProgress) {
              onProgress(totalScanned, files.length);
            }
          } catch (error) {
            console.warn(`Error reading file stats for ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Error reading directory ${currentPath}:`, error);
    }
  }
  
  await scanRecursive(dirPath, dirPath);
  return { files, totalScanned };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Start a new scan
  app.post("/api/scan", async (req, res) => {
    try {
      const options = scanOptionsSchema.parse(req.body);
      
      // Security validation - prevent scanning sensitive system directories
      const allowedPathPrefixes = [
        // Unix/Linux paths
        '/home', '/workspace', '/tmp', './',
        // Windows paths
        'C:\\Users', 'D:\\', 'E:\\', 'F:\\', 'G:\\',
        // Allow any drive letter with Users folder
        /^[A-Z]:\\Users/i,
        // Allow relative paths
        /^\.[\\/]/
      ];
      
      const isAllowedPath = allowedPathPrefixes.some(prefix => {
        if (typeof prefix === 'string') {
          return options.directory.startsWith(prefix) || options.directory.startsWith(path.resolve(prefix));
        } else {
          // Handle regex patterns
          return prefix.test(options.directory);
        }
      });
      
      if (!isAllowedPath) {
        return res.status(403).json({ message: "Directory access not permitted" });
      }
      
      // Check if directory exists
      try {
        await fs.access(options.directory);
      } catch {
        return res.status(400).json({ message: "Directory does not exist or is not accessible" });
      }
      
      // Create scan session
      const session = await storage.createScanSession({
        directory: options.directory,
        includeSubdirectories: options.includeSubdirectories,
        showHiddenFiles: options.showHiddenFiles,
        rubyFilesOnly: options.rubyFilesOnly,
        status: "scanning",
        totalFiles: 0,
        foundFiles: 0,
      });
      
      // Start scanning in background
      scanDirectory(options.directory, options, async (current, found) => {
        await storage.updateScanSession(session.id, {
          totalFiles: current,
          foundFiles: found,
        });
      }).then(async ({ files, totalScanned }) => {
        // Save all found files
        for (const file of files) {
          await storage.addScannedFile({
            ...file,
            scanId: session.id,
          });
        }
        
        // Update session as completed
        await storage.updateScanSession(session.id, {
          status: "completed",
          totalFiles: totalScanned,
          foundFiles: files.length,
        });
      }).catch(async (error) => {
        console.error("Scan error:", error);
        await storage.updateScanSession(session.id, {
          status: "error"
        });
      });
      
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid scan options", errors: error.errors });
      }
      console.error("Scan start error:", error);
      res.status(500).json({ message: "Failed to start scan" });
    }
  });
  
  // Get all scan sessions
  app.get("/api/scans", async (req, res) => {
    try {
      const sessions = await storage.getAllScanSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Get scans error:", error);
      res.status(500).json({ message: "Failed to get scan sessions" });
    }
  });
  
  // Get scan session status
  app.get("/api/scan/:id", async (req, res) => {
    try {
      const session = await storage.getScanSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Scan session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Get scan error:", error);
      res.status(500).json({ message: "Failed to get scan session" });
    }
  });
  
  // Get scanned files
  app.get("/api/scan/:id/files", async (req, res) => {
    try {
      const { search = "", type = "" } = req.query;
      console.log(`DEBUG: Files request - scanId: ${req.params.id}, search: "${search}", type: "${type}"`);
      
      const files = await storage.searchScannedFiles(
        req.params.id, 
        search as string, 
        type as string
      );
      
      console.log(`DEBUG: Found ${files.length} files after filtering`);
      if (files.length > 0) {
        console.log(`DEBUG: Sample file types: ${files.slice(0, 3).map(f => f.type).join(', ')}`);
      }
      
      res.json(files);
    } catch (error) {
      console.error("Get files error:", error);
      res.status(500).json({ message: "Failed to get scanned files" });
    }
  });
  
  // Export files
  app.post("/api/export", async (req, res) => {
    try {
      const options = exportOptionsSchema.parse(req.body);
      const files = await storage.getScannedFilesByScanId(options.scanId);
      
      let content = "";
      let contentType = "text/plain";
      let filename = `${options.filename}.${options.format}`;
      
      switch (options.format) {
        case "txt":
          content = files.map(file => {
            let line = file.name;
            if (options.includePaths) line += ` - ${file.relativePath}`;
            if (options.includeSizes) line += ` (${(file.size / 1024).toFixed(1)} KB)`;
            if (options.includeModified) line += ` - Modified: ${file.modified.toLocaleDateString()}`;
            return line;
          }).join('\n');
          break;
          
        case "csv":
          contentType = "text/csv";
          const headers = ["Name"];
          if (options.includePaths) headers.push("Path");
          if (options.includeSizes) headers.push("Size (KB)");
          if (options.includeModified) headers.push("Modified");
          headers.push("Type");
          
          const rows = files.map(file => {
            const row = [file.name];
            if (options.includePaths) row.push(file.relativePath);
            if (options.includeSizes) row.push((file.size / 1024).toFixed(1));
            if (options.includeModified) row.push(file.modified.toLocaleDateString());
            row.push(file.type);
            return row.map(cell => `"${cell}"`).join(',');
          });
          
          content = [headers.join(','), ...rows].join('\n');
          break;
          
        case "json":
          contentType = "application/json";
          const exportData = files.map(file => {
            const data: any = { name: file.name, type: file.type };
            if (options.includePaths) data.path = file.relativePath;
            if (options.includeSizes) data.sizeKB = (file.size / 1024).toFixed(1);
            if (options.includeModified) data.modified = file.modified.toISOString();
            return data;
          });
          content = JSON.stringify(exportData, null, 2);
          break;
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid export options", errors: error.errors });
      }
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export files" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
