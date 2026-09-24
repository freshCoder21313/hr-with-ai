import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/ui/loading-button';
import { Upload, Copy, RefreshCw, Eye, EyeOff, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadTabProps {
  uploadId: string;
  uploadPassword: string;
  showPassword: boolean;
  includeApiKey: boolean;
  isLoading: boolean;
  setUploadId: (value: string) => void;
  setUploadPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  setIncludeApiKey: (value: boolean) => void;
  generateNewId: () => void;
  handleCopyId: () => void;
  handleUpload: () => void;
}

export const UploadTab: React.FC<UploadTabProps> = ({
  uploadId,
  uploadPassword,
  showPassword,
  includeApiKey,
  isLoading,
  setUploadId,
  setUploadPassword,
  setShowPassword,
  setIncludeApiKey,
  generateNewId,
  handleCopyId,
  handleUpload,
}) => {
  return (
    <>
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

        <div className="space-y-2 pt-2 px-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-api-key"
              checked={includeApiKey}
              onCheckedChange={(checked) => setIncludeApiKey(checked === true)}
            />
            <label
              htmlFor="include-api-key"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
            >
              Include API keys & tokens (not recommended)
            </label>
          </div>
          <p
            className={cn(
              'text-[11px] leading-relaxed rounded-xl p-3 border',
              includeApiKey
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-100'
            )}
          >
            {includeApiKey ? (
              <>
                <span className="font-bold">Warning:</span> Cloud backup will include API
                keys, GitHub tokens, and voice-provider secrets. Only use a trusted Sync ID
                and strong password.
              </>
            ) : (
              <>
                <span className="font-bold">Privacy default:</span> API keys, GitHub tokens,
                and voice secrets are <span className="font-semibold">excluded</span> from
                this backup. Interviews and resumes still sync.
              </>
            )}
          </p>
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
    </>
  );
};
