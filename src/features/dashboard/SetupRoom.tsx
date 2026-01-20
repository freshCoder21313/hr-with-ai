import React, { useState } from 'react';
import { SetupFormData, Resume } from '@/types';
import { Upload, Loader2, Play, Sparkles } from 'lucide-react';
import { parseResume } from '@/services/resumeParser';
import { extractInfoFromJD, getStoredAIConfig, analyzeResume, ResumeAnalysis, tailorResumeToJob, parseResumeToJSON } from '@/services/geminiService';
import { useInterview } from '@/hooks/useInterview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import ResumeList from './ResumeList';
import ResumeAnalysisView from '@/features/resume-analysis/ResumeAnalysisView';
import { TailorResumeModal } from './TailorResumeModal';
import { useNavigate } from 'react-router-dom';

const SetupRoom: React.FC = () => {
  const { startNewInterview, isLoading: isStarting } = useInterview();
  const navigate = useNavigate();
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  // Tailor Resume State
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [resumeToTailor, setResumeToTailor] = useState<Resume | null>(null);

  const [formData, setFormData] = useState<SetupFormData>({
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona: 'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
    jobDescription: '',
    resumeText: '',
    language: 'en-US'
  });

  // Load saved resumes on mount
  React.useEffect(() => {
    const loadResumes = async () => {
      try {
        const resumes = await db.resumes.toArray();
        setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error('Failed to load resumes:', error);
      }
    };
    loadResumes();
  }, []);

  const handleResumeSelect = (resume: Resume) => {
    if (selectedResumeId === resume.id) {
        // Deselect
        setSelectedResumeId(undefined);
        setFormData(prev => ({ ...prev, resumeText: '' }));
    } else {
        // Select
        setSelectedResumeId(resume.id);
        setFormData(prev => ({ ...prev, resumeText: resume.rawText }));
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;
    
    try {
        await db.resumes.delete(id);
        setSavedResumes(prev => prev.filter(r => r.id !== id));
        if (selectedResumeId === id) {
            setSelectedResumeId(undefined);
            setFormData(prev => ({ ...prev, resumeText: '' }));
        }
    } catch (error) {
        console.error('Failed to delete resume:', error);
        alert('Failed to delete resume');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startNewInterview(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTailorClick = (resume: Resume) => {
    setResumeToTailor(resume);
    setIsTailorModalOpen(true);
  };

  const handleGenerateTailoredResume = async (jobDescription: string) => {
    if (!resumeToTailor) return;

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert("Please set your API Key first.");
      return;
    }

    try {
      // 1. Ensure we have structured data
      let sourceData = resumeToTailor.parsedData;
      if (!sourceData) {
        // If not parsed yet, parse it on the fly
        sourceData = await parseResumeToJSON(resumeToTailor.rawText, config);
        // Optionally save this back to the original resume? Let's skip that to avoid side effects.
      }

      // 2. Generate Tailored Resume
      const tailoredData = await tailorResumeToJob(sourceData, jobDescription, config);

      // 3. Create New Resume Entry
      const newFileName = `${resumeToTailor.fileName.replace(/\.pdf|\.txt/i, '')} - Tailored.pdf`; // Mocking filename
      
      const newResume: Resume = {
        createdAt: Date.now(),
        fileName: newFileName,
        rawText: resumeToTailor.rawText, // Keep original text as backup? Or maybe empty since it's generated?
        parsedData: tailoredData,
        formatted: true
      };

      const newId = await db.resumes.add(newResume);
      
      // 4. Navigate to Editor
      navigate(`/resumes/${newId}/edit`);

    } catch (error) {
      console.error(error);
      alert("Failed to tailor resume: " + (error as any).message);
    }
  };

  const handleAutoFill = async () => {
    if (!formData.jobDescription.trim()) {
      alert("Please enter a Job Description first.");
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert("Please set your API Key first.");
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await extractInfoFromJD(formData.jobDescription, config);
      setFormData(prev => ({
        ...prev,
        company: extracted.company,
        jobTitle: extracted.jobTitle,
        interviewerPersona: extracted.interviewerPersona
      }));
    } catch (error) {
      alert("Failed to extract info: " + (error as any).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const text = await parseResume(file);
      
      // Save to DB
      const newResume: Resume = {
          createdAt: Date.now(),
          fileName: file.name,
          rawText: text
      };
      
      const id = await db.resumes.add(newResume);
      const savedResume = { ...newResume, id }; // id is correctly typed as number from Dexie add return

      // Update state
      setSavedResumes(prev => [savedResume, ...prev]);
      setSelectedResumeId(id);
      setFormData(prev => ({ ...prev, resumeText: text }));
      setResumeAnalysis(null); // Reset analysis on new upload
      
    } catch (error) {
      alert("Failed to parse resume: " + (error as any).message);
    } finally {
      setIsParsing(false);
      e.target.value = ''; 
    }
  };

  const handleAnalyzeResume = async () => {
    if (!formData.resumeText || !formData.jobDescription) {
      alert("Please provide both Resume content and Job Description.");
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert("Please set your API Key first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeResume(formData.resumeText, formData.jobDescription, config);
      setResumeAnalysis(analysis);
    } catch (error) {
      alert("Analysis failed: " + (error as any).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">

      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
          <CardTitle className="text-2xl md:text-3xl font-bold text-slate-900">Setup Interview Room</CardTitle>
          <CardDescription className="text-sm md:text-lg text-slate-500 mt-2">
            Configure the AI persona and context for your realistic practice session.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="company">Target Company</Label>
                <Input
                  id="company"
                  required
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g. Google, Shopee, Startup..."
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  required
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Product Manager"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="interviewerPersona">Interviewer Persona</Label>
                <Textarea
                  id="interviewerPersona"
                  required
                  name="interviewerPersona"
                  value={formData.interviewerPersona}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the interviewer's style..."
                  className="resize-none"
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="language">Language</Label>
                <div className="relative">
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="flex h-11 md:h-[88px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="vi-VN">Tiếng Việt</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={handleAutoFill}
                  disabled={isExtracting || !formData.jobDescription.trim()}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {isExtracting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Auto-fill from JD
                </Button>
              </div>
              <Textarea
                id="jobDescription"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                rows={5}
                placeholder="Paste the JD here..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="resumeText">Resume / CV Content</Label>
                <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-9 px-4 py-2 ${isParsing ? 'opacity-70 cursor-wait' : ''}`}>
                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    <span>{isParsing ? 'Reading PDF...' : 'Upload PDF/TXT'}</span>
                    <input 
                        type="file" 
                        accept=".pdf,.txt" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isParsing}
                    />
                </label>
              </div>
              
              <ResumeList 
                resumes={savedResumes}
                selectedResumeId={selectedResumeId}
                onSelect={handleResumeSelect}
                onDelete={handleDeleteResume}
                onTailor={handleTailorClick}
              />

              <Textarea
                id="resumeText"
                name="resumeText"
                value={formData.resumeText}
                onChange={handleChange}
                rows={5}
                placeholder="Paste your resume text here..."
                className="font-mono text-sm"
              />

              {formData.resumeText && formData.jobDescription && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAnalyzeResume}
                    disabled={isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Fit...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                        Analyze Resume Fit (AI)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {resumeAnalysis && <ResumeAnalysisView analysis={resumeAnalysis} />}
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={isStarting}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-[1.01]"
              >
                {isStarting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Setting up Room...
                    </>
                ) : (
                    <>
                        Enter Interview Room
                        <Play className="ml-2 h-5 w-5 fill-current" />
                    </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <TailorResumeModal 
        isOpen={isTailorModalOpen}
        onClose={() => setIsTailorModalOpen(false)}
        sourceResume={resumeToTailor}
        onGenerate={handleGenerateTailoredResume}
      />
    </div>
  );
};

export default SetupRoom;
