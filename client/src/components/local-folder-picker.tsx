import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, AlertCircle, Info, Upload } from "lucide-react";
import { 
  LocalScanner, 
  isFileSystemAccessSupported, 
  isWebkitDirectorySupported,
  getBrowserCompatibilityInfo 
} from "@/lib/local-scanner";

// TypeScript declaration for webkitdirectory attribute
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

interface LocalFolderPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (dirHandle: FileSystemDirectoryHandle | FileList, folderName: string) => void;
}

export function LocalFolderPicker({ isOpen, onClose, onSelect }: LocalFolderPickerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanner = new LocalScanner();
  
  const compatibility = getBrowserCompatibilityInfo();
  
  const handleFileSystemAccessPicker = async () => {
    setError(null);
    setIsSelecting(true);
    
    try {
      const dirHandle = await scanner.pickDirectory();
      if (dirHandle) {
        onSelect(dirHandle, dirHandle.name);
        onClose();
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Permission denied. Please allow access to select a folder.');
        } else if (error.name === 'SecurityError') {
          setError('Security error. Please try again or use a supported browser.');
        } else {
          setError(`Failed to select folder: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred while selecting the folder.');
      }
    } finally {
      setIsSelecting(false);
    }
  };
  
  const handleWebkitDirectoryPicker = () => {
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Extract folder name from the first file's path
      const firstFile = files[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      const folderName = pathParts[0] || 'Selected Folder';
      
      onSelect(files, folderName);
      onClose();
    }
    
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };
  
  const getCompatibilityBadge = () => {
    if (isFileSystemAccessSupported()) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Excellent Support</Badge>;
    } else if (isWebkitDirectorySupported()) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Limited Support</Badge>;
    } else {
      return <Badge variant="destructive">Not Supported</Badge>;
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Select Local Folder
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Browser compatibility info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Browser Compatibility: {compatibility.note}</span>
              {getCompatibilityBadge()}
            </AlertDescription>
          </Alert>
          
          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Primary picker (File System Access API) */}
          {isFileSystemAccessSupported() && (
            <div className="space-y-2">
              <h4 className="font-medium">Recommended Method</h4>
              <Button
                onClick={handleFileSystemAccessPicker}
                disabled={isSelecting}
                className="w-full"
                data-testid="button-pick-folder-modern"
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {isSelecting ? 'Opening Folder Picker...' : 'Choose Folder from Computer'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Select any folder from your computer with full access to browse subdirectories.
              </p>
            </div>
          )}
          
          {/* Fallback picker (webkitdirectory) */}
          {isWebkitDirectorySupported() && (
            <div className="space-y-2">
              <h4 className="font-medium">
                {isFileSystemAccessSupported() ? 'Alternative Method' : 'Available Method'}
              </h4>
              <Button
                onClick={handleWebkitDirectoryPicker}
                variant={isFileSystemAccessSupported() ? "outline" : "default"}
                className="w-full"
                data-testid="button-pick-folder-fallback"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Folder (All Files)
              </Button>
              <p className="text-sm text-muted-foreground">
                Select a folder and upload all its files for scanning. This method reads all files at once.
              </p>
              
              {/* Hidden file input for webkitdirectory */}
              <input
                ref={fileInputRef}
                type="file"
                webkitdirectory="true"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                data-testid="input-webkit-directory"
              />
            </div>
          )}
          
          {/* No support message */}
          {!compatibility.supported && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your browser doesn't support local folder access. Please use Chrome, Edge, or Safari for the best experience.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Info about what happens next */}
          {compatibility.supported && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">What happens next?</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Your files stay on your computer - nothing is uploaded</li>
                <li>• We'll scan for code files and analyze the structure</li>
                <li>• You can filter, search, and export the results</li>
                <li>• All processing happens in your browser</li>
              </ul>
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-folder-pick">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using LocalFolderPicker
export function useLocalFolderPicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{
    handle: FileSystemDirectoryHandle | FileList;
    name: string;
  } | null>(null);
  
  const openPicker = () => setIsOpen(true);
  const closePicker = () => setIsOpen(false);
  
  const handleSelect = (handle: FileSystemDirectoryHandle | FileList, name: string) => {
    setSelectedFolder({ handle, name });
  };
  
  const clearSelection = () => setSelectedFolder(null);
  
  return {
    isOpen,
    openPicker,
    closePicker,
    selectedFolder,
    handleSelect,
    clearSelection,
    FolderPicker: ({ onSelect }: { onSelect: (handle: FileSystemDirectoryHandle | FileList, name: string) => void }) => (
      <LocalFolderPicker
        isOpen={isOpen}
        onClose={closePicker}
        onSelect={(handle, name) => {
          handleSelect(handle, name);
          onSelect(handle, name);
        }}
      />
    ),
  };
}