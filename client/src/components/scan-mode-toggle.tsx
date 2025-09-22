import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Computer, FolderOpen } from "lucide-react";
import { getBrowserCompatibilityInfo } from "@/lib/local-scanner";

export type ScanMode = 'local' | 'workspace';

interface ScanModeToggleProps {
  mode: ScanMode;
  onModeChange: (mode: ScanMode) => void;
}

export function ScanModeToggle({ mode, onModeChange }: ScanModeToggleProps) {
  const compatibility = getBrowserCompatibilityInfo();
  
  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <span className="text-sm font-medium text-muted-foreground">Scan Mode:</span>
      
      <div className="flex gap-1">
        <Button
          variant={mode === 'local' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('local')}
          disabled={!compatibility.supported}
          className="gap-2"
          data-testid="button-mode-local"
        >
          <Computer className="h-4 w-4" />
          Local Computer
          {mode === 'local' && <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">Active</Badge>}
        </Button>
        
        <Button
          variant={mode === 'workspace' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onModeChange('workspace')}
          className="gap-2"
          data-testid="button-mode-workspace"
        >
          <FolderOpen className="h-4 w-4" />
          Workspace
          {mode === 'workspace' && <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">Active</Badge>}
        </Button>
      </div>
      
      {!compatibility.supported && (
        <Badge variant="destructive" className="ml-2">
          Local mode unavailable
        </Badge>
      )}
    </div>
  );
}

export function getModeDescription(mode: ScanMode): string {
  switch (mode) {
    case 'local':
      return 'Scan folders on your computer. Files stay private and are processed in your browser.';
    case 'workspace':
      return 'Scan folders in this Replit workspace. Useful for analyzing project files on the server.';
    default:
      return '';
  }
}

export function getDefaultMode(): ScanMode {
  const compatibility = getBrowserCompatibilityInfo();
  return compatibility.supported ? 'local' : 'workspace';
}