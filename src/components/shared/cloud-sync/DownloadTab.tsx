import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Download, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface DownloadTabProps {
  downloadId: string;
  downloadPassword?: string;
  showPassword?: boolean;
  isLoading: boolean;
  setDownloadId: (value: string) => void;
  setDownloadPassword?: (value: string) => void;
  setShowPassword?: (value: boolean) => void;
  handleDownload: () => void;
}

export const DownloadTab: React.FC<DownloadTabProps> = ({
  downloadId,
  downloadPassword = '',
  showPassword = false,
  isLoading,
  setDownloadId,
  setDownloadPassword,
  setShowPassword,
  handleDownload,
}) => {
  return (
    <>
      <div className="space-y-3">
        <Label htmlFor="download-id" className="text-sm font-bold text-foreground px-1">
          Account / Sync Identity <span className="text-destructive">*</span>
        </Label>
        <Input
          id="download-id"
          value={downloadId}
          onChange={(e) => setDownloadId(e.target.value)}
          placeholder="Enter your Email, Username, or ID"
          className="h-14 px-4 bg-muted/50 border-input rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-mono text-base text-foreground"
        />
      </div>

      <div className="space-y-3">
        <Label htmlFor="download-password" className="text-sm font-bold text-foreground px-1">
          Protection Password <span className="text-destructive">*</span>
        </Label>
        <div className="relative group">
          <Input
            id="download-password"
            type={showPassword ? 'text' : 'password'}
            value={downloadPassword}
            onChange={(e) => setDownloadPassword?.(e.target.value)}
            placeholder="Enter your protection password"
            className="h-14 px-4 bg-muted/50 border-input rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all pr-12 text-foreground"
          />
          {setShowPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="p-5 bg-warning/10 rounded-2xl border border-warning/30 flex gap-4">
        <div className="p-2 bg-warning/20 rounded-xl h-fit">
          <AlertCircle className="h-5 w-5 text-warning" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Warning</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Data will be <span className="font-bold text-foreground">smartly merged</span>. Newer
            versions from cloud will update local records. Unique local data is preserved.
          </p>
        </div>
      </div>

      <LoadingButton
        onClick={handleDownload}
        disabled={isLoading}
        variant="default"
        isLoading={isLoading}
        loadingText="Restoring..."
        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
        leftIcon={<Download className="h-5 w-5" />}
      >
        Confirm & Merge
      </LoadingButton>
    </>
  );
};
