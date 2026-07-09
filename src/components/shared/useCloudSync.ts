import { useState, useEffect, useRef } from 'react';
import { syncService } from '@/services/core/syncService';

export function useCloudSync() {
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
    if (uploadPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await syncService.exportData({ includeSensitive: includeApiKey });
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

      setSuccess(
        offlineIncludeApiKey
          ? 'Backup file downloaded (includes API keys). Store it securely.'
          : 'Backup file downloaded. API keys and tokens were excluded.'
      );
    } catch {
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
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to process file. Make sure it is a valid backup JSON.');
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
