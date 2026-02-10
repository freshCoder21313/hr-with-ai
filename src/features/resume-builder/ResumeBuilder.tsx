import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { getStoredAIConfig, parseResumeToJSON } from '@/services/geminiService';
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
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ResumePreview from './ResumePreview';
import SectionReorderDialog from './components/SectionReorderDialog';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// Import Section Forms
import BasicsForm from './SectionForms/BasicsForm';
import WorkForm from './SectionForms/WorkForm';
import EducationForm from './SectionForms/EducationForm';
import SkillsForm from './SectionForms/SkillsForm';
import ProjectsForm from './SectionForms/ProjectsForm';
import SEO from '@/components/SEO';
import { cn } from '@/lib/utils';

const ResumeBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resume, setResume] = useState<Resume | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');
  const [showPreview, setShowPreview] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [template, setTemplate] = useState<'classic' | 'modern'>('modern');

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

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      // alert('Please set API Key in settings first.'); // Replaced with modal
      openApiKeyModal();
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = await parseResumeToJSON(resume.rawText, config);
      setData(parsed);

      await db.resumes.update(parseInt(id!), {
        parsedData: parsed,
        formatted: true,
      });
      setResume((prev) => (prev ? { ...prev, formatted: true } : null));
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Failed to format resume: ' + (error as any).message);
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

  const handlePrint = () => {
    window.print();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateSection = (section: keyof ResumeData, value: any) => {
    setData((prev) => (prev ? { ...prev, [section]: value } : null));
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
        <ResumePreview data={data} template={template} />
      </div>

      <SectionReorderDialog
        isOpen={showReorderDialog}
        onClose={() => setShowReorderDialog(false)}
        data={{ ...data, meta: { ...data.meta, template } }}
        onSave={handleOrderSave}
      />

      {/* Main UI */}
      <div className="flex flex-col h-screen bg-background text-foreground print:hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/setup')}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-bold text-lg text-foreground flex items-center gap-2">
              {resume.fileName}
              <span className="text-muted-foreground font-normal">| Editor</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview Toggle */}
            <div className="flex bg-muted p-1 rounded-lg mr-2">
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

            {(showPreview || isSplitView) && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReorderDialog(true)}
                      className="gap-2"
                    >
                      <List className="w-4 h-4" />
                      Arrange
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reorder Sections</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTemplate((t) => (t === 'modern' ? 'classic' : 'modern'))}
                      className="gap-2"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                      {template === 'modern' ? 'Modern' : 'Classic'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Switch Layout</p>
                  </TooltipContent>
                </Tooltip>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2 text-primary border-primary/20 hover:bg-primary/5"
                >
                  <Printer className="w-4 h-4" /> PDF
                </Button>
              </>
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
                    <ResumePreview data={data} template={template} />
                  </div>
                </div>
              </div>
            </div>
          ) : showPreview ? (
            <div className="flex-1 overflow-y-auto bg-muted/30 p-8 flex justify-center">
              <div className="scale-[0.8] md:scale-90 origin-top shadow-2xl">
                <ResumePreview data={data} template={template} />
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
              <div className="flex-1 overflow-y-auto p-8 bg-background">
                <div className="max-w-3xl mx-auto">
                  {!resume.formatted && !data.basics.name && (
                    <Card className="mb-8 p-6 bg-purple-500/10 border-purple-500/20 border">
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
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ResumeBuilder;
