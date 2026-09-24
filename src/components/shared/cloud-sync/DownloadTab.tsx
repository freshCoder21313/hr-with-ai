import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Download, AlertCircle } from 'lucide-react';

interface DownloadTabProps {
  downloadId: string;
  isLoading: boolean;
  setDownloadId: (value: string) => void;
  handleDownload: () => void;
}

export const DownloadTab: React.FC<DownloadTabProps> = ({
  downloadId,
  isLoading,
  setDownloadId,
  handleDownload,
}) => {
  return (
    <>
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
    </>
  );
};
