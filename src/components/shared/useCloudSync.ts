import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { syncService } from '@/services/core/syncService';
import { vaultService } from '@/services/core/vaultService';

const STORAGE_ACCOUNT_ID = 'career_sync_id';

export function useCloudSync() {
  const [activeTab, setActiveTab] = useState<'upload' | 'download' | 'offline'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload State
  const [uploadId, setUploadId] = useState(() => localStorage.getItem(STORAGE_ACCOUNT_ID) || '');
  const [uploadPassword, setUploadPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [includeApiKey, setIncludeApiKey] = useState(false);

  // Download State
  const [downloadId, setDownloadId] = useState(
    () => localStorage.getItem(STORAGE_ACCOUNT_ID) || ''
  );

  // Offline State
  const [offlineIncludeApiKey, setOfflineIncludeApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (uploadId.trim()) {
      localStorage.setItem(STORAGE_ACCOUNT_ID, uploadId.trim());
    }
  }, [uploadId]);

  useEffect(() => {
    if (downloadId.trim()) {
      localStorage.setItem(STORAGE_ACCOUNT_ID, downloadId.trim());
    }
  }, [downloadId]);

  useEffect(() => {
    if (activeTab === 'upload' && !uploadId) {
      generateNewId();
    }
  }, [activeTab, uploadId]);

  const generateNewId = () => {
    const newId = syncService.generateId();
    setUploadId(newId);
  };

  const resetStatus = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(uploadId);
      setSuccess('Account ID copied to clipboard');
    } catch (err: unknown) {
      logger.error('useCloudSync: clipboard write failed', err);
      toast.error('Could not copy to clipboard. Copy the ID manually.');
      setError('Copy failed. Copy the ID manually.');
    }
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleUpload = async () => {
    resetStatus();
    if (!uploadId || !syncService.validateId(uploadId)) {
      setError('Invalid Account format. Please enter an email, username, or valid ID.');
      return;
    }
    if (!uploadPassword) {
      setError('Password is required for secure upload.');
      return;
    }
    if (uploadPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      // Legacy blob backup excludes Career Knowledge (size cap); CK syncs via its own relational path.
      const data = await syncService.exportData({
        includeSensitive: includeApiKey,
        excludeCareerKnowledge: true,
      });
      const result = await syncService.uploadToCloud(uploadId, uploadPassword, data);

      if (result.success) {
        setSuccess(
          includeApiKey
            ? 'Synced to cloud (including API keys). Keep your ID & password private.'
            : 'Synced to cloud. API keys and tokens were excluded from this backup.'
        );
      } else {
        setError(result.message || 'Upload failed');
      }
    } catch (err: unknown) {
      logger.error('useCloudSync: upload failed', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    resetStatus();
    if (!downloadId || !syncService.validateId(downloadId)) {
      setError('Invalid Account format. Must be an email, username, or valid ID.');
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
    } catch (err: unknown) {
      logger.error('useCloudSync: download failed', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOfflineExport = async () => {
    resetStatus();
    setIsLoading(true);
    try {
      const fileName = await vaultService.downloadVaultFile({
        includeSensitive: offlineIncludeApiKey,
      });
      setSuccess(
        offlineIncludeApiKey
          ? `Full Career Vault (${fileName}) exported including API keys. Store it securely.`
          : `Full Career Vault (${fileName}) exported. API keys were excluded.`
      );
    } catch (err: unknown) {
      logger.error('useCloudSync: offline vault export failed', err);
      setError('Failed to export vault file.');
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
      const fileText = await file.text();
      const res = await vaultService.importVault(fileText);

      if (res.success) {
        setSuccess(
          'Vault restored and merged into local database successfully! The page will reload momentarily.'
        );
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError(res.error || 'Failed to import vault file.');
      }
    } catch (err: unknown) {
      logger.error('useCloudSync: offline import merge failed', err);
      setError(
        err instanceof Error
          ? `The file parsed, but applying it failed: ${err.message}`
          : 'The file parsed, but applying it to this device failed.'
      );
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    state: {
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
    },
    actions: {
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
    },
  };
}
