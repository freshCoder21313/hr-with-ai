import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud } from 'lucide-react';
import { useCloudSync } from './useCloudSync';
import { SyncStatusBanner } from './cloud-sync/SyncStatusBanner';
import { UploadTab } from './cloud-sync/UploadTab';
import { DownloadTab } from './cloud-sync/DownloadTab';
import { OfflineTab } from './cloud-sync/OfflineTab';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const { state, actions } = useCloudSync();
  const {
    activeTab,
    isLoading,
    error,
    success,
    uploadId,
    uploadPassword,
    showPassword,
    includeApiKey,
    downloadId,
    offlineIncludeApiKey,
    fileInputRef,
  } = state;
  const {
    setActiveTab,
    setUploadId,
    setUploadPassword,
    setShowPassword,
    setIncludeApiKey,
    setDownloadId,
    setOfflineIncludeApiKey,
    generateNewId,
    resetStatus,
    handleCopyId,
    handleUpload,
    handleDownload,
    handleOfflineExport,
    handleOfflineImportClick,
    handleFileChange,
  } = actions;

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        resetStatus();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, resetStatus]);

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

        <SyncStatusBanner error={error} success={success} onDismiss={resetStatus} />

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
            <UploadTab
              uploadId={uploadId}
              uploadPassword={uploadPassword}
              showPassword={showPassword}
              includeApiKey={includeApiKey}
              isLoading={isLoading}
              setUploadId={setUploadId}
              setUploadPassword={setUploadPassword}
              setShowPassword={setShowPassword}
              setIncludeApiKey={setIncludeApiKey}
              generateNewId={generateNewId}
              handleCopyId={handleCopyId}
              handleUpload={handleUpload}
            />
          </TabsContent>

          <TabsContent
            value="download"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <DownloadTab
              downloadId={downloadId}
              isLoading={isLoading}
              setDownloadId={setDownloadId}
              handleDownload={handleDownload}
            />
          </TabsContent>

          <TabsContent
            value="offline"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <OfflineTab
              offlineIncludeApiKey={offlineIncludeApiKey}
              isLoading={isLoading}
              activeTab={activeTab}
              fileInputRef={fileInputRef}
              setOfflineIncludeApiKey={setOfflineIncludeApiKey}
              handleOfflineExport={handleOfflineExport}
              handleOfflineImportClick={handleOfflineImportClick}
              handleFileChange={handleFileChange}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
