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
import type { ExportOptions } from "@shared/schema";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scanId?: string;
}

export function ExportModal({ isOpen, onClose, scanId }: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "txt",
    filename: "ruby_files_export",
    includePaths: true,
    includeSizes: true,
    includeModified: false,
    scanId: scanId || "",
  });
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

  const handleExport = () => {
    if (!scanId) {
      toast({
        title: "No Scan Data",
        description: "No scan data available for export.",
        variant: "destructive",
      });
      return;
    }

    exportMutation.mutate({
      ...exportOptions,
      scanId,
    });
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
              onValueChange={(value: "txt" | "csv" | "json") => 
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
            disabled={exportMutation.isPending}
            data-testid="button-confirm-export"
          >
            <Download className="mr-2" size={16} />
            {exportMutation.isPending ? "Exporting..." : "Export"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
