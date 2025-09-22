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
import { FolderSelector } from "./folder-selector.tsx";
import type { ScanSession, ScanOptions } from "@shared/schema";

interface ScanControlsProps {
  currentScan: ScanSession | null;
  onScanStart: (scan: ScanSession) => void;
  onExport: () => void;
}

export function ScanControls({ currentScan, onScanStart, onExport }: ScanControlsProps) {
  const [selectedDirectory, setSelectedDirectory] = useState("");
  const [showFolderSelector, setShowFolderSelector] = useState(false);
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

  const handleDirectorySelect = () => {
    setShowFolderSelector(true);
  };
  
  const handleFolderSelect = (path: string) => {
    setSelectedDirectory(path);
    setScanOptions(prev => ({ ...prev, directory: path }));
    setShowFolderSelector(false);
    
    // Store in localStorage for future suggestions
    const recentPaths = JSON.parse(localStorage.getItem('recentDirectories') || '[]');
    const updatedPaths = [path, ...recentPaths.filter((p: string) => p !== path)].slice(0, 5);
    localStorage.setItem('recentDirectories', JSON.stringify(updatedPaths));
  };
  
  const handleFolderCancel = () => {
    setShowFolderSelector(false);
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

      {/* Folder Selector Modal */}
      {showFolderSelector && (
        <FolderSelector 
          onSelect={handleFolderSelect}
          onCancel={handleFolderCancel}
        />
      )}
    </>
  );
}
