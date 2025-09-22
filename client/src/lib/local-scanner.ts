import type { ScannedFile } from '@shared/schema';

// TypeScript declarations for File System Access API
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
  
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemDirectoryHandle | FileSystemFileHandle]>;
  }
}

export interface ScanOptions {
  includeSubdirectories: boolean;
  showHiddenFiles: boolean;
  rubyFilesOnly: boolean;
}

export interface ScanProgress {
  status: 'scanning' | 'completed' | 'cancelled' | 'error';
  totalFiles: number;
  foundFiles: number;
  currentDirectory?: string;
}

export type ProgressCallback = (progress: ScanProgress) => void;

// Check if File System Access API is supported
export function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}

// Check if webkitdirectory is supported
export function isWebkitDirectorySupported(): boolean {
  const input = document.createElement('input');
  return 'webkitdirectory' in input;
}

// Get file type classification (reused from server logic)
function getFileType(filename: string, isDirectory: boolean): string {
  if (isDirectory) return 'Directory';
  
  const ext = filename.toLowerCase().split('.').pop() || '';
  const basename = filename.toLowerCase();
  
  // Ruby files
  if (ext === 'rb') {
    if (basename.includes('model')) return 'Model';
    if (basename.includes('controller')) return 'Controller';
    if (basename.includes('view') || basename.includes('erb')) return 'View';
    if (basename.includes('test') || basename.includes('spec')) return 'Test';
    if (basename.includes('migration')) return 'Migration';
    if (basename.includes('helper')) return 'Helper';
    return 'Ruby File';
  }
  
  // Other file types
  const typeMap: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
    html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'SASS',
    json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML',
    md: 'Markdown', txt: 'Text', log: 'Log',
    py: 'Python', java: 'Java', cpp: 'C++', c: 'C',
    php: 'PHP', go: 'Go', rs: 'Rust', swift: 'Swift'
  };
  
  return typeMap[ext] || 'Other';
}

// Build relative path from directory handle
async function getRelativePath(dirHandle: FileSystemDirectoryHandle, rootHandle: FileSystemDirectoryHandle): Promise<string> {
  if (dirHandle === rootHandle) return './';
  
  try {
    const pathParts: string[] = [];
    let currentHandle = dirHandle;
    
    // Walk up the directory tree until we reach the root
    while (currentHandle !== rootHandle) {
      // This is a simplified approach - in real implementation, we'd need to track the path during traversal
      break;
    }
    
    return pathParts.length > 0 ? `./${pathParts.reverse().join('/')}` : './';
  } catch {
    return './';
  }
}

// Scan directory using File System Access API
export async function scanDirectoryWithFSA(
  dirHandle: FileSystemDirectoryHandle,
  options: ScanOptions,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  let totalFiles = 0;
  
  const rootName = dirHandle.name;
  
  async function scanRecursive(
    currentHandle: FileSystemDirectoryHandle,
    relativePath: string
  ): Promise<void> {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled');
    }
    
    onProgress({
      status: 'scanning',
      totalFiles,
      foundFiles: files.length,
      currentDirectory: relativePath
    });
    
    try {
      for await (const [name, handle] of currentHandle.entries()) {
        if (abortSignal?.aborted) {
          throw new Error('Scan cancelled');
        }
        
        // Skip hidden files if not requested
        if (!options.showHiddenFiles && name.startsWith('.')) {
          continue;
        }
        
        if (handle.kind === 'directory') {
          totalFiles++;
          
          const dirPath = relativePath === './' ? name : `${relativePath}/${name}`;
          const fileType = getFileType(name, true);
          
          // Add directory to results
          if (!options.rubyFilesOnly) {
            files.push({
              id: crypto.randomUUID(),
              scanId: '', // Will be set by parent component
              name,
              path: dirPath,
              relativePath: dirPath,
              size: 0,
              type: fileType,
              modified: new Date()
            });
          }
          
          // Recurse into subdirectories if requested
          if (options.includeSubdirectories) {
            await scanRecursive(handle, dirPath);
          }
        } else if (handle.kind === 'file') {
          totalFiles++;
          
          const file = await handle.getFile();
          const filePath = relativePath === './' ? name : `${relativePath}/${name}`;
          const fileType = getFileType(name, false);
          
          // Filter Ruby files if requested
          if (options.rubyFilesOnly && !name.toLowerCase().endsWith('.rb')) {
            continue;
          }
          
          files.push({
            id: crypto.randomUUID(),
            scanId: '', // Will be set by parent component
            name,
            path: filePath,
            relativePath: filePath,
            size: file.size,
            type: fileType,
            modified: new Date(file.lastModified)
          });
        }
        
        // Update progress periodically
        if (totalFiles % 10 === 0) {
          onProgress({
            status: 'scanning',
            totalFiles,
            foundFiles: files.length,
            currentDirectory: relativePath
          });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Scan cancelled') {
        throw error;
      }
      console.warn(`Error scanning directory ${relativePath}:`, error);
    }
  }
  
  try {
    await scanRecursive(dirHandle, './');
    
    onProgress({
      status: 'completed',
      totalFiles,
      foundFiles: files.length
    });
    
    return files;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled') {
      onProgress({
        status: 'cancelled',
        totalFiles,
        foundFiles: files.length
      });
    } else {
      onProgress({
        status: 'error',
        totalFiles,
        foundFiles: files.length
      });
    }
    throw error;
  }
}

