import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, X, FolderOpen, Search, Download, FileText, Monitor, Smartphone } from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="modal-help">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Help & User Guide
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-help">
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Start Guide */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">🚀 Quick Start</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="text-sm font-medium">Choose Scan Mode</p>
                  <p className="text-xs text-muted-foreground">Select "Local Computer" to scan your files or "Workspace" for server files</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="text-sm font-medium">Select Directory</p>
                  <p className="text-xs text-muted-foreground">Click "Choose Folder" and select the directory you want to scan</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="text-sm font-medium">Configure Options</p>
                  <p className="text-xs text-muted-foreground">Set scan options (subdirectories, hidden files, Ruby files only)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">4</div>
                <div>
                  <p className="text-sm font-medium">Start Scan</p>
                  <p className="text-xs text-muted-foreground">Click "Start Scan" and wait for the process to complete</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">5</div>
                <div>
                  <p className="text-sm font-medium">Export Results</p>
                  <p className="text-xs text-muted-foreground">Export your file list or combine all file contents into one file</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Scan Modes */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Scan Modes
            </h3>
            <div className="space-y-3">
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">Local Computer</span>
                  <Badge variant="default">Recommended</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Scan folders on your own computer. Files stay private and are processed in your browser.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ Complete privacy - files never leave your computer</li>
                  <li>✅ Read actual file contents for concatenated export</li>
                  <li>✅ Works with any folder on your system</li>
                  <li>⚠️ Requires modern browser (Chrome, Edge, Safari 16.4+)</li>
                </ul>
              </div>
              
              <div className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Workspace</span>
                  <Badge variant="secondary">Server</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Scan folders in this Replit workspace. Useful for analyzing project files on the server.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>✅ Works in any browser</li>
                  <li>✅ Good for analyzing project structure</li>
                  <li>⚠️ Limited to server directories only</li>
                  <li>⚠️ Cannot read file contents for concatenation</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Export Options */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Options
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">File Lists</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Export metadata about found files</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Plain Text (.txt)</li>
                    <li>• CSV (.csv)</li>
                    <li>• JSON (.json)</li>
                  </ul>
                </div>
                
                <div className="border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Concatenated Files</span>
                    <Badge variant="outline" className="text-xs">New!</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Combine all file contents into one text file</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Includes actual file contents</li>
                    <li>• Custom filename support</li>
                    <li>• Only available in Local mode</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* How to Save Concatenated Files */}
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-3">
              💡 How to Save All Files to One Text File
            </h3>
            <ol className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <li><strong>1.</strong> Switch to "Local Computer" mode</li>
              <li><strong>2.</strong> Select a directory and complete a scan</li>
              <li><strong>3.</strong> Click any Export button (.TXT, .CSV, or Export as JSON)</li>
              <li><strong>4.</strong> In the export modal, select "Concatenated Files" from the format dropdown</li>
              <li><strong>5.</strong> Enter your desired filename (e.g., "all_my_ruby_files")</li>
              <li><strong>6.</strong> Click "Export" - the file will download with all your file contents combined!</li>
            </ol>
          </div>

          <Separator />

          {/* Troubleshooting */}
          <div>
            <h3 className="text-lg font-medium text-foreground mb-3">🔧 Troubleshooting</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Can't see files after scanning?</p>
                <p className="text-muted-foreground text-xs">Make sure the scan completed (progress shows 100%) and check your filter settings.</p>
              </div>
              <div>
                <p className="font-medium">Local folder picker not working?</p>
                <p className="text-muted-foreground text-xs">Try using Chrome, Edge, or Safari 16.4+. Older browsers have limited support.</p>
              </div>
              <div>
                <p className="font-medium">Export button disabled?</p>
                <p className="text-muted-foreground text-xs">Export buttons are now always enabled. If you see issues, try refreshing the page.</p>
              </div>
              <div>
                <p className="font-medium">Concatenated files option missing?</p>
                <p className="text-muted-foreground text-xs">This option is only available in Local Computer mode with a completed scan.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose} data-testid="button-close-help-bottom">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}