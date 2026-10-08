import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData, TemplateType } from '@/types/resume';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { parseResumeToJSON, translateResume } from '@/services/resume/resumeAIService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/lib/utils';
import { sanitizeResumeDataForSave } from '../SectionForms/entryIds';
import { exportElementToPdf } from '@/services/resume/pdfExportService';
import {
  buildTourSteps,
  isTerminalTourStatus,
  TOUR_COMPLETED_KEY,
} from '@/features/resume-builder/hooks/resumeBuilderTour';

export const useResumeBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resume, setResume] = useState<Resume | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const debouncedData = useDebounce(data, 1000);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');
  const [showPreview, setShowPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [template, setTemplate] = useState<TemplateType>('modern');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [viewLanguage, setViewLanguage] = useState<'vi' | 'en'>('en');
  const [runTour, setRunTour] = useState(false);
  // Resolved when the tour is armed, so steps whose targets are not on the
  // page never enter the walkthrough.
  const [tourSteps, setTourSteps] = useState(() => buildTourSteps());
  const [showStyleEditor, setShowStyleEditor] = useState(false);

  // The editor has mounted by the time data resolves, so this is the first
  // point where the tour's targets can be probed.
  useEffect(() => {
    if (isLoading || !data) return;
    if (localStorage.getItem(TOUR_COMPLETED_KEY)) return;
    setTourSteps(buildTourSteps());
    setRunTour(true);
  }, [isLoading, data]);

  // Mirror volatile state in refs so data-dependent callbacks stay referentially
  // stable across keystrokes (identities no longer change when `data` changes).
  const dataRef = useRef(data);
  dataRef.current = data;
  const resumeRef = useRef(resume);
  resumeRef.current = resume;
  const templateRef = useRef(template);
  templateRef.current = template;
  const viewLanguageRef = useRef(viewLanguage);
  viewLanguageRef.current = viewLanguage;

  useEffect(() => {
    let ignore = false;
    const loadResume = async () => {
      if (!id) return;

      const resumeId = parseInt(id);
      if (isNaN(resumeId)) {
        navigate('/studio');
        return;
      }

      try {
        setIsLoading(true);
        const doc = await db.resumes.get(resumeId);
        if (doc && !ignore) {
          setResume(doc);
          if (doc.parsedData) {
            setData(doc.parsedData);
            if (doc.parsedData.meta?.template)
              setTemplate(doc.parsedData.meta.template as TemplateType);
            if (doc.parsedData.language) setViewLanguage(doc.parsedData.language as 'vi' | 'en');
          } else {
            setData({
              basics: { name: '', email: '', summary: '' },
              work: [],
              education: [],
              skills: [],
              projects: [],
            });
          }
        } else if (!ignore) {
          navigate('/');
        }
      } catch (error) {
        if (!ignore) {
          logger.error('Failed to load resume', error);
          toast.error('Failed to load resume');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };
    loadResume();
    return () => {
      ignore = true;
    };
  }, [id, navigate]);

  // Auto-save debounced data
  useEffect(() => {
    const autoSave = async () => {
      if (!debouncedData || !id) return;

      const resumeId = parseInt(id);
      if (isNaN(resumeId)) return;

      setIsSaving(true);
      try {
        await db.resumes.update(resumeId, {
          parsedData: sanitizeResumeDataForSave(debouncedData),
          updatedAt: Date.now(),
        });
      } catch (error) {
        logger.error('Auto-save failed:', error);
        toast.error('Auto-save failed');
      } finally {
        setIsSaving(false);
      }
    };

    autoSave();
  }, [debouncedData, id]);

  const handleSmartFormat = useCallback(async () => {
    const resume = resumeRef.current;
    const data = dataRef.current;
    const template = templateRef.current;
    if (!resume?.rawText) return;
    if (data?.meta?.lastParsedRawText === resume.rawText) {
      toast.info('The current text has already been formatted.');
      return;
    }
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      openApiKeyModal();
      return;
    }
    setIsProcessing(true);
    try {
      const parsed = await parseResumeToJSON(resume.rawText, config);
      parsed.meta = { ...parsed.meta, lastParsedRawText: resume.rawText, template };
      setData(parsed);
      await db.resumes.update(parseInt(id!), { parsedData: parsed, formatted: true });
      setResume((prev) => (prev ? { ...prev, formatted: true } : null));
    } catch (error) {
      logger.error(error);
      toast.error('Failed to format resume: ' + getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  }, [id]);

  const handleSave = useCallback(async () => {
    const data = dataRef.current;
    const template = templateRef.current;
    if (!id || !data) return;
    const dataToSave = sanitizeResumeDataForSave({ ...data, meta: { ...data.meta, template } });
    setIsSaving(true);
    try {
      await db.resumes.update(parseInt(id), { parsedData: dataToSave });
      setData(dataToSave);
      toast.success('Saved successfully!');
    } catch (error) {
      logger.error(error);
      toast.error('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  }, [id]);

  const handleOrderSave = useCallback((newOrder: { main: string[]; sidebar?: string[] }) => {
    const data = dataRef.current;
    const template = templateRef.current;
    if (!data) return;
    setData({ ...data, meta: { ...data.meta, sectionOrder: newOrder, template } });
  }, []);

  const handleTranslate = useCallback(async () => {
    const data = dataRef.current;
    const viewLanguage = viewLanguageRef.current;
    if (!data) return;
    const targetLang = viewLanguage === 'en' ? 'vi' : 'en';
    const config = getStoredAIConfig();
    if (!config.apiKey) {
      openApiKeyModal();
      return;
    }
    setIsTranslating(true);
    try {
      const translatedData = await translateResume(data, targetLang, config);
      setData(translatedData);
      setViewLanguage(targetLang);
      await db.resumes.update(parseInt(id!), { parsedData: translatedData });
      toast.success(
        `Translated to ${targetLang === 'vi' ? 'Vietnamese' : 'English'} successfully!`
      );
    } catch (error) {
      logger.error(error);
      toast.error('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  }, [id]);

  const handleThemeColorChange = useCallback(
    (color: string) => {
      const data = dataRef.current;
      if (!data || !id) return;
      const newData = { ...data, meta: { ...data.meta, themeColor: color } };
      setData(newData);
      void db.resumes.update(parseInt(id), { parsedData: newData }).catch((error) => {
        logger.error('Failed to persist theme color', error);
        toast.error('Failed to save theme color.');
      });
    },
    [id]
  );

  const handleFontChange = useCallback(
    (fontFamily: 'sans' | 'serif' | 'mono') => {
      const data = dataRef.current;
      if (!data || !id) return;
      const newData = { ...data, meta: { ...data.meta, fontFamily } };
      setData(newData);
      void db.resumes.update(parseInt(id), { parsedData: newData }).catch((error) => {
        logger.error('Failed to persist font choice', error);
        toast.error('Failed to save font choice.');
      });
    },
    [id]
  );

  const handleExportPdf = useCallback(
    async (element: HTMLElement | null, fileName: string) => {
      if (!element || isExporting) return;
      setIsExporting(true);
      try {
        const result = await exportElementToPdf(element, fileName);
        toast.success(result.method === 'download' ? 'PDF downloaded.' : 'PDF ready to share.');
      } catch (error) {
        logger.error('PDF export failed:', error);
        toast.error('Could not export PDF. Please try again.');
      } finally {
        setIsExporting(false);
      }
    },
    [isExporting]
  );

  const updateSection = useCallback(
    <K extends keyof ResumeData>(section: K, value: ResumeData[K]) => {
      setData((prev) => (prev ? { ...prev, [section]: value } : null));
    },
    []
  );

  const handleAddSection = useCallback(
    (section: 'work' | 'education' | 'skills' | 'projects') => {
      setActiveTab(section);
      const data = dataRef.current;
      if (!data) return;
      const newItems = {
        work: { name: 'New Company', position: 'Role', startDate: '', endDate: '', summary: '' },
        education: {
          institution: 'New School',
          area: 'Major',
          studyType: 'Degree',
          startDate: '',
          endDate: '',
        },
        skills: { name: 'New Skill Category', keywords: [] },
        projects: { name: 'New Project', description: '' },
      } as const;
      const currentList = (data[section] as unknown[]) || [];
      updateSection(section, [...currentList!, newItems[section]] as (typeof data)[typeof section]);
    },
    [updateSection]
  );

  const handleDirectUpdate = useCallback(
    (newData: ResumeData) => {
      setData(newData);
      if (id) {
        void db.resumes
          .update(parseInt(id), { parsedData: sanitizeResumeDataForSave(newData) })
          .catch((error) => {
            logger.error('Failed to persist edit', error);
            toast.error('Failed to save change.');
          });
      }
    },
    [id]
  );

  /** Close the tour and remember that it is done. Idempotent, so Skip, the
   *  last step, an overlay click and the Escape fallback can all call it. */
  const handleTourDismiss = useCallback(() => {
    setRunTour(false);
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
  }, []);

  /** Any Joyride status that means the walkthrough is over persists completion,
   *  including `error`: a broken step must not bring the trap back next visit. */
  const handleTourCallback = useCallback(
    (status: string) => {
      if (isTerminalTourStatus(status)) handleTourDismiss();
    },
    [handleTourDismiss]
  );

  const handleViewMode = useCallback((mode: 'editor' | 'preview' | 'split') => {
    setShowPreview(mode === 'preview');
    setIsSplitView(mode === 'split');
  }, []);

  const isLoadingState = isLoading;
  const isNotFound = !isLoading && (!resume || !data);

  const state = useMemo(
    () => ({
      resume,
      data,
      isLoading: isLoadingState,
      notFound: isNotFound,
      isProcessing,
      isSaving,
      activeTab,
      showPreview,
      isSplitView,
      showReorderDialog,
      template,
      isTranslating,
      isExporting,
      viewLanguage,
      runTour,
      showStyleEditor,
      id,
      tourSteps,
    }),
    [
      resume,
      data,
      isLoadingState,
      isNotFound,
      isProcessing,
      isSaving,
      activeTab,
      showPreview,
      isSplitView,
      showReorderDialog,
      template,
      isTranslating,
      isExporting,
      viewLanguage,
      runTour,
      showStyleEditor,
      id,
      tourSteps,
    ]
  );

  const actions = useMemo(
    () => ({
      setActiveTab,
      setShowReorderDialog,
      setTemplate,
      setShowStyleEditor,
      setShowPreview,
      setIsSplitView,
      setRunTour,
      handleSmartFormat,
      handleSave,
      handleOrderSave,
      handleTranslate,
      handleThemeColorChange,
      handleFontChange,
      handleExportPdf,
      handleAddSection,
      handleDirectUpdate,
      handleViewMode,
      handleTourDismiss,
      handleTourCallback,
      navigate,
      updateSection,
    }),
    [
      setActiveTab,
      setShowReorderDialog,
      setTemplate,
      setShowStyleEditor,
      setShowPreview,
      setIsSplitView,
      setRunTour,
      handleSmartFormat,
      handleSave,
      handleOrderSave,
      handleTranslate,
      handleThemeColorChange,
      handleFontChange,
      handleExportPdf,
      handleAddSection,
      handleDirectUpdate,
      handleViewMode,
      handleTourDismiss,
      handleTourCallback,
      navigate,
      updateSection,
    ]
  );

  return { state, actions };
};
