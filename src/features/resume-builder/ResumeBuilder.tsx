import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { getStoredAIConfig, parseResumeToJSON } from '@/services/geminiService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Wand2, ChevronLeft, Save, Eye, LayoutTemplate, Printer } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ResumePreview from './ResumePreview';

// Import Section Forms
import BasicsForm from './SectionForms/BasicsForm';
import WorkForm from './SectionForms/WorkForm';
import EducationForm from './SectionForms/EducationForm';
import SkillsForm from './SectionForms/SkillsForm';
import ProjectsForm from './SectionForms/ProjectsForm';

const ResumeBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [resume, setResume] = useState<Resume | null>(null);
  const [data, setData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('basics');
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<'classic' | 'modern'>('modern');

  useEffect(() => {
    const loadResume = async () => {
      if (!id) return;
      try {
        const doc = await db.resumes.get(parseInt(id));
        if (doc) {
          setResume(doc as any);
          if (doc.parsedData) {
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
      alert('Please set API Key in settings first.');
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

  const handlePrint = () => {
    window.print();
  };

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
      {/* Hidden Print Container */}
      <div className="hidden print:block print:absolute print:inset-0 print:z-[9999] print:bg-white">
        <ResumePreview data={data} template={template} />
      </div>

      {/* Main UI */}
      <div className="flex flex-col h-screen bg-slate-50 print:hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/setup')}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              {resume.fileName}
              <span className="text-slate-400 font-normal">| Editor</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg mr-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview(false)}
                className={
                  !showPreview ? 'bg-white shadow-sm hover:bg-white' : 'hover:bg-slate-200'
                }
              >
                Editor
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreview(true)}
                className={showPreview ? 'bg-white shadow-sm hover:bg-white' : 'hover:bg-slate-200'}
              >
                <Eye className="w-4 h-4 mr-2" /> Preview
              </Button>
            </div>

            {showPreview && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplate((t) => (t === 'modern' ? 'classic' : 'modern'))}
                  className="gap-2"
                  title="Switch Layout"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  {template === 'modern' ? 'Modern (2-Col)' : 'Classic (1-Col)'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Printer className="w-4 h-4" /> Export PDF
                </Button>
              </>
            )}

            {!resume.formatted && !showPreview && (
              <Button
                onClick={handleSmartFormat}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Smart Format
              </Button>
            )}

            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" /> Save
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {showPreview ? (
            <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
              <div className="scale-[0.8] md:scale-90 origin-top shadow-2xl">
                <ResumePreview data={data} template={template} />
              </div>
            </div>
          ) : (
            <>
              {/* Sidebar */}
              <div className="w-64 bg-white border-r flex-shrink-0 overflow-y-auto">
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
              <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto">
                  {!resume.formatted && !data.basics.name && (
                    <Card className="mb-8 p-6 bg-purple-50 border-purple-200">
                      <h3 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
                        <Wand2 className="w-5 h-5" />
                        AI Magic Available
                      </h3>
                      <p className="text-purple-800 text-sm mb-4">
                        This resume seems to be raw text. Use &quot;Smart Format&quot; to
                        automatically structure it into fields using AI.
                      </p>
                      <Button
                        onClick={handleSmartFormat}
                        disabled={isProcessing}
                        size="sm"
                        variant="secondary"
                      >
                        Format Now
                      </Button>
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
