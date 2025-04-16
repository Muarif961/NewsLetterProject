import { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Upload, AlertCircle, CheckCircle2, Users, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import useSWR from 'swr';

interface ImportError {
  row: number;
  email?: string;
  error: string;
  data?: any;
}

interface ImportResult {
  success: boolean;
  totalProcessed: number;
  successfulImports: number;
  errors: ImportError[];
  details: {
    remainingQuota: number;
  };
  importedIds?: number[]; // Add this to track imported subscriber IDs
}

interface GroupOption {
  id: number;
  name: string;
}

export function CSVImport({ onComplete }: { onComplete: () => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch existing groups
  const { data: groups = [] } = useSWR<GroupOption[]>('/api/groups');

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrors([]);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/subscribers/import-csv', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import subscribers');
      }

      setResult(data);

      if (data.errors.length > 0) {
        setErrors(data.errors);
      }

      // Show group modal after successful import
      if (data.successfulImports > 0) {
        setShowGroupModal(true);
      } else {
        onComplete();
      }

      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.successfulImports} subscribers`,
        variant: data.errors.length > 0 ? "default" : "default",
      });

    } catch (error: any) {
      console.error('CSV import error:', error);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateNewGroup = async () => {
    if (!newGroupName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a group name",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create new group
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newGroupName }),
      });

      if (!response.ok) {
        throw new Error('Failed to create group');
      }

      const group = await response.json();

      // Add imported subscribers to the new group
      if (result?.importedIds?.length) {
        await fetch(`/api/groups/${group.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscriberIds: result.importedIds,
          }),
        });
      }

      toast({
        title: "Success",
        description: "Created group and added subscribers",
      });

      setShowGroupModal(false);
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddToExistingGroup = async (groupId: number) => {
    try {
      if (result?.importedIds?.length) {
        await fetch(`/api/groups/${groupId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscriberIds: result.importedIds,
          }),
        });

        toast({
          title: "Success",
          description: "Added subscribers to group",
        });
      }

      setShowGroupModal(false);
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">
              Drag and drop your CSV file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              File should contain email (required) and name (optional) columns
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Select CSV File
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-center text-muted-foreground">
            Uploading and processing subscribers...
          </p>
        </div>
      )}

      {result && (
        <Alert className={errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Import Complete</AlertTitle>
          <AlertDescription>
            Successfully imported {result.successfulImports} out of {result.totalProcessed} subscribers.
            {result.details.remainingQuota > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                Remaining quota: {result.details.remainingQuota} subscribers
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Errors</AlertTitle>
            <AlertDescription>
              <p className="mb-2">The following errors occurred during import:</p>
              <div className="max-h-40 overflow-y-auto">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm">
                    <strong>Row {error.row}:</strong> {error.error}
                    {error.email && <span className="block ml-4">Email: {error.email}</span>}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Post-import Group Organization Modal */}
      <Dialog open={showGroupModal} onOpenChange={setShowGroupModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Organize Imported Subscribers</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              {result?.successfulImports} subscribers were successfully imported. 
              Would you like to organize them into a group?
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Create New Group</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter group name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                  <Button onClick={handleCreateNewGroup}>
                    Create
                  </Button>
                </div>
              </div>

              {groups.length > 0 && (
                <div className="space-y-2">
                  <Label>Or Add to Existing Group</Label>
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <Button
                        key={group.id}
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => handleAddToExistingGroup(group.id)}
                      >
                        <Users className="h-4 w-4" />
                        {group.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowGroupModal(false);
                onComplete();
              }}
            >
              Skip Grouping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}