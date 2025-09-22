import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scanOptionsSchema, exportOptionsSchema } from "@shared/schema";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { GitHubService } from "./lib/github-service";

// Get supported file extensions for a language
function getLanguageExtensions(language: string): string[] {
  switch (language) {
    case 'ruby': return ['rb'];
    case 'python': return ['py', 'pyw'];
    case 'c': return ['c', 'h'];
    case 'fortran': return ['f', 'f90', 'f95', 'f03', 'f08', 'for', 'ftn'];
    default: return [];
  }
}

// Check if file matches selected languages
function matchesSelectedLanguages(filename: string, selectedLanguages: string[]): boolean {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  for (const language of selectedLanguages) {
    const extensions = getLanguageExtensions(language);
    if (extensions.includes(ext)) {
      return true;
    }
  }
  
  return false;
}

function getFileType(filePath: string): string {
  const fileName = path.basename(filePath).toLowerCase();
  const dirPath = path.dirname(filePath).toLowerCase();
  const extension = path.extname(fileName).toLowerCase().substring(1); // Remove leading dot
  
  // Language-specific file type classification
  if (extension === 'rb') {
    if (fileName.includes('model')) return 'Model';
    if (fileName.includes('controller')) return 'Controller';
    if (fileName.includes('view') || fileName.includes('erb')) return 'View';
    if (fileName.includes('test') || fileName.includes('spec')) return 'Test';
    if (fileName.includes('migration')) return 'Migration';
    if (fileName.includes('helper')) return 'Helper';
    return 'Ruby File';
  }
  
  // Python files
  if (extension === 'py' || extension === 'pyw') {
    if (fileName.includes('test')) return 'Test';
    if (fileName.includes('model')) return 'Model';
    if (fileName.includes('view')) return 'View';
    if (fileName.includes('controller') || fileName.includes('main')) return 'Controller';
    if (fileName.includes('util') || fileName.includes('helper')) return 'Helper';
    if (fileName.includes('config')) return 'Configuration';
    return 'Python File';
  }
  
  // C files
  if (extension === 'c' || extension === 'h') {
    if (fileName.includes('test')) return 'Test';
    if (fileName.includes('main')) return 'Controller';
    if (fileName.includes('util') || fileName.includes('helper')) return 'Helper';
    if (extension === 'h') return 'Header';
    return 'C File';
  }
  
  // Fortran files
  if (['f', 'f90', 'f95', 'f03', 'f08', 'for', 'ftn'].includes(extension)) {
    if (fileName.includes('test')) return 'Test';
    if (fileName.includes('main') || fileName.includes('program')) return 'Main Program';
    if (fileName.includes('module') || fileName.includes('mod')) return 'Module';
    if (fileName.includes('sub') || fileName.includes('function')) return 'Subroutine';
    return 'Fortran File';
  }
  
  // Directory-based patterns (for any project type)
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
      extension === 'json' && (fileName.includes('package') || fileName.includes('tsconfig') || fileName.includes('vite.config'))) return "Configuration";
      
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
          
          // Filter files based on selected languages
          if (options.selectedLanguages.length > 0 && !matchesSelectedLanguages(entry.name, options.selectedLanguages)) {
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
      
      // Security validation - normalize and check if path is within allowed boundaries
      const normalizedPath = path.normalize(options.directory);
      const resolvedPath = path.resolve(normalizedPath);
      const workspacePath = path.resolve('./');
      
      // Allow paths within the current workspace or explicitly allowed directories
      const allowedPathPrefixes = [
        '/home', '/workspace', '/tmp',
        'C:\\Users', 'D:\\', 'E:\\', 'F:\\', 'G:\\',
        /^[A-Z]:\\Users/i
      ];
      
      const isWithinWorkspace = resolvedPath.startsWith(workspacePath);
      const isExplicitlyAllowed = allowedPathPrefixes.some(prefix => {
        if (typeof prefix === 'string') {
          return normalizedPath.startsWith(prefix) || resolvedPath.startsWith(path.resolve(prefix));
        } else {
          return prefix.test(normalizedPath);
        }
      });
      
      const isAllowedPath = isWithinWorkspace || isExplicitlyAllowed;
      
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
        selectedLanguages: options.selectedLanguages,
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
        // Check if this might be a GitHub repository
        const githubToken = process.env.GITHUB_TOKEN;
        const repoInfo = GitHubService.parseRepoInfo(options.directory);
        
        let enrichedFiles = files;
        
        // If we have a GitHub token and detected a repository, fetch commit information
        if (githubToken && repoInfo) {
          try {
            console.log(`Detected GitHub repository: ${repoInfo.owner}/${repoInfo.repo}`);
            const githubService = new GitHubService(githubToken);
            
            // Test connection first
            const canAccess = await githubService.testConnection(repoInfo);
            if (canAccess) {
              console.log(`Fetching commit information for ${files.length} files...`);
              const commitMap = await githubService.getCommitInfoForFiles(repoInfo, files);
              
              // Enrich files with commit information
              enrichedFiles = files.map(file => {
                const commitInfo = commitMap.get(file.id);
                if (commitInfo) {
                  return {
                    ...file,
                    commitAuthor: commitInfo.author,
                    commitEmail: commitInfo.email,
                    commitHash: commitInfo.hash,
                    commitMessage: commitInfo.message,
                    commitDate: commitInfo.date,
                    githubUrl: commitInfo.url
                  };
                }
                return {
                  ...file,
                  commitAuthor: null,
                  commitEmail: null,
                  commitHash: null,
                  commitMessage: null,
                  commitDate: null,
                  githubUrl: null
                };
              });
              
              console.log(`Successfully enriched ${commitMap.size} files with commit information`);
            } else {
              console.warn('Could not access GitHub repository - check token permissions');
            }
          } catch (error) {
            console.error('Error fetching GitHub commit information:', error);
            // Continue without commit info if there's an error
            enrichedFiles = files.map(file => ({
              ...file,
              commitAuthor: null,
              commitEmail: null,
              commitHash: null,
              commitMessage: null,
              commitDate: null,
              githubUrl: null
            }));
          }
        } else {
          // No GitHub token or not a GitHub repository - add null commit fields
          enrichedFiles = files.map(file => ({
            ...file,
            commitAuthor: null,
            commitEmail: null,
            commitHash: null,
            commitMessage: null,
            commitDate: null,
            githubUrl: null
          }));
        }
        
        // Save all found files with commit information
        for (const file of enrichedFiles) {
          await storage.addScannedFile({
            ...file,
            scanId: session.id,
          });
        }
        
        // Update session as completed
        await storage.updateScanSession(session.id, {
          status: "completed",
          totalFiles: totalScanned,
          foundFiles: enrichedFiles.length,
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
  
  // Browse directories for folder selection
  app.get("/api/browse", async (req, res) => {
    try {
      const { path: browsePath = "./" } = req.query;
      const targetPath = browsePath as string;
      
      // Security validation - normalize and check if path is within allowed boundaries
      const normalizedPath = path.normalize(targetPath);
      const resolvedPath = path.resolve(normalizedPath);
      const workspacePath = path.resolve('./');
      
      // Allow paths within the current workspace or explicitly allowed directories
      const allowedPathPrefixes = [
        '/home', '/workspace', '/tmp',
        'C:\\Users', 'D:\\', 'E:\\', 'F:\\', 'G:\\',
        /^[A-Z]:\\Users/i
      ];
      
      const isWithinWorkspace = resolvedPath.startsWith(workspacePath);
      const isExplicitlyAllowed = allowedPathPrefixes.some(prefix => {
        if (typeof prefix === 'string') {
          return normalizedPath.startsWith(prefix) || resolvedPath.startsWith(path.resolve(prefix));
        } else {
          return prefix.test(normalizedPath);
        }
      });
      
      const isAllowedPath = isWithinWorkspace || isExplicitlyAllowed;
      
      if (!isAllowedPath) {
        return res.status(403).json({ message: "Directory access not permitted" });
      }
      
      // Check if directory exists
      try {
        await fs.access(targetPath);
        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
          return res.status(400).json({ message: "Path is not a directory" });
        }
      } catch {
        return res.status(400).json({ message: "Directory does not exist or is not accessible" });
      }
      
      // Read directory contents
      const entries = await fs.readdir(targetPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
        .map(entry => ({
          name: entry.name,
          path: path.join(targetPath, entry.name),
          relativePath: path.relative('./', path.join(targetPath, entry.name))
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        currentPath: targetPath,
        parentPath: targetPath !== './' ? path.dirname(targetPath) : null,
        directories
      });
    } catch (error) {
      console.error("Browse error:", error);
      res.status(500).json({ message: "Failed to browse directory" });
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
