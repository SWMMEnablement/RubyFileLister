import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Download, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { ExportOptions, ScannedFile } from "@shared/schema";

// Extended export options that includes concatenated format
type ExtendedExportOptions = Omit<ExportOptions, 'format'> & {
  format: "txt" | "csv" | "json" | "concatenated";
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId?: string;
  localFiles?: ScannedFile[];
  isLocalMode?: boolean;
  localDirectoryHandle?: FileSystemDirectoryHandle | FileList | null;
}

export function ExportModal({ isOpen, onClose, scanId, localFiles = [], isLocalMode = false, localDirectoryHandle = null }: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExtendedExportOptions>({
    format: "txt",
    filename: "ruby_files_export",
    includePaths: true,
    includeSizes: true,
    includeModified: false,
    scanId: scanId || "",
  });
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (options: ExportOptions) => {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(options),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Export failed");
      }

      return response;
    },
    onSuccess: async (response) => {
      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${exportOptions.filename}.${exportOptions.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: "File has been downloaded.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export files.",
        variant: "destructive",
      });
    },
  });

  const readFileContents = async (files: ScannedFile[]): Promise<{name: string, content: string, path: string}[]> => {
    if (!localDirectoryHandle) {
      throw new Error('No directory handle available for reading files');
    }

    const fileContents: {name: string, content: string, path: string}[] = [];
    
    for (const file of files) {
      try {
        let fileHandle: FileSystemFileHandle | null = null;
        
        if (localDirectoryHandle instanceof FileList) {
          // Find file in FileList by relative path
          for (let i = 0; i < localDirectoryHandle.length; i++) {
            const listFile = localDirectoryHandle[i];
            if (listFile.webkitRelativePath === file.path.replace('./', '')) {
              const fileObj = await new Promise<File>((resolve) => resolve(listFile));
              const content = await fileObj.text();
              fileContents.push({
                name: file.name,
                content: content,
                path: file.path
              });
              break;
            }
          }
        } else {
          // Navigate through directory structure to find file
          const pathParts = file.path.replace('./', '').split('/');
          let currentHandle: FileSystemDirectoryHandle = localDirectoryHandle;
          
          // Navigate to the directory containing the file
          for (let i = 0; i < pathParts.length - 1; i++) {
            const dirName = pathParts[i];
            try {
              currentHandle = await currentHandle.getDirectoryHandle(dirName);
            } catch (error) {
              console.warn(`Could not access directory: ${dirName}`);
              break;
            }
          }
          
          // Get the file handle
          const fileName = pathParts[pathParts.length - 1];
          try {
            fileHandle = await currentHandle.getFileHandle(fileName);
            const fileObj = await fileHandle.getFile();
            const content = await fileObj.text();
            fileContents.push({
              name: file.name,
              content: content,
              path: file.path
            });
          } catch (error) {
            console.warn(`Could not read file: ${fileName}`, error);
            fileContents.push({
              name: file.name,
              content: `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`,
              path: file.path
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to read file ${file.name}:`, error);
        fileContents.push({
          name: file.name,
          content: `[Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}]`,
          path: file.path
        });
      }
    }
    
    return fileContents;
  };
  
  const generateClientSideExport = (files: ScannedFile[], options: ExtendedExportOptions): string => {
    const formatFileSize = (bytes: number) => (bytes / 1024).toFixed(1) + " KB";
    const formatDate = (date: Date) => date.toLocaleDateString();
    
    switch (options.format) {
      case 'txt':
        let txtContent = `Ruby Files Export\n`;
        txtContent += `Generated: ${new Date().toLocaleString()}\n`;
        txtContent += `Total Files: ${files.length}\n\n`;
        
        files.forEach((file, index) => {
          txtContent += `${index + 1}. ${file.name}\n`;
          if (options.includePaths) txtContent += `   Path: ${file.path}\n`;
          if (options.includeSizes) txtContent += `   Size: ${formatFileSize(file.size)}\n`;
          if (options.includeModified) txtContent += `   Modified: ${formatDate(file.modified)}\n`;
          txtContent += `   Type: ${file.type}\n\n`;
        });
        
        return txtContent;
        
      case 'csv':
        const headers = ['Name', 'Type'];
        if (options.includePaths) headers.push('Path');
        if (options.includeSizes) headers.push('Size (KB)');
        if (options.includeModified) headers.push('Modified');
        
        let csvContent = headers.join(',') + '\n';
        
        files.forEach(file => {
          const row = [file.name, file.type];
          if (options.includePaths) row.push(`"${file.path}"`);
          if (options.includeSizes) row.push((file.size / 1024).toFixed(1));
          if (options.includeModified) row.push(`"${formatDate(file.modified)}"`);
          csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
        
      case 'json':
        const jsonData = {
          exportInfo: {
            generated: new Date().toISOString(),
            totalFiles: files.length,
            exportOptions: options
          },
          files: files.map(file => {
            const fileData: any = {
              name: file.name,
              type: file.type
            };
            if (options.includePaths) fileData.path = file.path;
            if (options.includeSizes) fileData.sizeKB = (file.size / 1024).toFixed(1);
            if (options.includeModified) fileData.modified = file.modified.toISOString();
            return fileData;
          })
        };
        
        return JSON.stringify(jsonData, null, 2);
        
      default:
        return '';
    }
  };
  
  const downloadClientSideExport = (content: string, filename: string, format: string) => {
    const blob = new Blob([content], { type: getContentType(format) });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  
  const getContentType = (format: string): string => {
    switch (format) {
      case 'txt': return 'text/plain';
      case 'csv': return 'text/csv';
      case 'json': return 'application/json';
      default: return 'text/plain';
    }
  };

  const handleExport = async () => {
    if (isLocalMode) {
      // Client-side export for local files
      if (localFiles.length === 0) {
        toast({
          title: "No Files to Export",
          description: "No files available for export.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        if (exportOptions.format === 'concatenated') {
          // Special handling for concatenated file contents
          setIsReadingFiles(true);
          
          const fileContents = await readFileContents(localFiles);
          
          let concatenatedContent = `File Contents Export\n`;
          concatenatedContent += `Generated: ${new Date().toLocaleString()}\n`;
          concatenatedContent += `Total Files: ${fileContents.length}\n`;
          concatenatedContent += `${'='.repeat(80)}\n\n`;
          
          fileContents.forEach((file, index) => {
            concatenatedContent += `${'='.repeat(80)}\n`;
            concatenatedContent += `FILE ${index + 1}: ${file.name}\n`;
            concatenatedContent += `Path: ${file.path}\n`;
            concatenatedContent += `${'='.repeat(80)}\n\n`;
            concatenatedContent += file.content;
            concatenatedContent += `\n\n`;
          });
          
          downloadClientSideExport(concatenatedContent, exportOptions.filename, 'txt');
          setIsReadingFiles(false);
        } else {
          // Regular metadata export
          const content = generateClientSideExport(localFiles, exportOptions);
          downloadClientSideExport(content, exportOptions.filename, exportOptions.format);
        }
        
        toast({
          title: "Export Successful",
          description: "File has been downloaded.",
        });
        onClose();
      } catch (error) {
        setIsReadingFiles(false);
        toast({
          title: "Export Failed",
          description: error instanceof Error ? error.message : "Failed to generate export file.",
          variant: "destructive",
        });
      }
    } else {
      // Server-side export for workspace files
      if (!scanId) {
        toast({
          title: "No Scan Data",
          description: "No scan data available for export.",
          variant: "destructive",
        });
        return;
      }

      // Filter out concatenated format for server export (local-only)
      const serverOptions: ExportOptions = {
        format: exportOptions.format === 'concatenated' ? 'txt' : exportOptions.format as "txt" | "csv" | "json",
        filename: exportOptions.filename,
        includePaths: exportOptions.includePaths,
        includeSizes: exportOptions.includeSizes,
        includeModified: exportOptions.includeModified,
        scanId,
      };
      exportMutation.mutate(serverOptions);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md" data-testid="modal-export">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Export Ruby Files List
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-modal">
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="format" className="block text-sm font-medium text-foreground mb-2">
              Export Format
            </Label>
            <Select 
              value={exportOptions.format} 
              onValueChange={(value: "txt" | "csv" | "json" | "concatenated") => 
                setExportOptions(prev => ({ ...prev, format: value }))
              }
            >
              <SelectTrigger data-testid="select-export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">Plain Text (.txt)</SelectItem>
                <SelectItem value="csv">Comma Separated (.csv)</SelectItem>
                <SelectItem value="json">JSON Format (.json)</SelectItem>
                <SelectItem value="concatenated" disabled={!isLocalMode}>
                  Concatenated Files {!isLocalMode && "(Local mode only)"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="filename" className="block text-sm font-medium text-foreground mb-2">
              File Name
            </Label>
            <Input
              id="filename"
              type="text"
              value={exportOptions.filename}
              onChange={(e) => setExportOptions(prev => ({ ...prev, filename: e.target.value }))}
              data-testid="input-filename"
            />
          </div>

          <div className="space-y-2">
            <Label className="block text-sm font-medium text-foreground">Include in Export</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paths"
                checked={exportOptions.includePaths}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includePaths: !!checked }))
                }
                data-testid="checkbox-include-paths"
              />
              <Label htmlFor="paths" className="text-sm text-foreground">
                File paths
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sizes"
                checked={exportOptions.includeSizes}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeSizes: !!checked }))
                }
                data-testid="checkbox-include-sizes"
              />
              <Label htmlFor="sizes" className="text-sm text-foreground">
                File sizes
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="modified"
                checked={exportOptions.includeModified}
                onCheckedChange={(checked) => 
                  setExportOptions(prev => ({ ...prev, includeModified: !!checked }))
                }
                data-testid="checkbox-include-modified"
              />
              <Label htmlFor="modified" className="text-sm text-foreground">
                Last modified dates
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-export">
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={exportMutation.isPending || isReadingFiles}
            data-testid="button-confirm-export"
          >
            <Download className="mr-2" size={16} />
            {isReadingFiles ? "Reading Files..." : exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
