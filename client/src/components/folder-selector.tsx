import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Directory {
  name: string;
  path: string;
  relativePath: string;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  directories: Directory[];
}

interface FolderSelectorProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function FolderSelector({ onSelect, onCancel }: FolderSelectorProps) {
  const [currentPath, setCurrentPath] = useState("./");
  const [selectedPath, setSelectedPath] = useState<string>("./");

  const { data, isLoading, error } = useQuery<BrowseResponse>({
    queryKey: ["/api/browse", currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/browse?path=${encodeURIComponent(currentPath)}`);
      if (!response.ok) {
        throw new Error(`Failed to browse directory: ${response.status}`);
      }
      return response.json();
    },
  });

  const handleDirectoryClick = (directory: Directory) => {
    setCurrentPath(directory.path);
    setSelectedPath(directory.path);
  };

  const handleParentClick = () => {
    if (data?.parentPath) {
      setCurrentPath(data.parentPath);
      setSelectedPath(data.parentPath);
    }
  };

  const handleRootClick = () => {
    setCurrentPath("./");
    setSelectedPath("./");
  };

  const handleSelect = () => {
    // Ensure path starts with ./ for server compatibility
    const normalizedPath = selectedPath.startsWith('./') ? selectedPath : `./${selectedPath}`;
    onSelect(normalizedPath);
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
            Browse Error
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {(error as Error).message}
          </p>
          <Button onClick={onCancel} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Select Folder
        </h3>
        
        {/* Current Path Display */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <Folder className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-gray-700 dark:text-gray-300">Current:</span>
            <span className="text-gray-600 dark:text-gray-400 break-all">{data?.currentPath || currentPath}</span>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRootClick}
            className="flex items-center space-x-1"
            data-testid="button-nav-root"
          >
            <Home className="w-4 h-4" />
            <span>Root</span>
          </Button>
          
          {data?.parentPath && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleParentClick}
              className="flex items-center space-x-1"
              data-testid="button-nav-parent"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Up</span>
            </Button>
          )}
        </div>

        {/* Directory List */}
        <ScrollArea className="flex-1 border rounded-lg p-2 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-sm text-gray-500">Loading directories...</div>
            </div>
          ) : (
            <div className="space-y-1">
              {data?.directories.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No subdirectories found
                </div>
              ) : (
                data?.directories.map((directory, index) => (
                  <div
                    key={directory.path}
                    className={`flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors ${
                      selectedPath === directory.path
                        ? "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => handleDirectoryClick(directory)}
                    data-testid={`folder-item-${index}`}
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Folder className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {directory.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </ScrollArea>

        {/* Selected Path Display */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-800 dark:text-blue-200">Selected:</span>
            <span className="text-blue-700 dark:text-blue-300 break-all">{selectedPath}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleSelect}
            className="flex-1"
            data-testid="button-select-folder"
          >
            Select Folder
          </Button>
          <Button 
            onClick={onCancel}
            variant="outline"
            data-testid="button-cancel-folder"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}