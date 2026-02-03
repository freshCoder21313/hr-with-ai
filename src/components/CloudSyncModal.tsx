import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { syncService } from '@/services/syncService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Cloud,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  Info,
  FileJson,
  Laptop,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'download' | 'offline'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload State
  const [uploadId, setUploadId] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [includeApiKey, setIncludeApiKey] = useState(false);

  // Download State
  const [downloadId, setDownloadId] = useState('');

  // Offline State
  const [offlineIncludeApiKey, setOfflineIncludeApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate ID on mount (or just when needed)
  useEffect(() => {
    if (isOpen && activeTab === 'upload' && !uploadId) {
      generateNewId();
    }
  }, [isOpen, activeTab, uploadId]);

  const generateNewId = () => {
    const newId = syncService.generateId();
    setUploadId(newId);
  };

  const resetStatus = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(uploadId);
    setSuccess('ID copied to clipboard');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleUpload = async () => {
    resetStatus();
    if (!uploadId || !syncService.validateId(uploadId)) {
      setError('Invalid ID format. Must be 16 alphanumeric characters.');
      return;
    }
    if (!uploadPassword) {
      setError('Password is required for secure upload.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await syncService.exportData({ includeSensitive: includeApiKey });
      const result = await syncService.uploadToCloud(uploadId, uploadPassword, data);

      if (result.success) {
        setSuccess('Data synced to cloud successfully!');
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    resetStatus();
    if (!downloadId || !syncService.validateId(downloadId)) {
      setError('Invalid ID format. Must be 16 alphanumeric characters.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await syncService.downloadFromCloud(downloadId);

      if (result.success && result.data) {
        await syncService.importData(result.data);
        setSuccess('Data restored from cloud successfully! The page will reload momentarily.');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(result.message || 'Download failed');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineExport = async () => {
    resetStatus();
    setIsLoading(true);
    try {
      const data = await syncService.exportData({ includeSensitive: offlineIncludeApiKey });
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `hr-inv-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess('Backup file downloaded successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to export data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetStatus();
    setIsLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await syncService.importData(data);
      setSuccess('Data imported successfully! The page will reload momentarily.');
      setTimeout(() => window.location.reload(), 2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error(err);
      setError('Failed to process file. Make sure it is a valid backup JSON.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px] bg-background border-border">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Cloud className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">Cloud Sync</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Secure backup & cross-device recovery
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="mb-2 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-1.5 bg-destructive/20 rounded-full">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-sm text-destructive leading-tight">
              <p className="font-bold mb-0.5">Sync Error</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-1.5 bg-emerald-500/20 rounded-full">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-sm text-emerald-800 dark:text-emerald-200 leading-tight">
              <p className="font-bold mb-0.5">Success</p>
              <p className="opacity-90">{success}</p>
            </div>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v: string) => {
            setActiveTab(v as 'upload' | 'download');
            resetStatus();
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 bg-muted p-1.5 mb-8 rounded-2xl">
            <TabsTrigger
              value="upload"
              className="rounded-xl py-2.5 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Cloud Backup
            </TabsTrigger>
            <TabsTrigger
              value="download"
              className="rounded-xl py-2.5 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Cloud Restore
            </TabsTrigger>
            <TabsTrigger
              value="offline"
              className="rounded-xl py-2.5 text-xs font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Offline File
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="upload"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <Label htmlFor="upload-id" className="text-sm font-bold text-foreground">
                  Sync Identity <span className="text-destructive">*</span>
                </Label>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Unique Key
                </span>
              </div>
              <div className="group relative flex items-center">
                <Input
                  id="upload-id"
                  value={uploadId}
                  onChange={(e) => setUploadId(e.target.value)}
                  placeholder="ID will appear here"
                  maxLength={16}
                  className="h-14 pl-4 pr-24 bg-muted/50 border-input rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono text-lg tracking-[0.2em] uppercase text-foreground"
                />
                <div className="absolute right-2 flex gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <LoadingButton
                        variant="ghost"
                        size="icon"
                        onClick={generateNewId}
                        className="h-10 w-10 rounded-xl hover:bg-background hover:text-primary transition-colors"
                        isLoading={isLoading}
                        loadingText=""
                      >
                        <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
                      </LoadingButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Regenerate</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyId}
                        className="h-10 w-10 rounded-xl hover:bg-background hover:text-primary transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Copy Key</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <div className="shrink-0 p-1 bg-primary/10 rounded-lg h-fit">
                  <Info className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Security Notice:</span> Keep this ID
                  private. You&apos;ll need it along with your password to restore data on other
                  devices.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="upload-password" className="text-sm font-bold text-foreground px-1">
                Protection Password <span className="text-destructive">*</span>
              </Label>
              <div className="relative group">
                <Input
                  id="upload-password"
                  type={showPassword ? 'text' : 'password'}
                  value={uploadPassword}
                  onChange={(e) => setUploadPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="h-14 px-4 bg-muted/50 border-input rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all pr-12 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium px-1 italic">
                Ensures only you can overwrite your cloud-stored data.
              </p>

              <div className="flex items-center space-x-2 pt-2 px-1">
                <Checkbox
                  id="include-api-key"
                  checked={includeApiKey}
                  onCheckedChange={(checked) => setIncludeApiKey(checked === true)}
                />
                <label
                  htmlFor="include-api-key"
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                  Include API Key & Sensitive Data (Not Recommended)
                </label>
              </div>
            </div>

            <LoadingButton
              onClick={handleUpload}
              disabled={isLoading}
              isLoading={isLoading}
              loadingText="Syncing Data..."
              className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
              leftIcon={<Upload className="h-5 w-5" />}
            >
              Push to Cloud
            </LoadingButton>
          </TabsContent>

          <TabsContent
            value="download"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-3">
              <Label htmlFor="download-id" className="text-sm font-bold text-foreground px-1">
                Identity Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="download-id"
                value={downloadId}
                onChange={(e) => setDownloadId(e.target.value)}
                placeholder="Paste your 16-character ID"
                maxLength={16}
                className="h-14 px-4 bg-muted/50 border-input rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono text-center text-lg tracking-[0.2em] uppercase text-foreground"
              />
            </div>

            <div className="p-5 bg-orange-500/10 rounded-2xl border border-orange-500/20 flex gap-4">
              <div className="p-2 bg-orange-500/20 rounded-xl h-fit">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-orange-900 dark:text-orange-200 uppercase tracking-tight">
                  Warning
                </h3>
                <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed opacity-90">
                  Data will be <span className="font-bold">smartly merged</span>. Newer versions
                  from cloud will update local records. Unique local data is preserved.
                </p>
              </div>
            </div>

            <LoadingButton
              onClick={handleDownload}
              disabled={isLoading}
              variant="secondary"
              isLoading={isLoading}
              loadingText="Restoring..."
              className="w-full h-14 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-base rounded-2xl transition-all active:scale-[0.98]"
              leftIcon={<Download className="h-5 w-5" />}
            >
              Confirm & Merge
            </LoadingButton>
          </TabsContent>

          <TabsContent
            value="offline"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="grid grid-cols-1 gap-6">
              <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-background rounded-lg shadow-sm">
                    <Download className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Export Data</h3>
                    <p className="text-xs text-muted-foreground">Download as JSON file</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="offline-include-api-key"
                      checked={offlineIncludeApiKey}
                      onCheckedChange={(checked) => setOfflineIncludeApiKey(checked === true)}
                    />
                    <label
                      htmlFor="offline-include-api-key"
                      className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                    >
                      Include API Key
                    </label>
                  </div>

                  <LoadingButton
                    onClick={handleOfflineExport}
                    disabled={isLoading}
                    isLoading={isLoading && activeTab === 'offline'}
                    loadingText="Exporting..."
                    variant="outline"
                    className="w-full"
                    leftIcon={<FileJson className="h-4 w-4" />}
                  >
                    Download Backup File
                  </LoadingButton>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="p-5 bg-muted/50 rounded-2xl border border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-background rounded-lg shadow-sm">
                    <Laptop className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Import Data</h3>
                    <p className="text-xs text-muted-foreground">Restore from JSON file</p>
                  </div>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />

                <LoadingButton
                  onClick={handleOfflineImportClick}
                  disabled={isLoading}
                  isLoading={isLoading && activeTab === 'offline'}
                  loadingText="Importing..."
                  className="w-full"
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Select Backup File
                </LoadingButton>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
