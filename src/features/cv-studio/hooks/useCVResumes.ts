import { useState, useEffect, useCallback } from 'react';
import { notificationService } from '@/services/core/notificationService';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';

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
        console.error('Failed to load studio resumes', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const refreshResumes = useCallback(async () => {
    const all = await db.resumes.toArray();
    const sorted = all.sort((a, b) => b.createdAt - a.createdAt);
    setResumes(sorted);
    return sorted;
  }, []);

  const handleManualUpdate = useCallback(
    async (newData: ResumeData) => {
      if (!mainCV?.id) return;
      setMainCV((prev) => (prev ? { ...prev, parsedData: newData } : null));
      await db.resumes.update(mainCV.id, { parsedData: newData });
    },
    [mainCV]
  );

  const handleRenameCV = useCallback(
    async (id: number, newName: string) => {
      if (!newName.trim()) return;
      await db.resumes.update(id, { fileName: newName });
      setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, fileName: newName } : r)));
      if (mainCV?.id === id) {
        setMainCV((prev) => (prev ? { ...prev, fileName: newName } : null));
      }
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
    const cv = await db.getMainCV();
    if (cv) setMainCV(cv);
    await refreshResumes();
    return cv;
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
    const id = await db.resumes.add(newResume);
    const fullResume = { ...newResume, id };
    setResumes((prev) => [fullResume, ...prev]);
    setChatResumeId(id);
    setMainCV(fullResume);
    return fullResume;
  }, [resumes.length]);

  const handleDeleteCurrentCV = useCallback(async () => {
    if (!chatResumeId) return false;
    const confirmed = await notificationService.confirm({
      title: 'Delete CV',
      message: 'Are you sure you want to delete this CV?',
      variant: 'destructive',
    });
    if (!confirmed) return false;

    await db.resumes.delete(chatResumeId);
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
