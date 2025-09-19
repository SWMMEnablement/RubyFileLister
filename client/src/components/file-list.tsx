import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, FileCode2, Eye, Copy, ChevronLeft, ChevronRight, SortAsc } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { ScanSession, ScannedFile } from "@shared/schema";

interface FileListProps {
  currentScan: ScanSession | null;
}

export function FileList({ currentScan }: FileListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All Files");
  const { toast } = useToast();

  const { data: files = [], isLoading, error } = useQuery<ScannedFile[]>({
    queryKey: ["/api/scan", currentScan?.id, "files", { search: searchQuery, type: filterType }],
    enabled: !!currentScan?.id,
    queryFn: async () => {
      console.log('FileList: Making API call for scan:', currentScan?.id);
      const searchParams = new URLSearchParams();
      if (searchQuery) searchParams.append('search', searchQuery);
      if (filterType && filterType !== 'All Files') searchParams.append('type', filterType);
      
      const url = `/api/scan/${currentScan!.id}/files?${searchParams.toString()}`;
      console.log('FileList: Fetching URL:', url);
      const response = await fetch(url);
      console.log('FileList: Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }
      const data = await response.json();
      console.log('FileList: Received data length:', data.length);
      return data;
    },
  });

  console.log('FileList: Current scan:', currentScan?.id, 'Files:', files.length, 'Error:', error);

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path).then(() => {
      toast({
        title: "Copied",
        description: "File path copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy file path.",
        variant: "destructive",
      });
    });
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const formatModifiedDate = (date: string | Date) => {
    const modifiedDate = new Date(date);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return "1 day ago";
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  const getStats = () => {
    const totalSize = files.reduce((sum: number, file: ScannedFile) => sum + file.size, 0);
    const avgSize = files.length > 0 ? totalSize / files.length : 0;
    const directories = new Set(files.map((file: ScannedFile) => file.path.split('/').slice(0, -1).join('/'))).size;
    
    return {
      rubyFiles: files.length,
      directories,
      totalSize: formatFileSize(totalSize),
      avgSize: formatFileSize(avgSize),
    };
  };

  const stats = getStats();

  if (!currentScan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <FileCode2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Scan Active</h3>
          <p className="text-muted-foreground">Select a directory and start a scan to view Ruby files.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-files"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40" data-testid="select-file-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Files">All Files</SelectItem>
                <SelectItem value="Model">Models</SelectItem>
                <SelectItem value="Controller">Controllers</SelectItem>
                <SelectItem value="View">Views</SelectItem>
                <SelectItem value="Test">Tests</SelectItem>
                <SelectItem value="Configuration">Configuration</SelectItem>
                <SelectItem value="Library">Libraries</SelectItem>
                <SelectItem value="Helper">Helpers</SelectItem>
                <SelectItem value="Migration">Migrations</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-3 text-sm text-muted-foreground">
            <span data-testid="text-total-files">{files.length} files found</span>
            <span>•</span>
            <span data-testid="text-total-size">{stats.totalSize} total</span>
          </div>
        </div>
      </div>

      {/* File List Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-4">
          {/* Results Summary Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="stat-ruby-files">
                    {stats.rubyFiles}
                  </div>
                  <div className="text-sm text-muted-foreground">Ruby Files</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-directories">
                    {stats.directories}
                  </div>
                  <div className="text-sm text-muted-foreground">Directories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-total-size">
                    {stats.totalSize}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground" data-testid="stat-avg-size">
                    {stats.avgSize}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg. File Size</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File List Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>File Name</span>
                        <SortAsc className="text-xs" size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Path</span>
                        <SortAsc className="text-xs" size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Size</span>
                        <SortAsc className="text-xs" size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="flex items-center space-x-1">
                        <span>Modified</span>
                        <SortAsc className="text-xs" size={12} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                        Loading files...
                      </td>
                    </tr>
                  ) : files.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                        No files found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    files.map((file: ScannedFile) => (
                      <tr key={file.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-file-${file.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <FileCode2 className="text-primary" size={16} />
                            <div>
                              <div className="text-sm font-medium text-foreground" data-testid={`text-filename-${file.id}`}>
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground" data-testid={`text-filetype-${file.id}`}>
                                {file.type}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-muted-foreground font-mono" data-testid={`text-filepath-${file.id}`}>
                            {file.relativePath}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground" data-testid={`text-filesize-${file.id}`}>
                            {formatFileSize(file.size)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground" data-testid={`text-filemodified-${file.id}`}>
                            {formatModifiedDate(file.modified)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-primary hover:text-primary/80"
                              data-testid={`button-view-${file.id}`}
                            >
                              <Eye size={14} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCopyPath(file.path)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`button-copy-${file.id}`}
                            >
                              <Copy size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {files.length > 0 && (
              <div className="bg-muted px-6 py-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(files.length, 50)}</span> of <span className="font-medium">{files.length}</span> results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" disabled data-testid="button-prev-page">
                      <ChevronLeft size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" className="bg-primary text-primary-foreground" data-testid="button-page-1">
                      1
                    </Button>
                    <Button variant="ghost" size="sm" disabled data-testid="button-next-page">
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
