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
  selectedLanguages: string[];
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
  
  // Python files
  if (ext === 'py' || ext === 'pyw') {
    if (basename.includes('test')) return 'Test';
    if (basename.includes('model')) return 'Model';
    if (basename.includes('view')) return 'View';
    if (basename.includes('controller') || basename.includes('main')) return 'Controller';
    if (basename.includes('util') || basename.includes('helper')) return 'Helper';
    if (basename.includes('config')) return 'Configuration';
    return 'Python File';
  }
  
  // C files
  if (ext === 'c' || ext === 'h') {
    if (basename.includes('test')) return 'Test';
    if (basename.includes('main')) return 'Controller';
    if (basename.includes('util') || basename.includes('helper')) return 'Helper';
    if (ext === 'h') return 'Header';
    return 'C File';
  }
  
  // Fortran files
  if (['f', 'f90', 'f95', 'f03', 'f08', 'for', 'ftn'].includes(ext)) {
    if (basename.includes('test')) return 'Test';
    if (basename.includes('main') || basename.includes('program')) return 'Main Program';
    if (basename.includes('module') || basename.includes('mod')) return 'Module';
    if (basename.includes('sub') || basename.includes('function')) return 'Subroutine';
    return 'Fortran File';
  }
  
  // Other file types
  const typeMap: Record<string, string> = {
    js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
    html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'SASS',
    json: 'JSON', xml: 'XML', yaml: 'YAML', yml: 'YAML',
    md: 'Markdown', txt: 'Text', log: 'Log',
    java: 'Java', cpp: 'C++', cc: 'C++', cxx: 'C++',
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
          // Don't count or include directories in results - only recurse if needed
          const dirPath = relativePath === './' ? name : `${relativePath}/${name}`;
          
          // Recurse into subdirectories if requested
          if (options.includeSubdirectories) {
            await scanRecursive(handle, dirPath);
          }
        } else if (handle.kind === 'file') {
          totalFiles++;
          
          const file = await handle.getFile();
          const filePath = relativePath === './' ? name : `${relativePath}/${name}`;
          const fileType = getFileType(name, false);
          
          // Filter files based on selected languages
          if (options.selectedLanguages.length > 0 && !matchesSelectedLanguages(name, options.selectedLanguages)) {
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
            modified: new Date(file.lastModified),
            // GitHub commit information (null for local files)
            commitAuthor: null,
            commitEmail: null,
            commitHash: null,
            commitMessage: null,
            commitDate: null,
            githubUrl: null
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
    
    // Filter files based on selected languages
    if (options.selectedLanguages.length > 0 && !matchesSelectedLanguages(name, options.selectedLanguages)) {
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
      modified: new Date(file.lastModified),
      // GitHub commit information (null for local files)
      commitAuthor: null,
      commitEmail: null,
      commitHash: null,
      commitMessage: null,
      commitDate: null,
      githubUrl: null
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