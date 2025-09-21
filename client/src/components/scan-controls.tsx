import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderOpen, Search, FileText, FileSpreadsheet, FileCode2, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ScanSession, ScanOptions } from "@shared/schema";

interface ScanControlsProps {
  currentScan: ScanSession | null;
  onScanStart: (scan: ScanSession) => void;
  onExport: () => void;
}

export function ScanControls({ currentScan, onScanStart, onExport }: ScanControlsProps) {
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [scanOptions, setScanOptions] = useState<ScanOptions>({
    directory: "",
    includeSubdirectories: true,
    showHiddenFiles: false,
    rubyFilesOnly: false,
  });
  const { toast } = useToast();

  // Poll scan progress if scanning
  const { data: scanData } = useQuery({
    queryKey: ["/api/scan", currentScan?.id],
    enabled: !!currentScan && currentScan.status === "scanning",
    refetchInterval: 1000,
  });

  const scanMutation = useMutation({
    mutationFn: async (options: ScanOptions) => {
      const response = await apiRequest("POST", "/api/scan", options);
      return response.json();
    },
    onSuccess: (scan: ScanSession) => {
      onScanStart(scan);
      toast({
        title: "Scan Started",
        description: "Directory scanning has begun.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to start directory scan.",
        variant: "destructive",
      });
    },
  });

  const handleDirectorySelect = async () => {
    // Enhanced input modal for server-side directory selection
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    
    // Get recent directories from localStorage
    const recentPaths = JSON.parse(localStorage.getItem('recentDirectories') || '[]');
    
    const commonPaths = [
      ...recentPaths.slice(0, 3), // Show top 3 recent paths first
      './',
      '../',
      './src',
      './client',
      './server',
      'C:\\Users',
      'C:\\Projects',
      'C:\\Development',
      '/home',
      '/Users',
      '/workspace',
      '/tmp'
    ].filter((path, index, arr) => arr.indexOf(path) === index); // Remove duplicates
    
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full mx-4">
        <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Select Server Directory</h3>
        
        <div class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
          <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Important:</strong> This scans directories on the server, not your local machine. 
            Enter paths accessible to the server environment.
          </p>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter server directory path:</label>
          <input 
            type="text" 
            placeholder="Enter server path (e.g., ./ for current directory)" 
            class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white" 
            id="directory-input"
            data-testid="input-directory-path"
          >
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quick select paths:</label>
          <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            ${commonPaths.map((path, index) => 
              `<button class="text-left p-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded border text-gray-700 dark:text-gray-300 common-path-btn" data-path="${path}" data-testid="button-path-${index}">${path}${recentPaths.includes(path) ? ' (recent)' : ''}</button>`
            ).join('')}
          </div>
        </div>
        
        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>Server Path Examples:</strong><br>
            • Current directory: <code>./</code><br>
            • Parent directory: <code>../</code><br>
            • Specific folder: <code>./my-project</code><br>
            • Absolute path: <code>/workspace/project</code>
          </p>
        </div>
        
        <div class="flex gap-2">
          <button class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors" id="confirm-btn" data-testid="button-confirm-directory">
            Select Directory
          </button>
          <button class="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors" id="cancel-btn" data-testid="button-cancel-directory">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');
    const directoryInput = modal.querySelector('#directory-input') as HTMLInputElement;
    const commonPathBtns = modal.querySelectorAll('.common-path-btn');
    
    // Handle common path button clicks
    commonPathBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path') || '';
        directoryInput.value = path;
      });
    });
    
    // Handle confirm
    confirmBtn?.addEventListener('click', () => {
      const path = directoryInput.value.trim();
      if (path) {
        setSelectedDirectory(path);
        setScanOptions(prev => ({ ...prev, directory: path }));
        
        // Store in localStorage for future suggestions
        const recentPaths = JSON.parse(localStorage.getItem('recentDirectories') || '[]');
        const updatedPaths = [path, ...recentPaths.filter((p: string) => p !== path)].slice(0, 5);
        localStorage.setItem('recentDirectories', JSON.stringify(updatedPaths));
      }
      document.body.removeChild(modal);
    });
    
    // Handle cancel
    cancelBtn?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Handle click outside modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Handle Enter key
    directoryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        (confirmBtn as HTMLButtonElement)?.click();
      }
    });
    
    // Focus input
    setTimeout(() => directoryInput.focus(), 100);
  };

  const handleScanStart = () => {
    if (!scanOptions.directory) {
      toast({
        title: "No Directory Selected",
        description: "Please select a directory to scan first.",
        variant: "destructive",
      });
      return;
    }
    
    scanMutation.mutate(scanOptions);
  };

  const currentScanData = (scanData as ScanSession) || currentScan;
  const isScanning = currentScanData?.status === "scanning";
  const progress = currentScanData?.totalFiles ? 
    Math.round(((currentScanData.foundFiles || 0) / Math.max(currentScanData.totalFiles, 1)) * 100) : 0;

  return (
    <>
      {/* Folder Selection Section */}
      <div className="p-6 border-b border-border">
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-medium text-foreground mb-3">Select Directory</h2>
            <Button 
              onClick={handleDirectorySelect}
              className="w-full flex items-center justify-center"
              data-testid="button-select-folder"
            >
              <FolderOpen className="mr-2" size={16} />
              Choose Folder
            </Button>
          </div>
          
          {/* Selected Folder Display */}
          {selectedDirectory && (
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-start space-x-3">
                <Folder className="text-muted-foreground mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground" data-testid="text-folder-name">
                    {selectedDirectory.split('/').pop() || selectedDirectory.split('\\').pop()}
                  </p>
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-folder-path">
                    {selectedDirectory}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scan Controls */}
      <div className="p-6 border-b border-border">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Scan Options</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="subdirectories" 
                checked={scanOptions.includeSubdirectories}
                onCheckedChange={(checked) => 
                  setScanOptions(prev => ({ ...prev, includeSubdirectories: !!checked }))
                }
                data-testid="checkbox-subdirectories"
              />
              <Label htmlFor="subdirectories" className="text-sm text-foreground">
                Include subdirectories
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hidden" 
                checked={scanOptions.showHiddenFiles}
                onCheckedChange={(checked) => 
                  setScanOptions(prev => ({ ...prev, showHiddenFiles: !!checked }))
                }
                data-testid="checkbox-hidden-files"
              />
              <Label htmlFor="hidden" className="text-sm text-foreground">
                Show hidden files
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="rubyonly" 
                checked={scanOptions.rubyFilesOnly}
                onCheckedChange={(checked) => 
                  setScanOptions(prev => ({ ...prev, rubyFilesOnly: !!checked }))
                }
                data-testid="checkbox-ruby-only"
              />
              <Label htmlFor="rubyonly" className="text-sm text-foreground">
                Scan .rb files only
              </Label>
            </div>
          </div>
          
          <Button 
            onClick={handleScanStart}
            disabled={isScanning || scanMutation.isPending}
            variant="secondary"
            className="w-full"
            data-testid="button-start-scan"
          >
            <Search className="mr-2" size={16} />
            {isScanning ? "Scanning..." : "Start Scan"}
          </Button>
        </div>
      </div>

      {/* Progress Indicator */}
      {currentScanData && (
        <div className="p-6 border-b border-border">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Scanning Progress</span>
              <span className="text-xs text-muted-foreground" data-testid="text-progress-percentage">
                {isScanning ? `${progress}%` : "Completed"}
              </span>
            </div>
            <Progress value={isScanning ? progress : 100} className="w-full" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span data-testid="text-files-scanned">
                {currentScanData?.totalFiles || 0} files scanned
              </span>
              <span data-testid="text-ruby-files-found">
                {currentScanData?.foundFiles || 0} .rb files found
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Export Section */}
      <div className="p-6 mt-auto">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Export Results</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
              disabled={!currentScan || currentScan.status !== "completed"}
              data-testid="button-export-txt"
            >
              <FileText className="mr-1" size={14} />
              .TXT
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
              disabled={!currentScan || currentScan.status !== "completed"}
              data-testid="button-export-csv"
            >
              <FileSpreadsheet className="mr-1" size={14} />
              .CSV
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onExport}
            disabled={!currentScan || currentScan.status !== "completed"}
            data-testid="button-export-json"
          >
            <FileCode2 className="mr-1" size={14} />
            Export as JSON
          </Button>
        </div>
      </div>
    </>
  );
}
