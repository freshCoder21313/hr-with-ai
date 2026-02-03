import React, { useState } from 'react';
import { SetupFormData, Resume, ResumeAnalysis } from '@/types';
import { Upload, Play, Sparkles, Briefcase } from 'lucide-react';
import { parseResume } from '@/services/resumeParser';
import {
  extractInfoFromJD,
  getStoredAIConfig,
  analyzeResume,
  tailorResumeToJob,
  parseResumeToJSON,
} from '@/services/geminiService';
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
import JobRecommendationModal from '@/features/interview/JobRecommendationModal';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@/components/ui/loading-button';

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

  // Job Recommendation State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  const [formData, setFormData] = useState<SetupFormData>({
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona:
      'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
    jobDescription: '',
    resumeText: '',
    language: 'en-US',
    difficulty: 'medium',
    mode: 'standard',
    companyStatus: 'Hiring for growth',
    interviewContext: 'Modern day video call',
  });

  // Load saved resumes
  const loadResumes = async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to load resumes:', error);
    }
  };

  // Load saved resumes on mount
  React.useEffect(() => {
    loadResumes();
  }, []);

  const handleResumeSelect = (resume: Resume) => {
    if (selectedResumeId === resume.id) {
      // Deselect
      setSelectedResumeId(undefined);
      setFormData((prev) => ({ ...prev, resumeText: '' }));
    } else {
      // Select
      setSelectedResumeId(resume.id);
      setFormData((prev) => ({ ...prev, resumeText: resume.rawText }));
    }
  };

  const handleDeleteResume = async (id: number) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      await db.resumes.delete(id);
      setSavedResumes((prev) => prev.filter((r) => r.id !== id));
      if (selectedResumeId === id) {
        setSelectedResumeId(undefined);
        setFormData((prev) => ({ ...prev, resumeText: '' }));
      }
    } catch (error) {
      console.error('Failed to delete resume:', error);
      alert('Failed to delete resume');
    }
  };

  const handleToggleMain = async (resume: Resume) => {
    if (!resume.id) return;
    try {
      await db.setMainCV(resume.id);
      // Reload resumes to reflect changes
      const updated = await db.resumes.toArray();
      setSavedResumes(updated.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error('Failed to set main CV:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startNewInterview(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
      alert('Please set your API Key first.');
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
        formatted: true,
      };

      const newId = await db.resumes.add(newResume);

      // 4. Navigate to Editor
      navigate(`/resumes/${newId}/edit`);
    } catch (error) {
      console.error(error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Failed to tailor resume: ' + (error as any).message);
    }
  };

  const handleAutoFill = async () => {
    if (!formData.jobDescription.trim()) {
      alert('Please enter a Job Description first.');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set your API Key first.');
      return;
    }

    setIsExtracting(true);
    try {
      const extracted = await extractInfoFromJD(formData.jobDescription, config);
      setFormData((prev) => ({
        ...prev,
        company: extracted.company,
        jobTitle: extracted.jobTitle,
        interviewerPersona: extracted.interviewerPersona,
        difficulty: extracted.difficulty || prev.difficulty,
        companyStatus: extracted.companyStatus || prev.companyStatus,
        interviewContext: extracted.interviewContext || prev.interviewContext,
      }));
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Failed to extract info: ' + (error as any).message);
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
        rawText: text,
      };

      const id = await db.resumes.add(newResume);
      const savedResume = { ...newResume, id }; // id is correctly typed as number from Dexie add return

      // Update state
      setSavedResumes((prev) => [savedResume, ...prev]);
      setSelectedResumeId(id);
      setFormData((prev) => ({ ...prev, resumeText: text }));
      setResumeAnalysis(null); // Reset analysis on new upload
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Failed to parse resume: ' + (error as any).message);
    } finally {
      setIsParsing(false);
      e.target.value = '';
    }
  };

  const handleAnalyzeResume = async () => {
    if (!formData.resumeText || !formData.jobDescription) {
      alert('Please provide both Resume content and Job Description.');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set your API Key first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeResume(
        formData.resumeText,
        formData.jobDescription,
        config,
        selectedResumeId
      );
      setResumeAnalysis(analysis);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Analysis failed: ' + (error as any).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelectJob = async (job: any, tailoredResumeText: string) => {
    // Fill the form with selected job details
    setFormData((prev) => ({
      ...prev,
      company: job.company,
      jobTitle: job.title,
      jobDescription: job.jobDescription,
      resumeText: tailoredResumeText || prev.resumeText, // Use tailored resume if available
    }));

    // Close the modal
    setIsJobModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Card className="shadow-xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
            Setup Interview Room
          </CardTitle>
          <CardDescription className="text-sm md:text-lg text-muted-foreground mt-2">
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
                    className="flex h-11 md:h-[88px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="vi-VN">Tiếng Việt</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="mode">Interview Mode</Label>
                <div className="relative">
                  <select
                    id="mode"
                    name="mode"
                    value={formData.mode}
                    onChange={handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="standard">Standard</option>
                    <option value="coding">Coding (Technical)</option>
                    <option value="system_design">System Design</option>
                    <option value="behavioral">Behavioral (STAR)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <div className="relative">
                  <select
                    id="difficulty"
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="easy">Easy (Friendly)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="hard">Hard (Strict)</option>
                    <option value="hardcore">Hardcore (Pressure)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="companyStatus">Company Status</Label>
                <Input
                  id="companyStatus"
                  name="companyStatus"
                  value={formData.companyStatus}
                  onChange={handleChange}
                  placeholder="e.g. Hiring urgently, Exploring, Startup mode..."
                  className="h-11"
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="interviewContext">Interview Context</Label>
                <Input
                  id="interviewContext"
                  name="interviewContext"
                  value={formData.interviewContext}
                  onChange={handleChange}
                  placeholder="e.g. Modern Video Call, On-site, Future..."
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="jobDescription">Job Description</Label>
                <LoadingButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFill}
                  disabled={isExtracting || !formData.jobDescription.trim()}
                  isLoading={isExtracting}
                  loadingText="Auto-fill from JD"
                  className="text-primary border-primary/20 hover:bg-primary/10 dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Auto-fill from JD
                </LoadingButton>
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsJobModalOpen(true)}
                    className="text-yellow-500 border-primary/20 hover:bg-primary/10 hover:border-primary/50 dark:text-primary dark:border-yellow-500/30 dark:hover:bg-primary/10"
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    Find Job with CV
                  </Button>
                  <label
                    className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 ${isParsing ? 'opacity-70 cursor-wait' : ''}`}
                  >
                    <LoadingButton
                      variant="ghost"
                      size="sm"
                      isLoading={isParsing}
                      loadingText="Reading PDF..."
                      className="p-0 h-auto hover:bg-transparent"
                      asChild
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF/TXT
                    </LoadingButton>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isParsing}
                    />
                  </label>
                </div>
              </div>

              <ResumeList
                resumes={savedResumes}
                selectedResumeId={selectedResumeId}
                onSelect={handleResumeSelect}
                onDelete={handleDeleteResume}
                onTailor={handleTailorClick}
                onToggleMain={handleToggleMain}
                onRefresh={loadResumes}
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
                  <LoadingButton
                    type="button"
                    variant="secondary"
                    onClick={handleAnalyzeResume}
                    disabled={isAnalyzing}
                    isLoading={isAnalyzing}
                    loadingText="Analyzing Fit..."
                    className="w-full"
                    leftIcon={<Sparkles className="w-4 h-4 text-primary" />}
                  >
                    Analyze Resume Fit (AI)
                  </LoadingButton>
                </div>
              )}

              {resumeAnalysis && <ResumeAnalysisView analysis={resumeAnalysis} />}
            </div>

            <div className="pt-6">
              <LoadingButton
                type="submit"
                disabled={isStarting}
                isLoading={isStarting}
                loadingText="Setting up Room..."
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
              >
                Enter Interview Room
                <Play className="ml-2 h-5 w-5 fill-current" />
              </LoadingButton>
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

      <JobRecommendationModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onSelectJob={handleSelectJob}
        existingResumeId={selectedResumeId}
        availableResumes={savedResumes}
      />
    </div>
  );
};

export default SetupRoom;
