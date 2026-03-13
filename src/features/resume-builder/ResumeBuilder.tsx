import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { getStoredAIConfig, parseResumeToJSON, translateResume } from '@/services/geminiService';
import { openApiKeyModal } from '@/events/apiKeyEvents';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Wand2,
  ChevronLeft,
  Save,
  Eye,
  LayoutTemplate,
  Printer,
  Loader2,
  Columns,
  List,
  Languages,
  Type as TypeIcon,
  Palette,
  Sliders,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResumePreview from './ResumePreview';
import SectionReorderDialog from './components/SectionReorderDialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import Section Forms
import BasicsForm from './SectionForms/BasicsForm';
import WorkForm from './SectionForms/WorkForm';
import EducationForm from './SectionForms/EducationForm';
import SkillsForm from './SectionForms/SkillsForm';
import ProjectsForm from './SectionForms/ProjectsForm';
import SEO from '@/components/SEO';
import { getErrorMessage } from '@/lib/utils';

import Joyride, { Step } from 'react-joyride';
import QuickActionFab from './components/QuickActionFab';
import { useDebounce } from '@/hooks/useDebounce';

const ResumeBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resume, setResume] = useState<Resume | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const debouncedData = useDebounce(data, 500);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');
  const [showPreview, setShowPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [template, setTemplate] = useState<
    'classic' | 'modern' | 'creative' | 'minimalist' | 'academic'
  >('modern');
  const [isTranslating, setIsTranslating] = useState(false);
  const [viewLanguage, setViewLanguage] = useState<'vi' | 'en'>('en');
  const [runTour, setRunTour] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);

  const tourSteps: Step[] = [
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

  useEffect(() => {
    // Check if first time user
    const hasSeenTour = localStorage.getItem('hasSeenResumeBuilderTour');
    if (!hasSeenTour && !isLoading && data) {
      setRunTour(true);
    }
  }, [isLoading, data]);

  const handleTourFinish = () => {
    setRunTour(false);
    localStorage.setItem('hasSeenResumeBuilderTour', 'true');
  };

  useEffect(() => {
    const loadResume = async () => {
      if (!id) return;
      try {
        const doc = await db.resumes.get(parseInt(id));
        if (doc) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setResume(doc as any);
          if (doc.parsedData) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setData(doc.parsedData as any);
            // Load preferred template if saved
            if (doc.parsedData.meta?.template) {
              setTemplate(doc.parsedData.meta.template);
            }
            if (doc.parsedData.language) {
              setViewLanguage(doc.parsedData.language);
            }
          } else {
            setData({
              basics: { name: '', email: '', summary: '' },
              work: [],
              education: [],
              skills: [],
              projects: [],
            });
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to load resume', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadResume();
  }, [id, navigate]);

  const handleSmartFormat = async () => {
    if (!resume?.rawText) return;

    if (data?.meta?.lastParsedRawText === resume.rawText) {
      alert(
        'The current text has already been formatted. Try editing manually or changing the source text.'
      );
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      // alert('Please set API Key in settings first.'); // Replaced with modal
      openApiKeyModal();
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = await parseResumeToJSON(resume.rawText, config);

      // Cache the raw text used for parsing
      parsed.meta = { ...parsed.meta, lastParsedRawText: resume.rawText, template };

      setData(parsed);

      await db.resumes.update(parseInt(id!), {
        parsedData: parsed,
        formatted: true,
      });
      setResume((prev) => (prev ? { ...prev, formatted: true } : null));
    } catch (error) {
      console.error(error);
      alert('Failed to format resume: ' + getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!id || !data) return;

    // Save template preference in meta
    const dataToSave = {
      ...data,
      meta: { ...data.meta, template },
    };

    try {
      await db.resumes.update(parseInt(id), {
        parsedData: dataToSave,
      });
      setData(dataToSave); // Update local state with meta
      alert('Saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to save.');
    }
  };

  const handleOrderSave = (newOrder: { main: string[]; sidebar?: string[] }) => {
    if (!data) return;
    setData({
      ...data,
      meta: {
        ...data.meta,
        sectionOrder: newOrder,
        template, // Ensure template is also synced
      },
    });
  };

  const handleTranslate = async () => {
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

      // Save automatically
      await db.resumes.update(parseInt(id!), {
        parsedData: translatedData,
      });
      alert(`Translated to ${targetLang === 'vi' ? 'Vietnamese' : 'English'} successfully!`);
    } catch (error) {
      console.error(error);
      alert('Translation failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleThemeChange = (color: string) => {
    if (!data) return;
    setData({
      ...data,
      meta: {
        ...data.meta,
        themeColor: color,
      },
    });
  };

  const handleThemeColorChange = (color: string) => {
    if (!data || !id) return;
    const newData = { ...data, meta: { ...data.meta, themeColor: color } };
    setData(newData);
    db.resumes.update(parseInt(id), { parsedData: newData });
  };

  const handleFontChange = (fontFamily: 'sans' | 'serif' | 'mono') => {
    if (!data || !id) return;
    const newData = {
      ...data,
      meta: {
        ...data.meta,
        fontFamily,
      },
    };
    setData(newData);
    db.resumes.update(parseInt(id), { parsedData: newData });
  };

  const handlePrint = () => {
    window.print();
  };

  const updateSection = <K extends keyof ResumeData>(section: K, value: ResumeData[K]) => {
    setData((prev) => (prev ? { ...prev, [section]: value } : null));
  };

  const handleAddSection = (section: 'work' | 'education' | 'skills' | 'projects') => {
    setActiveTab(section);
    if (!data) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newItems: any = {
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
    };

    const currentList = (data[section] as any[]) || [];
    updateSection(section, [...currentList, newItems[section]]);
  };

  const handleScrollToTop = () => {
    document.querySelector('.editor-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToBottom = () => {
    document.querySelector('.editor-scroll-area')?.scrollTo({ top: 9999, behavior: 'smooth' });
  };

  if (isLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!resume || !data) return <div className="p-8">Resume not found</div>;

  // Print View (Only visible when printing)
  return (
    <>
      <SEO
        title="Resume Builder - HR With AI"
        description="Build ATS-friendly resumes with AI assistance. Smart formatting and real-time preview."
      />
      {/* Hidden Print Container */}
      <div className="hidden print:block print:absolute print:inset-0 print:z-[9999] print:bg-white">
        <ResumePreview
          data={data}
          template={template}
          onUpdate={(newData) => {
            setData(newData);
            db.resumes.update(parseInt(id!), { parsedData: newData });
          }}
        />
      </div>

      <SectionReorderDialog
        isOpen={showReorderDialog}
        onClose={() => setShowReorderDialog(false)}
        data={{ ...data, meta: { ...data.meta, template } }}
        onSave={handleOrderSave}
      />

      {/* Main UI */}
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous={true}
        showSkipButton={true}
        showProgress={true}
        styles={{
          options: {
            primaryColor: '#8b5cf6', // purple-500
          },
        }}
        callback={(data) => {
          if (data.status === 'finished' || data.status === 'skipped') {
            handleTourFinish();
          }
        }}
      />
      <div className="flex flex-col h-screen bg-background text-foreground print:hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0 gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/setup')}
              className="shrink-0"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-bold text-lg text-foreground truncate" title={resume.fileName}>
              {resume.fileName}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Preview Toggle */}
            <div className="flex bg-muted p-1 rounded-lg mr-2 tour-preview-toggle">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowPreview(false);
                  setIsSplitView(false);
                }}
                className={
                  !showPreview && !isSplitView
                    ? 'bg-background shadow-sm hover:bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }
              >
                Editor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowPreview(true);
                  setIsSplitView(false);
                }}
                className={
                  showPreview && !isSplitView
                    ? 'bg-background shadow-sm hover:bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsSplitView(true);
                  setShowPreview(false); // Split view overrides standard preview
                }}
                className={
                  isSplitView
                    ? 'bg-background shadow-sm hover:bg-background text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }
              >
                <Columns className="w-4 h-4 mr-2" /> Split
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStyleEditor(!showStyleEditor)}
              className="mr-2"
            >
              <Sliders className="w-4 h-4 mr-2 md:hidden" />
              <Sliders className="w-4 h-4 mr-2 hidden md:block" />
              <span className="hidden md:inline">Settings</span>
            </Button>

            {(showPreview || isSplitView) && (
              <div className="flex md:hidden items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <LayoutTemplate className="w-4 h-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowReorderDialog(true)}>
                      <List className="w-4 h-4 mr-2" /> Arrange Sections
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" /> Export PDF
                    </DropdownMenuItem>
                    {/* Add more mobile actions here if needed */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {!resume.formatted && !showPreview && !isSplitView && (
              <LoadingButton
                onClick={handleSmartFormat}
                disabled={isProcessing}
                isLoading={isProcessing}
                loadingText=""
                className="bg-purple-600 hover:bg-purple-700 text-white"
                leftIcon={<Wand2 className="w-4 h-4" />}
              >
                Smart Format
              </LoadingButton>
            )}

            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Split View */}
          {isSplitView ? (
            <div className="flex w-full h-full overflow-hidden">
              {/* Left: Source Text */}
              <div className="w-1/2 border-r border-border flex flex-col bg-muted/10">
                <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground flex justify-between items-center">
                  <span>Original Source (Raw Text)</span>
                  <span className="text-xs">Read-only</span>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm text-foreground/80 leading-relaxed">
                    {resume.rawText || 'No source text available.'}
                  </pre>
                </div>
              </div>
              {/* Right: Preview */}
              <div className="w-1/2 flex flex-col bg-muted/30">
                <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground text-center">
                  <span>Tailored Result (Preview)</span>
                </div>
                <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                  <div className="scale-[0.65] origin-top shadow-xl w-full max-w-[210mm]">
                    <ResumePreview
                      data={debouncedData || data}
                      template={template}
                      onUpdate={(newData) => {
                        setData(newData);
                        db.resumes.update(parseInt(id!), { parsedData: newData });
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : showPreview ? (
            <div className="flex-1 relative overflow-hidden flex bg-muted/30">
              {/* Left Toolbar */}
              <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowReorderDialog(true)}
                      className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
                    >
                      <List className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Arrange Sections</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
                        >
                          <LayoutTemplate className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Switch Template</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={() => setTemplate('modern')}>
                      Modern
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTemplate('classic')}>
                      Classic
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTemplate('creative')}>
                      Creative
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTemplate('minimalist')}>
                      Minimalist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTemplate('academic')}>
                      Academic
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                        >
                          <Palette className="w-5 h-5 z-10" />
                          <div
                            className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                            style={{ backgroundColor: data?.meta?.themeColor || '#2563eb' }}
                          />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Change Theme Color</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start" className="w-48 p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        '#2563eb', // Blue
                        '#1e40af', // Dark Blue
                        '#0f172a', // Slate
                        '#059669', // Emerald
                        '#16a34a', // Green
                        '#d97706', // Amber
                        '#ea580c', // Orange
                        '#dc2626', // Red
                        '#e11d48', // Rose
                        '#c026d3', // Rose/Pink
                        '#9333ea', // Fuchsia
                        '#7c3aed', // Purple
                        '#4f46e5', // Violet
                        '#0891b2', // Cyan
                        '#0d9488', // Teal
                        '#0284c7', // Light Blue
                      ].map((color) => (
                        <button
                          key={color}
                          className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          style={{ backgroundColor: color }}
                          onClick={() => handleThemeColorChange(color)}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="col-span-4 mt-2 text-xs text-muted-foreground text-center">
                      Color applied to all templates
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
                        >
                          <TypeIcon className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Change Font</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={() => handleFontChange('sans')}>
                      Sans-serif
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFontChange('serif')}>
                      Serif
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleFontChange('mono')}>
                      Monospace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Main Preview Area */}
              <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                <div className="scale-[0.8] md:scale-90 origin-top shadow-2xl h-fit">
                  <ResumePreview
                    data={debouncedData || data}
                    template={template}
                    onUpdate={(newData) => {
                      setData(newData);
                      db.resumes.update(parseInt(id!), { parsedData: newData });
                    }}
                  />
                </div>
              </div>

              {/* Right Toolbar */}
              <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
                {(template === 'creative' ||
                  template === 'minimalist' ||
                  template === 'academic') && (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="relative flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-background shadow-sm flex items-center justify-center cursor-pointer overflow-hidden border border-input hover:shadow-md transition-all">
                          <input
                            type="color"
                            value={
                              data?.meta?.themeColor ||
                              (template === 'minimalist'
                                ? '#1e293b'
                                : template === 'academic'
                                  ? '#1e3a8a'
                                  : '#8b5cf6')
                            }
                            onChange={(e) => handleThemeChange(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                          />
                          <div
                            className="w-6 h-6 rounded-full border border-black/10"
                            style={{
                              backgroundColor:
                                data?.meta?.themeColor ||
                                (template === 'minimalist'
                                  ? '#1e293b'
                                  : template === 'academic'
                                    ? '#1e3a8a'
                                    : '#8b5cf6'),
                            }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Theme Color</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Toggle logic handled by Translate or Switch
                      }}
                      className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative"
                    >
                      <Languages className="w-5 h-5" />
                      <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground px-1 rounded-sm uppercase">
                        {viewLanguage}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold">
                        Current: {viewLanguage === 'en' ? 'English' : 'Vietnamese'}
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs h-7"
                        onClick={handleTranslate}
                        disabled={isTranslating}
                      >
                        {isTranslating ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <Wand2 className="w-3 h-3 mr-1" />
                        )}
                        Translate
                      </Button>
                    </div>
                  </TooltipContent>
                </Tooltip>

                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrint}
                      className="h-10 w-10 rounded-full bg-background text-primary border-primary/20 hover:bg-primary/5 shadow-sm hover:shadow-md transition-all"
                    >
                      <Printer className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Export PDF</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar */}
              <div className="w-64 bg-card border-r border-border flex-shrink-0 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
                    <TabsTrigger value="basics" className="w-full justify-start px-4 py-2">
                      Basics & Contact
                    </TabsTrigger>

                    <TabsTrigger value="work" className="w-full justify-start px-4 py-2">
                      Work Experience
                    </TabsTrigger>
                    <TabsTrigger value="education" className="w-full justify-start px-4 py-2">
                      Education
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="w-full justify-start px-4 py-2">
                      Skills
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="w-full justify-start px-4 py-2">
                      Projects
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Editor Area */}
              <div className="flex-1 overflow-y-auto p-8 bg-background editor-scroll-area">
                <div className="max-w-3xl mx-auto">
                  {!resume.formatted && !data.basics.name && (
                    <Card className="mb-8 p-6 bg-purple-500/10 border-purple-500/20 border tour-magic-format">
                      <h3 className="font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                        <Wand2 className="w-5 h-5" />
                        AI Magic Available
                      </h3>
                      <p className="text-purple-600 dark:text-purple-300 text-sm mb-4">
                        This resume seems to be raw text. Use &quot;Smart Format&quot; to
                        automatically structure it into fields using AI.
                      </p>
                      <LoadingButton
                        onClick={handleSmartFormat}
                        disabled={isProcessing}
                        isLoading={isProcessing}
                        loadingText="Formatting..."
                        size="sm"
                        variant="secondary"
                      >
                        Format Now
                      </LoadingButton>
                    </Card>
                  )}

                  {activeTab === 'basics' && (
                    <BasicsForm
                      data={data.basics}
                      onChange={(val) => updateSection('basics', val)}
                    />
                  )}
                  {activeTab === 'work' && (
                    <WorkForm data={data.work} onChange={(val) => updateSection('work', val)} />
                  )}
                  {activeTab === 'education' && (
                    <EducationForm
                      data={data.education}
                      onChange={(val) => updateSection('education', val)}
                    />
                  )}
                  {activeTab === 'skills' && (
                    <SkillsForm
                      data={data.skills}
                      onChange={(val) => updateSection('skills', val)}
                    />
                  )}
                  {activeTab === 'projects' && (
                    <ProjectsForm
                      data={data.projects}
                      onChange={(val) => updateSection('projects', val)}
                    />
                  )}
                </div>
              </div>
              <div className="tour-fab">
                <QuickActionFab
                  onAddSection={handleAddSection}
                  onScrollToTop={handleScrollToTop}
                  onScrollToBottom={handleScrollToBottom}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResumeBuilder;
