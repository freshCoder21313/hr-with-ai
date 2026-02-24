import React, { useState, useEffect } from 'react';
import { SetupFormData, Resume, ResumeAnalysis, SavedJob } from '@/types';
import {
  Upload,
  Play,
  Sparkles,
  Briefcase,
  Save,
  Trash2,
  ChevronDown,
  Search,
  Users,
} from 'lucide-react';
import { parseResume } from '@/services/resumeParser';
import {
  extractInfoFromJD,
  getStoredAIConfig,
  analyzeResume,
  tailorResumeToJob,
  parseResumeToJSON,
} from '@/services/geminiService';
import { researchCompany } from '@/services/aiResearcherService';
import { useInterview } from '@/hooks/useInterview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/db';
import ResumeList from './ResumeList';
import SEO from '@/components/SEO';
import ResumeAnalysisView from '@/features/resume-analysis/ResumeAnalysisView';
import { TailorResumeModal } from './TailorResumeModal';
import JobRecommendationModal from '@/features/interview/JobRecommendationModal';
import { useNavigate } from 'react-router-dom';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const SetupRoom: React.FC = () => {
  const { startNewInterview, isLoading: isStarting } = useInterview();
  const navigate = useNavigate();
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [savedResumes, setSavedResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number>();
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  // Saved Jobs State
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('new'); // 'new' or stringified number

  // Tailor Resume State
  const [isTailorModalOpen, setIsTailorModalOpen] = useState(false);
  const [resumeToTailor, setResumeToTailor] = useState<Resume | null>(null);

  // Job Recommendation State
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  // Main CV Clone State
  const [showMainCVCloneDialog, setShowMainCVCloneDialog] = useState(false);
  const [pendingMainResume, setPendingMainResume] = useState<Resume | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  const [formData, setFormData] = useState<SetupFormData>({
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona:
      'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
    jobDescription: '',
    resumeText: '',
    language: 'en-US',
    difficulty: 'medium',
    type: 'standard',
    mode: 'hybrid',
    companyStatus: 'Hiring for growth',
    interviewContext: 'Modern day video call',
    isPanel: false,
  });

  // Load saved resumes and jobs
  const loadData = async () => {
    try {
      const resumes = await db.resumes.toArray();
      setSavedResumes(resumes.sort((a, b) => b.createdAt - a.createdAt));

      const jobs = await db.jobs.toArray();
      setSavedJobs(jobs.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const handleResumeSelect = (resume: Resume) => {
    if (selectedResumeId === resume.id) {
      // Deselect
      setSelectedResumeId(undefined);
      setFormData((prev) => ({ ...prev, resumeText: '' }));
    } else {
      // Check if this is a Main CV and we are selecting it (not deselecting)
      if (resume.isMain) {
        setPendingMainResume(resume);
        setShowMainCVCloneDialog(true);
        return;
      }

      // Normal Select
      setSelectedResumeId(resume.id);
      setFormData((prev) => ({ ...prev, resumeText: resume.rawText }));
    }
  };

  const handleSaveJob = async () => {
    if (!formData.jobTitle || !formData.company) {
      alert('Please enter at least a Job Title and Company.');
      return;
    }

    try {
      const timestamp = Date.now();
      const baseJobData = {
        company: formData.company,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        interviewerPersona: formData.interviewerPersona,
        companyStatus: formData.companyStatus,
        interviewContext: formData.interviewContext,
        updatedAt: timestamp,
      };

      if (selectedJobId !== 'new') {
        // Update existing
        await db.jobs.update(parseInt(selectedJobId), baseJobData);
        alert('Job updated successfully!');
      } else {
        // Save as new
        const newJob: SavedJob = {
          ...baseJobData,
          createdAt: timestamp,
        };
        const newId = await db.jobs.add(newJob);
        alert('Job saved successfully!');

        // Refresh list and select the new job
        await loadData();
        setSelectedJobId(newId.toString());
        return;
      }

      loadData();
    } catch (error) {
      console.error('Failed to save job:', error);
      alert('Failed to save job');
    }
  };

  const handleDeleteJob = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent selection
    if (!confirm('Delete this saved job template?')) return;

    try {
      await db.jobs.delete(id);
      if (selectedJobId === id.toString()) {
        setSelectedJobId('new');
      }
      loadData();
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const handleSelectSavedJob = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJobId(val);
    if (val === 'new') {
      // Optional: clear form? No, let's keep current text so user can save it.
      return;
    }

    const job = savedJobs.find((j) => j.id?.toString() === val);
    if (job) {
      setFormData((prev) => ({
        ...prev,
        company: job.company,
        jobTitle: job.jobTitle,
        jobDescription: job.jobDescription,
        interviewerPersona: job.interviewerPersona,
        companyStatus: job.companyStatus || prev.companyStatus,
        interviewContext: job.interviewContext || prev.interviewContext,
      }));
    }
  };

  const handleConfirmClone = async (shouldClone: boolean) => {
    if (!pendingMainResume) return;

    if (shouldClone) {
      setIsCloning(true);
      try {
        const copyName = `[Copy] ${pendingMainResume.fileName}`;
        const newResume: Resume = {
          ...pendingMainResume,
          id: undefined, // Create new ID
          fileName: copyName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isMain: false, // Clone is not Main
        };

        const newId = await db.resumes.add(newResume);
        const savedResume = { ...newResume, id: newId };

        // Update list
        setSavedResumes((prev) => [savedResume, ...prev]);

        // Select the new clone
        setSelectedResumeId(newId);
        setFormData((prev) => ({ ...prev, resumeText: savedResume.rawText }));
      } catch (error) {
        console.error('Failed to clone resume:', error);
        alert('Failed to clone resume');
        // Fallback to original
        setSelectedResumeId(pendingMainResume.id);
        setFormData((prev) => ({ ...prev, resumeText: pendingMainResume.rawText }));
      } finally {
        setIsCloning(false);
      }
    } else {
      // Use original Main CV directly
      setSelectedResumeId(pendingMainResume.id);
      setFormData((prev) => ({ ...prev, resumeText: pendingMainResume.rawText }));
    }

    setShowMainCVCloneDialog(false);
    setPendingMainResume(null);
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

  const handleResearchCompany = async () => {
    if (!formData.company.trim()) {
      alert('Please enter a Company name first.');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set your API Key first.');
      return;
    }

    setIsResearching(true);
    try {
      const intel = await researchCompany(formData.company);
      setFormData((prev) => ({
        ...prev,
        companyStatus: intel.suggestedStatus || prev.companyStatus,
        // We can also append culture info to interviewerPersona or interviewContext
        interviewContext: `${intel.suggestedContext || prev.interviewContext}\n\nCulture: ${intel.culture}\nLatest News: ${intel.latestNews}`,
      }));
      alert(`Research for ${formData.company} complete! Form updated.`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert('Failed to research company: ' + (error as any).message);
    } finally {
      setIsResearching(false);
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
      alert('Analysis failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectJob = async (
    job: import('@/types').JobRecommendation,
    tailoredResumeText: string,
    tailoredResumeData?: import('@/types/resume').ResumeData
  ) => {
    // Fill the form with selected job details
    setFormData((prev) => ({
      ...prev,
      company: job.company,
      jobTitle: job.title,
      jobDescription: job.jobDescription,
      resumeText: tailoredResumeText || prev.resumeText, // Use tailored resume if available
    }));

    // If we have a tailored resume, save it to DB
    if (tailoredResumeText && tailoredResumeData) {
      try {
        const newFileName = `[Tailored] ${job.title} @ ${job.company}.pdf`; // Mock extension
        const newResume: Resume = {
          createdAt: Date.now(),
          fileName: newFileName,
          rawText: tailoredResumeText,
          parsedData: tailoredResumeData,
          formatted: true,
          isMain: false,
        };

        const newId = await db.resumes.add(newResume);
        const savedResume = { ...newResume, id: newId };

        // Update list
        setSavedResumes((prev) => [savedResume, ...prev]);

        // Select it
        setSelectedResumeId(newId);
      } catch (e) {
        console.error('Failed to save tailored resume:', e);
        // non-blocking
      }
    }

    // Close the modal
    setIsJobModalOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <SEO
        title="Setup Interview - HR With AI"
        description="Configure your AI mock interview session. Choose persona, difficulty, and upload your resume."
      />
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
            {/* Job Selection / Template */}
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
              <div className="flex-1">
                <Label className="mb-2 block">Load Saved Job</Label>
                <div className="relative">
                  <select
                    value={selectedJobId}
                    onChange={handleSelectSavedJob}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  >
                    <option value="new">+ New / Custom Job</option>
                    {savedJobs.map((job) => (
                      <option key={job.id} value={job.id?.toString()}>
                        {job.jobTitle} @ {job.company}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>
              <div className="flex items-end h-[62px] pb-[2px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveJob}
                  title="Save current details as a reusable job template"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Job
                </Button>
              </div>

              {/* Delete Button for Saved Jobs */}
              {selectedJobId !== 'new' && (
                <div className="flex items-end h-[62px] pb-[2px]">
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={(e) => handleDeleteJob(e, parseInt(selectedJobId))}
                    title="Delete this saved job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

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
                <div className="mt-2">
                  <LoadingButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResearchCompany}
                    disabled={isResearching || !formData.company.trim()}
                    isLoading={isResearching}
                    loadingText="Researching..."
                    className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                    leftIcon={<Search className="w-3 h-3" />}
                  >
                    Auto-Research Company
                  </LoadingButton>
                </div>
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
                <Label htmlFor="type">Interview Type</Label>
                <div className="relative">
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
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

              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="mode">Interaction Mode</Label>
                <div className="relative">
                  <select
                    id="mode"
                    name="mode"
                    value={formData.mode}
                    onChange={handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="text">Text Chat</option>
                    <option value="voice">Voice Interview</option>
                    <option value="hybrid">Hybrid (Text + Voice)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="isPanel" className="flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4 text-primary" />
                  Panel Interview (Multiple Personas)
                </Label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isPanel}
                  className={`flex w-full text-left items-center gap-3 p-3 rounded-md border transition-all cursor-pointer ${
                    formData.isPanel
                      ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                      : 'bg-background border-input hover:bg-accent/50'
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, isPanel: !prev.isPanel }))}
                >
                  <div
                    className={`w-10 h-5 rounded-full relative transition-colors ${formData.isPanel ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.isPanel ? 'translate-x-5' : ''}`}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {formData.isPanel ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
                <p className="text-[10px] text-muted-foreground italic">
                  AI will simulate multiple interviewers (e.g. HR + Tech Lead).
                </p>
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
                onRefresh={loadData}
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

      <Dialog open={showMainCVCloneDialog} onOpenChange={setShowMainCVCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Main CV?</DialogTitle>
            <DialogDescription>
              You selected your Main CV. Would you like to create a tailored copy for this interview
              or use the original?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => handleConfirmClone(false)}
              disabled={isCloning}
            >
              Use Original
            </Button>
            <LoadingButton
              onClick={() => handleConfirmClone(true)}
              isLoading={isCloning}
              loadingText="Cloning..."
            >
              Make a Copy & Use
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetupRoom;
