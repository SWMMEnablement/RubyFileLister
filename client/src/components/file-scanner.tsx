import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gem, Settings, HelpCircle } from "lucide-react";
import { ScanControls } from "./scan-controls.tsx";
import { FileList } from "./file-list.tsx";
import { ExportModal } from "./export-modal.tsx";
import { SettingsModal } from "./settings-modal";
import { HelpModal } from "./help-modal";
import type { ScanSession, ScannedFile } from "@shared/schema";

export function FileScanner() {
  const [currentScan, setCurrentScan] = useState<ScanSession | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'local' | 'workspace'>('local');
  const [localFiles, setLocalFiles] = useState<ScannedFile[]>([]);
  const [localDirectoryHandle, setLocalDirectoryHandle] = useState<FileSystemDirectoryHandle | FileList | null>(null);

  // Auto-load the most recent scan on page load
  const { data: scans = [] } = useQuery<ScanSession[]>({
    queryKey: ["/api/scans"],
    queryFn: async () => {
      const response = await fetch("/api/scans");
      if (!response.ok) {
        throw new Error("Failed to fetch scans");
      }
      return response.json();
    },
  });

  // Set the most recent completed scan as current when scans are loaded
  useEffect(() => {
    if (scans.length > 0 && !currentScan) {
      const mostRecentScan = scans.find(scan => scan.status === "completed") || scans[0];
      setCurrentScan(mostRecentScan);
      console.log('FileScanner: Auto-loaded scan:', mostRecentScan.id);
    }
  }, [scans, currentScan]);

  return (
    <>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Gem className="text-primary-foreground text-sm" size={16} />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Multi-Language Code Scanner</h1>
              <p className="text-sm text-muted-foreground">Scan & Analyze Ruby, Python, C, and Fortran Files</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsSettingsModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-settings"
            >
              <Settings className="mr-2" size={16} />
              Settings
            </button>
            <button 
              onClick={() => setIsHelpModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-help"
            >
              <HelpCircle className="mr-2" size={16} />
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-16">
        {/* Sidebar */}
        <aside className="w-80 bg-card border-r border-border overflow-y-auto flex flex-col">
          <ScanControls 
            currentScan={currentScan} 
            onScanStart={setCurrentScan}
            onExport={() => setIsExportModalOpen(true)}
            scanMode={scanMode}
            onScanModeChange={setScanMode}
            onLocalFilesChange={setLocalFiles}
            onDirectoryHandleChange={setLocalDirectoryHandle}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <FileList 
            currentScan={currentScan} 
            localFiles={localFiles}
            isLocalMode={scanMode === 'local'}
          />
        </main>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)}
        scanId={currentScan?.id}
        localFiles={localFiles}
        isLocalMode={scanMode === 'local'}
        localDirectoryHandle={localDirectoryHandle}
      />
      
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      
      <HelpModal 
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </>
  );
}
