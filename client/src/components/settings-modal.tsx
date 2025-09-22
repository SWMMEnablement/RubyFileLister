import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, X, Info, Monitor, Folder } from "lucide-react";
import { getBrowserCompatibilityInfo } from "@/lib/local-scanner";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const compatibility = getBrowserCompatibilityInfo();
  
  const clearRecentDirectories = () => {
    localStorage.removeItem('recentDirectories');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-lg" data-testid="modal-settings">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-settings">
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Browser Compatibility Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Browser Compatibility
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Local folder access:</span>
                <Badge variant={compatibility.supported ? "default" : "destructive"}>
                  {compatibility.method}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {compatibility.note}
              </p>
              {!compatibility.supported && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  💡 For best experience, use Chrome, Edge, or Safari 16.4+
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Application Info Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Application Info
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Version:</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Build:</span>
                <span>Just Counting GitHub File Scanner</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span>Development</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Management Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <Folder className="h-4 w-4" />
              Data Management
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Recent Directories</p>
                  <p className="text-xs text-muted-foreground">Clear stored recent folder paths</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearRecentDirectories}
                  data-testid="button-clear-recent"
                >
                  Clear
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                <strong>Privacy Note:</strong> Your files stay on your computer. We only store folder paths locally 
                for convenience and never upload file contents to our servers.
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose} data-testid="button-close-settings-bottom">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}