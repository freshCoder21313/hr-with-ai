import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData, TemplateType } from '@/types/resume';
import { Step } from 'react-joyride';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { parseResumeToJSON, translateResume } from '@/services/resume/resumeAIService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorMessage } from '@/lib/utils';
import { sanitizeResumeDataForSave } from '../SectionForms/entryIds';
import { Capacitor } from '@capacitor/core';

const TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content: "Welcome to the AI Resume Builder! Let's take a quick tour.",
    placement: 'center',
  },
  {
    target: '.tour-magic-format',
    content: 'Uploaded a raw text resume? Click here to let AI automatically format it for you!',
  },
  {
    target: '.tour-layout-switch',
    content:
      'Switch between Modern, Classic, Creative, Minimalist, or Academic templates instantly.',
  },
  {
    target: '.tour-translate',
    content: 'Translate your entire resume between English and Vietnamese with one click.',
  },
  {
    target: '.tour-preview-toggle',
    content: 'Toggle between Editor, Full Preview, or Split View side-by-side.',
  },
  {
    target: '.tour-fab',
    content: 'Use this button to quickly add new Work Experience, Education, or Skills.',
  },
];

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
  const [viewLanguage, setViewLanguage] = useState<'vi' | 'en'>('en');
  const [runTour, setRunTour] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);

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
        navigate('/resumes');
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

  const handleOrderSave = useCallback(
    (newOrder: { main: string[]; sidebar?: string[] }) => {
      const data = dataRef.current;
      const template = templateRef.current;
      if (!data) return;
      setData({ ...data, meta: { ...data.meta, sectionOrder: newOrder, template } });
    },
    []
  );

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
      db.resumes.update(parseInt(id), { parsedData: newData });
    },
    [id]
  );

  const handleFontChange = useCallback(
    (fontFamily: 'sans' | 'serif' | 'mono') => {
      const data = dataRef.current;
      if (!data || !id) return;
      const newData = { ...data, meta: { ...data.meta, fontFamily } };
      setData(newData);
      db.resumes.update(parseInt(id), { parsedData: newData });
    },
    [id]
  );

  const handlePrint = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      toast.info('PDF export requires opening the app in a browser.');
      return;
    }
    window.print();
  }, []);

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
      if (id) db.resumes.update(parseInt(id), { parsedData: sanitizeResumeDataForSave(newData) });
    },
    [id]
  );

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenResumeBuilderTour');
    if (!hasSeenTour && !isLoading && data) setRunTour(true);
  }, [isLoading, data]);

  const handleTourFinish = useCallback(() => {
    setRunTour(false);
    localStorage.setItem('hasSeenResumeBuilderTour', 'true');
  }, []);

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
      debouncedData,
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
      viewLanguage,
      runTour,
      showStyleEditor,
      id,
      tourSteps: TOUR_STEPS,
    }),
    [
      resume,
      data,
      debouncedData,
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
      viewLanguage,
      runTour,
      showStyleEditor,
      id,
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
      handlePrint,
      handleAddSection,
      handleDirectUpdate,
      handleViewMode,
      handleTourFinish,
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
      handlePrint,
      handleAddSection,
      handleDirectUpdate,
      handleViewMode,
      handleTourFinish,
      navigate,
      updateSection,
    ]
  );

  return { state, actions };
};
