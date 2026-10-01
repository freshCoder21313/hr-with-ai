import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { notificationService } from '@/services/core/notificationService';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { toast } from 'sonner';

export const useCVResumes = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mainCV, setMainCV] = useState<Resume | null>(null);
  const [chatResumeId, setChatResumeId] = useState<number | undefined>();

  useEffect(() => {
    const loadData = async () => {
      try {
        const all = await db.resumes.toArray();
        const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
        setResumes(sorted);

        const main = sorted.find((r) => r.isMain) || sorted[0];
        const cv = (await db.getMainCV()) || main || null;

        if (cv) {
          setMainCV(cv);
          setChatResumeId(cv.id);
        }
      } catch (err) {
        logger.error('Failed to load studio resumes', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const refreshResumes = useCallback(async () => {
    try {
      const all = await db.resumes.toArray();
      const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
      setResumes(sorted);
      return sorted;
    } catch (err) {
      logger.error('Failed to refresh CV list', err);
      toast.error('Could not refresh the CV list. Please try again.');
      return null;
    }
  }, []);

  const handleManualUpdate = useCallback(
    async (newData: ResumeData) => {
      if (!mainCV?.id) return;
      setMainCV((prev) => (prev ? { ...prev, parsedData: newData } : null));
      try {
        await db.resumes.update(mainCV.id, { parsedData: newData });
      } catch (err) {
        logger.error('Failed to save CV update', err);
        toast.error('Could not save your changes. Please try again.', {
          id: 'cv-manual-update-error',
        });
      }
    },
    [mainCV]
  );

  const handleRenameCV = useCallback(
    async (id: number, newName: string) => {
      if (!newName.trim()) return false;
      try {
        await db.resumes.update(id, { fileName: newName });
      } catch (err) {
        logger.error('Failed to rename CV', err);
        toast.error('Could not rename the CV. Please try again.');
        return false;
      }
      setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, fileName: newName } : r)));
      if (mainCV?.id === id) {
        setMainCV((prev) => (prev ? { ...prev, fileName: newName } : null));
      }
      return true;
    },
    [mainCV?.id]
  );

  const handleChatCVChange = useCallback(
    (id: number) => {
      const cv = resumes.find((r) => r.id === id);
      if (!cv) return null;
      setChatResumeId(id);
      setMainCV(cv);
      return cv;
    },
    [resumes]
  );

  const handleGitHubImportComplete = useCallback(async () => {
    try {
      const cv = await db.getMainCV();
      if (cv) setMainCV(cv);
      await refreshResumes();
      return cv;
    } catch (err) {
      logger.error('Failed to complete GitHub import', err);
      toast.error('Could not finish the import. Please try again.');
      return null;
    }
  }, [refreshResumes]);

  const handleCreateNewCV = useCallback(async () => {
    const newResume: Resume = {
      createdAt: Date.now(),
      fileName: 'New Resume',
      rawText: '',
      parsedData: {
        basics: { name: '', email: '', label: '', summary: '' },
        work: [],
        education: [],
        skills: [],
        projects: [],
      },
      formatted: true,
      isMain: resumes.length === 0,
    };
    try {
      // Pass a copy: the Dexie `creating` hook deletes `parsedData` off the object
      // it is given (it compresses it to `compressedData`), which would otherwise
      // strip it from the copy we hand back to React state below.
      const id = await db.resumes.add({ ...newResume });
      const fullResume: Resume = { ...newResume, id };
      setResumes((prev) => [fullResume, ...prev]);
      setChatResumeId(id);
      setMainCV(fullResume);
      return fullResume;
    } catch (err) {
      logger.error('Failed to create CV', err);
      toast.error('Could not create a new CV. Please try again.');
      return null;
    }
  }, [resumes.length]);

  const handleDeleteCurrentCV = useCallback(async () => {
    if (!chatResumeId) return false;
    const confirmed = await notificationService.confirm({
      title: 'Delete CV',
      message: 'Are you sure you want to delete this CV?',
      variant: 'destructive',
    });
    if (!confirmed) return false;

    try {
      await db.resumes.delete(chatResumeId);
    } catch (err) {
      logger.error('Failed to delete CV', err);
      toast.error('Could not delete the CV. Please try again.');
      return false;
    }
    const updated = resumes.filter((r) => r.id !== chatResumeId);
    setResumes(updated);

    if (updated.length > 0) {
      const next = updated[0];
      setChatResumeId(next.id);
      setMainCV(next);
    } else {
      setChatResumeId(undefined);
      setMainCV(null);
    }
    return true;
  }, [chatResumeId, resumes]);

  return {
    resumes,
    setResumes,
    isLoading,
    mainCV,
    setMainCV,
    chatResumeId,
    refreshResumes,
    handleManualUpdate,
    handleRenameCV,
    handleChatCVChange,
    handleGitHubImportComplete,
    handleCreateNewCV,
    handleDeleteCurrentCV,
  };
};