// Scan directory using webkitdirectory fallback
export async function scanDirectoryWithWebkit(
  fileList: FileList,
  options: ScanOptions,
  onProgress: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  const totalFiles = fileList.length;
  
  for (let i = 0; i < fileList.length; i++) {
    if (abortSignal?.aborted) {
      onProgress({
        status: 'cancelled',
        totalFiles,
        foundFiles: files.length
      });
      throw new Error('Scan cancelled');
    }
    
    const file = fileList[i];
    const relativePath = file.webkitRelativePath;
    const pathParts = relativePath.split('/');
    const name = pathParts[pathParts.length - 1];
    
    // Skip hidden files if not requested
    if (!options.showHiddenFiles && pathParts.some(part => part.startsWith('.'))) {
      continue;
    }
    
    // Handle subdirectories
    if (!options.includeSubdirectories && pathParts.length > 2) {
      continue;
    }
    
    const fileType = getFileType(name, false);
    
    // Filter Ruby files if requested
    if (options.rubyFilesOnly && !name.toLowerCase().endsWith('.rb')) {
      continue;
    }
    
    files.push({
      id: crypto.randomUUID(),
      scanId: '', // Will be set by parent component
      name,
      path: `./${relativePath}`,
      relativePath: `./${relativePath}`,
      size: file.size,
      type: fileType,
      modified: new Date(file.lastModified)
    });
    
    // Update progress
    if (i % 50 === 0) {
      onProgress({
        status: 'scanning',
        totalFiles,
        foundFiles: files.length,
        currentDirectory: pathParts.slice(0, -1).join('/')
      });
    }
  }
  
  onProgress({
    status: 'completed',
    totalFiles,
    foundFiles: files.length
  });
  
  return files;
}

// Main scanner class
export class LocalScanner {
  private abortController: AbortController | null = null;
  
  async pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!isFileSystemAccessSupported()) {
      throw new Error('File System Access API not supported');
    }
    
    try {
      return await window.showDirectoryPicker();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null; // User cancelled
      }
      throw error;
    }
  }
  
  async scanDirectory(
    dirHandle: FileSystemDirectoryHandle,
    options: ScanOptions,
    onProgress: ProgressCallback
  ): Promise<ScannedFile[]> {
    this.abortController = new AbortController();
    
    return scanDirectoryWithFSA(
      dirHandle,
      options,
      onProgress,
      this.abortController.signal
    );
  }
  
  async scanWebkitDirectory(
    fileList: FileList,
    options: ScanOptions,
    onProgress: ProgressCallback
  ): Promise<ScannedFile[]> {
    this.abortController = new AbortController();
    
    return scanDirectoryWithWebkit(
      fileList,
      options,
      onProgress,
      this.abortController.signal
    );
  }
  
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}

// Browser compatibility info
export function getBrowserCompatibilityInfo() {
  const hasFileSystemAccess = isFileSystemAccessSupported();
  const hasWebkitDirectory = isWebkitDirectorySupported();
  
  if (hasFileSystemAccess) {
    return {
      supported: true,
      method: 'File System Access API',
      note: 'Full directory picker support'
    };
  } else if (hasWebkitDirectory) {
    return {
      supported: true,
      method: 'webkitdirectory',
      note: 'Limited directory selection (upload-style)'
    };
  } else {
    return {
      supported: false,
      method: 'none',
      note: 'Browser does not support local directory access'
    };
  }
}