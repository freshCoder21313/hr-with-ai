import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { syncService } from '@/services/syncService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Cloud,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  History,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'download'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload State
  const [uploadId, setUploadId] = useState('');
  const [uploadPassword, setUploadPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Download State
  const [downloadId, setDownloadId] = useState('');

  // Generate ID on mount (or just when needed)
  useEffect(() => {
    if (isOpen && activeTab === 'upload' && !uploadId) {
      generateNewId();
    }
  }, [isOpen, activeTab]);

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
      const data = await syncService.exportData();
      const result = await syncService.uploadToCloud(uploadId, uploadPassword, data);

      if (result.success) {
        setSuccess('Data synced to cloud successfully!');
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err) {
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
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-[460px] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <Cloud className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Cloud Sync</h2>
            <p className="text-slate-500 text-sm">Secure backup & cross-device recovery</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-1.5 bg-red-100 rounded-full">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-sm text-red-800 leading-tight">
              <p className="font-bold mb-0.5">Sync Error</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="p-1.5 bg-emerald-100 rounded-full">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-sm text-emerald-800 leading-tight">
              <p className="font-bold mb-0.5">Success</p>
              <p className="opacity-90">{success}</p>
            </div>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as any);
            resetStatus();
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 bg-slate-100/80 p-1.5 mb-8 rounded-2xl">
            <TabsTrigger
              value="upload"
              className="rounded-xl py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              Backup
            </TabsTrigger>
            <TabsTrigger
              value="download"
              className="rounded-xl py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              Restore
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="upload"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <Label htmlFor="upload-id" className="text-sm font-bold text-slate-700">
                  Sync Identity <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                  className="h-14 pl-4 pr-24 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-lg tracking-[0.2em] uppercase text-slate-900"
                />
                <div className="absolute right-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={generateNewId}
                    title="Regenerate"
                    className="h-10 w-10 rounded-xl hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyId}
                    title="Copy Key"
                    className="h-10 w-10 rounded-xl hover:bg-white hover:text-blue-600 transition-colors"
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <div className="shrink-0 p-1 bg-blue-100 rounded-lg h-fit">
                  <Info className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-bold">Security Notice:</span> Keep this ID private.
                  You&apos;ll need it along with your password to restore data on other devices.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="upload-password" className="text-sm font-bold text-slate-700 px-1">
                Protection Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative group">
                <Input
                  id="upload-password"
                  type={showPassword ? 'text' : 'password'}
                  value={uploadPassword}
                  onChange={(e) => setUploadPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="h-14 px-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all pr-12 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-medium px-1 italic">
                Ensures only you can overwrite your cloud-stored data.
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl shadow-[0_10px_20px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Syncing Data...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Push to Cloud
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent
            value="download"
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="space-y-3">
              <Label htmlFor="download-id" className="text-sm font-bold text-slate-700 px-1">
                Identity Key <span className="text-red-500">*</span>
              </Label>
              <Input
                id="download-id"
                value={downloadId}
                onChange={(e) => setDownloadId(e.target.value)}
                placeholder="Paste your 16-character ID"
                maxLength={16}
                className="h-14 px-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono text-center text-lg tracking-[0.2em] uppercase text-slate-900"
              />
            </div>

            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 flex gap-4">
              <div className="p-2 bg-orange-100 rounded-xl h-fit">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-orange-900 uppercase tracking-tight">
                  Warning
                </h3>
                <p className="text-xs text-orange-800 leading-relaxed opacity-90">
                  Data will be <span className="font-bold">smartly merged</span>. Newer versions from
                  cloud will update local records. Unique local data is preserved.
                </p>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              disabled={isLoading}
              variant="secondary"
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-2xl transition-all active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Confirm & Merge
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
