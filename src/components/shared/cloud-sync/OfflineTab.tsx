import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingButton } from '@/components/ui/loading-button';
import { FileJson, Laptop, Upload, Download } from 'lucide-react';

interface OfflineTabProps {
  offlineIncludeApiKey: boolean;
  isLoading: boolean;
  activeTab: 'upload' | 'download' | 'offline';
  fileInputRef: React.RefObject<HTMLInputElement>;
  setOfflineIncludeApiKey: (value: boolean) => void;
  handleOfflineExport: () => void;
  handleOfflineImportClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const OfflineTab: React.FC<OfflineTabProps> = ({
  offlineIncludeApiKey,
  isLoading,
  activeTab,
  fileInputRef,
  setOfflineIncludeApiKey,
  handleOfflineExport,
  handleOfflineImportClick,
  handleFileChange,
}) => {
  return (
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
              Include API keys & tokens
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {offlineIncludeApiKey
              ? 'File will contain secrets — store offline backups securely.'
              : 'Default: keys excluded. Interviews & resumes still export.'}
          </p>

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
  );
};
