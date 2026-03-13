import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  Plus,
  Trash2,
  Play,
  Wand2,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Settings,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Resume } from '@/types';
import { db } from '@/lib/db';
import { getStoredAIConfig, tailorResumeV2, parseResumeToJSON } from '@/services/geminiService';
import SEO from '@/components/SEO';
import { useJobStore, Job } from './stores/useJobStore';
import { Checkbox } from '@/components/ui/checkbox';
import { EditGlobalPromptModal } from './components/EditGlobalPromptModal';

type JobProcessStatus = 'idle' | 'processing' | 'completed' | 'error';

interface JobWithStatus extends Job {
  status: JobProcessStatus;
  resultId?: number;
  error?: string;
}

const SmartTailorPage: React.FC = () => {
  const navigate = useNavigate();

  const jobs = useJobStore((state) => state.jobs);
  const globalPrompt = useJobStore((state) => state.globalPrompt);
  const jobActions = useJobStore((state) => state.actions);

  // State for Source Resume
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();

  // Local state for UI interaction
  const [processingStatus, setProcessingStatus] = useState<Record<string, Partial<JobWithStatus>>>(
    {}
  );
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

  useEffect(() => {
    const loadResumes = async () => {
      const allResumes = await db.resumes.toArray();
      setResumes(allResumes.sort((a, b) => b.createdAt - a.createdAt));
      if (allResumes.length > 0) {
        const mainCV = allResumes.find((r) => r.isMain);
        setSelectedResumeId(mainCV ? mainCV.id : allResumes[0].id);
      }
    };
    loadResumes();
  }, []);

  const handleAddJob = () => {
    jobActions.addJob({
      company: '',
      title: '',
      description: '',
      customPrompt: '',
    });
  };

  const handleRemoveJob = (id: string) => {
    jobActions.deleteJob(id);
  };

  const updateJob = (id: string, field: keyof Job, value: string) => {
    const jobToUpdate = jobs.find((j) => j.id === id);
    if (jobToUpdate) {
      jobActions.updateJob({ ...jobToUpdate, [field]: value });
    }
  };

  const handleExport = () => {
    const stateToExport = {
      jobs: jobs,
      globalPrompt: globalPrompt,
    };
    const jsonString = JSON.stringify(stateToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jobs-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const importedState = JSON.parse(jsonString);

          if (Array.isArray(importedState.jobs) && typeof importedState.globalPrompt === 'string') {
            const jobsToImport: Omit<Job, 'id'>[] = importedState.jobs.map((j: Partial<Job>) => ({
              company: j.company || '',
              title: j.title || '',
              description: j.description || '',
              customPrompt: j.customPrompt || '',
            }));
            jobActions.importJobs(jobsToImport);
            jobActions.setGlobalPrompt(importedState.globalPrompt);
            alert('Jobs imported successfully!');
          } else {
            throw new Error('Invalid file format.');
          }
        } catch (error) {
          console.error('Error importing jobs:', error);
          alert('Failed to import jobs. Please check the file format.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleStartTailoring = async () => {
    const selectedResume = resumes.find((r) => r.id === selectedResumeId);
    if (!selectedResume) {
      alert('Please select a source resume first.');
      return;
    }

    const jobsToProcess = jobs.filter((j) => selectedJobs.has(j.id));
    if (jobsToProcess.length === 0) {
      alert('Please select at least one job to tailor.');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set your API Key in Settings.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProcessingStatus({});

    let sourceData = selectedResume.parsedData;
    if (!sourceData) {
      try {
        sourceData = await parseResumeToJSON(selectedResume.rawText, config);
        if (selectedResume.id) {
          await db.resumes.update(selectedResume.id, { parsedData: sourceData });
        }
      } catch (e) {
        alert('Failed to parse source resume. Please try again.');
        console.error('Resume parsing error:', e);
        setIsProcessing(false);
        return;
      }
    }

    for (let i = 0; i < jobsToProcess.length; i++) {
      const job = jobsToProcess[i];

      setProcessingStatus((prev) => ({ ...prev, [job.id]: { status: 'processing' } }));

      try {
        // Construct the final, complete prompt
        const finalPrompt = `
You are an expert Resume Strategist and Career Coach.
Your task is to REWRITE and TAILOR the following Candidate Resume to specifically target the provided Job Description (JD).
${globalPrompt}
${job.customPrompt ? `\n\n--- Job-Specific Instructions ---\n${job.customPrompt}` : ''}

SOURCE RESUME (JSON):
${JSON.stringify(sourceData, null, 2)}

TARGET JOB DESCRIPTION:
${job.description}

YOUR MISSION:
1. **Analyze**: Identify the key skills, keywords, and qualifications required in the JD.
2. **Reframe Summary**: Rewrite the "basics.summary" to bridge the candidate's past experience with the new role. Highlight relevant transferable skills.
3. **Tailor Experience**:
   - Keep the same companies and dates (do not invent employment history).
   - Rewrite "summary" and "highlights" for each job to emphasize relevance to the new JD.
   - Use keywords from the JD naturally.
   - If a past role is irrelevant, minimize it (fewer bullets), but do not delete it if it leaves a gap.
4. **Select Projects**:
   - Select at least 3-5 of the most relevant projects from the source resume.
   - If fewer than 3 projects exist, keep all of them.
   - Rewrite descriptions to focus on the tech stack mentioned in the JD.
5. **Optimize Skills**: Reorder or group skills to prioritize what the JD asks for.

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly the Resume JSON structure.
`;

        const tailoredData = await tailorResumeV2(config, finalPrompt);

        const newFileName = `[${job.company}] ${job.title} - ${selectedResume.fileName}`;
        const newResume: Resume = {
          createdAt: Date.now(),
          fileName: newFileName,
          rawText: selectedResume.rawText,
          parsedData: tailoredData,
          formatted: true,
          isMain: false,
        };

        const newId = await db.resumes.add(newResume);
        setProcessingStatus((prev) => ({
          ...prev,
          [job.id]: { status: 'completed', resultId: newId },
        }));
      } catch (error) {
        console.error(`Error processing job ${job.company}:`, error);
        setProcessingStatus((prev) => ({
          ...prev,
          [job.id]: { status: 'error', error: 'Failed to generate.' },
        }));
      }

      setProgress(Math.round(((i + 1) / jobsToProcess.length) * 100));
    }

    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <SEO
        title="Smart CV Tailor - Manage & Batch Process"
        description="Manage a list of target jobs and tailor your resume for multiple jobs at once using AI."
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Source Resume
              </CardTitle>
              <CardDescription>Select the base CV to tailor.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <select
                  className="w-full p-2 border rounded-md bg-background"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(Number(e.target.value))}
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.isMain ? '(Main) ' : ''}
                      {r.fileName}
                    </option>
                  ))}
                </select>

                <div className="text-xs text-muted-foreground">
                  <p>
                    Selected:{' '}
                    <strong>{resumes.find((r) => r.id === selectedResumeId)?.fileName}</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <span>Parsed:</span>
                    {resumes.find((r) => r.id === selectedResumeId)?.parsedData ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-none"
                      >
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="destructive">No (Will parse on start)</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle>Batch Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                className="w-full h-12 text-lg"
                onClick={handleStartTailoring}
                disabled={isProcessing || !selectedResumeId || selectedJobs.size === 0}
              >
                {isProcessing ? (
                  <>
                    <Wand2 className="mr-2 h-5 w-5 animate-spin" /> Tailoring...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" /> Start Tailoring{' '}
                    {selectedJobs.size} Selected
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                This will use your configured AI Provider (Gemini/OpenAI) to generate tailored
                content for each job.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Briefcase className="w-6 h-6" /> Job Targets
                </h2>
                <Button variant="outline" size="sm" onClick={handleAddJob}>
                  <Plus className="w-4 h-4 mr-1" /> Add Job
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold">Actions</h3>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setIsPromptModalOpen(true)}>
                    <Settings className="w-4 h-4 mr-1" />
                    Edit Global Prompt
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleImport}>
                    <Upload className="w-4 h-4 mr-1" />
                    Import Jobs
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-1" />
                    Export All Jobs
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Note:</strong> Your Jobs list and Prompts are saved locally in this
                    browser and are not synced to the cloud. Use the Export feature to create
                    backups.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {jobs.map((job) => {
              const jobStatus = processingStatus[job.id] || { status: 'idle' };
              const isJobDone = jobStatus.status === 'completed';
              const isJobProcessing = jobStatus.status === 'processing';

              return (
                <Card
                  key={job.id}
                  className={`relative transition-all ${isJobProcessing ? 'border-primary ring-1 ring-primary/20' : ''}`}
                >
                  <div className="absolute right-4 top-4 flex items-center gap-2">
                    {jobStatus.status === 'completed' && (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                      </Badge>
                    )}
                    {jobStatus.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="w-3 h-3 mr-1" /> Failed
                      </Badge>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveJob(job.id)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <CardContent className="pt-6 grid gap-4">
                    <div className="absolute left-4 top-4">
                      <Checkbox
                        id={`select-${job.id}`}
                        checked={selectedJobs.has(job.id)}
                        onCheckedChange={(checked) => {
                          const newSelectedJobs = new Set(selectedJobs);
                          if (checked) {
                            newSelectedJobs.add(job.id);
                          } else {
                            newSelectedJobs.delete(job.id);
                          }
                          setSelectedJobs(newSelectedJobs);
                        }}
                        aria-label={`Select job ${job.title}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
                      <div className="space-y-2">
                        <Label>Company</Label>
                        <Input
                          placeholder="e.g. Google"
                          value={job.company}
                          onChange={(e) => updateJob(job.id, 'company', e.target.value)}
                          disabled={isJobDone || isProcessing}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title</Label>
                        <Input
                          placeholder="e.g. Senior Software Engineer"
                          value={job.title}
                          onChange={(e) => updateJob(job.id, 'title', e.target.value)}
                          disabled={isJobDone || isProcessing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Job Description</Label>
                      <Textarea
                        placeholder="Paste the full JD here..."
                        className="min-h-[100px] font-mono text-sm"
                        value={job.description}
                        onChange={(e) => updateJob(job.id, 'description', e.target.value)}
                        disabled={isJobDone || isProcessing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custom Prompt (Optional)</Label>
                      <Textarea
                        placeholder="e.g., Emphasize my React and TypeScript experience..."
                        className="min-h-[60px] font-sans text-sm"
                        value={job.customPrompt}
                        onChange={(e) => updateJob(job.id, 'customPrompt', e.target.value)}
                        disabled={isJobDone || isProcessing}
                      />
                    </div>

                    {jobStatus.status === 'completed' && jobStatus.resultId && (
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/resumes/${jobStatus.resultId}/edit`)}
                        >
                          View & Edit Tailored CV
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
      <EditGlobalPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        currentPrompt={globalPrompt}
        onSave={jobActions.setGlobalPrompt}
      />
    </div>
  );
};

export default SmartTailorPage;
