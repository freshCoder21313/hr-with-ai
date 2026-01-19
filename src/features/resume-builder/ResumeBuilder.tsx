import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { Resume, ResumeData } from '@/types/resume';
import { getStoredAIConfig, parseResumeToJSON } from '@/services/geminiService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Wand2, ChevronLeft, Save } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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

  useEffect(() => {
    const loadResume = async () => {
      if (!id) return;
      try {
        const doc = await db.resumes.get(parseInt(id));
        if (doc) {
          setResume(doc as any); // Cast for now due to type update
          if (doc.parsedData) {
            setData(doc.parsedData as any);
          } else {
            // Initialize empty structure if not present
            setData({
              basics: { name: '', email: '', summary: '' },
              work: [],
              education: [],
              skills: [],
              projects: []
            });
          }
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error("Failed to load resume", error);
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
      alert("Please set API Key in settings first.");
      return;
    }

    setIsProcessing(true);
    try {
      const parsed = await parseResumeToJSON(resume.rawText, config);
      setData(parsed);
      
      // Save immediately
      await db.resumes.update(parseInt(id!), {
        parsedData: parsed,
        formatted: true
      });
      setResume(prev => prev ? ({ ...prev, formatted: true }) : null);
      
    } catch (error) {
      console.error(error);
      alert("Failed to format resume: " + (error as any).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!id || !data) return;
    try {
      await db.resumes.update(parseInt(id), {
        parsedData: data
      });
      alert("Saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to save.");
    }
  };

  const updateSection = (section: keyof ResumeData, value: any) => {
    setData(prev => prev ? ({ ...prev, [section]: value }) : null);
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!resume || !data) return <div className="p-8">Resume not found</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/setup')}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-bold text-lg text-slate-800">
            {resume.fileName} <span className="text-slate-400 font-normal">| Editor</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!resume.formatted && (
            <Button 
              onClick={handleSmartFormat} 
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Smart Format
            </Button>
          )}
          <Button onClick={handleSave} variant="outline" className="gap-2">
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r flex-shrink-0 overflow-y-auto">
          <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
              <TabsTrigger value="basics" className="w-full justify-start px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Basics & Contact</TabsTrigger>
              <TabsTrigger value="work" className="w-full justify-start px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Work Experience</TabsTrigger>
              <TabsTrigger value="education" className="w-full justify-start px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Education</TabsTrigger>
              <TabsTrigger value="skills" className="w-full justify-start px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Skills</TabsTrigger>
              <TabsTrigger value="projects" className="w-full justify-start px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Projects</TabsTrigger>
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
                  This resume seems to be raw text. Use "Smart Format" to automatically structure it into fields using AI.
                </p>
                <Button onClick={handleSmartFormat} disabled={isProcessing} size="sm" variant="secondary">
                  Format Now
                </Button>
              </Card>
            )}

            {activeTab === 'basics' && (
              <BasicsForm data={data.basics} onChange={(val) => updateSection('basics', val)} />
            )}
            {activeTab === 'work' && (
              <WorkForm data={data.work} onChange={(val) => updateSection('work', val)} />
            )}
            {activeTab === 'education' && (
              <EducationForm data={data.education} onChange={(val) => updateSection('education', val)} />
            )}
             {activeTab === 'skills' && (
              <SkillsForm data={data.skills} onChange={(val) => updateSection('skills', val)} />
            )}
             {activeTab === 'projects' && (
              <ProjectsForm data={data.projects} onChange={(val) => updateSection('projects', val)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;
