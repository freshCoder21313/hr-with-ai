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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Resume } from '@/types';
import { ResumeData } from '@/types/resume';
import { db } from '@/lib/db';
import { getStoredAIConfig, tailorResumeToJob, parseResumeToJSON } from '@/services/geminiService';
import SEO from '@/components/SEO';

interface JobTarget {
  id: string;
  company: string;
  title: string;
  description: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  resultId?: number; // ID of the created resume
  error?: string;
}

const SmartTailorPage: React.FC = () => {
  const navigate = useNavigate();

  // State for Source Resume
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<number | undefined>();

  // State for Job Targets
  const [jobTargets, setJobTargets] = useState<JobTarget[]>([
    { id: '1', company: '', title: '', description: '', status: 'idle' },
  ]);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadResumes = async () => {
      const allResumes = await db.resumes.toArray();
      if (!isMounted) return;
      setResumes(allResumes.sort((a, b) => b.createdAt - a.createdAt));
      if (allResumes.length > 0) {
        // Auto-select the first one or the Main CV
        const mainCV = allResumes.find((r) => r.isMain);
        setSelectedResumeId(mainCV ? mainCV.id : allResumes[0].id);
      }
    };
    loadResumes();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddJob = () => {
    setJobTargets((prev) => [
      ...prev,
      { id: Date.now().toString(), company: '', title: '', description: '', status: 'idle' },
    ]);
  };

  const handleRemoveJob = (id: string) => {
    if (jobTargets.length === 1) {
      // Clear instead of remove if it's the last one
      setJobTargets([{ id: '1', company: '', title: '', description: '', status: 'idle' }]);
      return;
    }
    setJobTargets((prev) => prev.filter((job) => job.id !== id));
  };

  const updateJob = (id: string, field: keyof JobTarget, value: string) => {
    setJobTargets((prev) => prev.map((job) => (job.id === id ? { ...job, [field]: value } : job)));
  };

  const handleStartTailoring = async () => {
    const selectedResume = resumes.find((r) => r.id === selectedResumeId);
    if (!selectedResume) {
      alert('Please select a source resume first.');
      return;
    }

    // Validate inputs
    const validJobs = jobTargets.filter((j) => j.company && j.title && j.description);
    if (validJobs.length === 0) {
      alert('Please fill in at least one job target (Company, Title, JD).');
      return;
    }

    const config = getStoredAIConfig();
    if (!config.apiKey) {
      alert('Please set your API Key in Settings.');
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    // Prepare Source Data (Parse if needed)
    let sourceData = selectedResume.parsedData;
    if (!sourceData) {
      try {
        // Need to parse on the fly if not already parsed
        sourceData = await parseResumeToJSON(selectedResume.rawText, config);
        // Save back to DB to avoid re-parsing on subsequent jobs
        if (selectedResume.id) {
          await db.resumes.update(selectedResume.id, { parsedData: sourceData });
          setResumes((prev) =>
            prev.map((r) => (r.id === selectedResume.id ? { ...r, parsedData: sourceData } : r))
          );
        }
      } catch (e) {
        alert('Failed to parse source resume. Please try again.');
        setIsProcessing(false);
        return;
      }
    }

    // Process jobs sequentially to avoid rate limits
    for (let i = 0; i < jobTargets.length; i++) {
      const job = jobTargets[i];
      if (!job.company || !job.title || !job.description) continue;
      if (job.status === 'completed') continue; // Skip already done

      // Update status to processing
      setJobTargets((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: 'processing' } : j))
      );

      try {
        const tailoredData = await tailorResumeToJob(sourceData!, job.description, config);

        // Save to DB
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

        // Update status to completed
        setJobTargets((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: 'completed', resultId: newId } : j))
        );
      } catch (error) {
        console.error(`Error processing job ${job.company}:`, error);
        setJobTargets((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: 'error', error: 'Failed to generate.' } : j
          )
        );
      }

      // Update Progress
      setProgress(Math.round(((i + 1) / jobTargets.length) * 100));
    }

    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <SEO
        title="Smart CV Tailor - Batch Process"
        description="Tailor your resume for multiple jobs at once using AI."
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Column: Source Resume & Controls */}
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
                      {r.isMain ? '⭐ ' : ''}
                      {r.fileName}
                    </option>
                  ))}
                </select>

                <div className="text-xs text-muted-foreground">
                  <p>
                    Selected:{' '}
                    <strong>{resumes.find((r) => r.id === selectedResumeId)?.fileName}</strong>
                  </p>
                  <p>
                    Parsed:{' '}
                    {resumes.find((r) => r.id === selectedResumeId)?.parsedData
                      ? 'Yes ✅'
                      : 'No (Will parse on start) ⚠️'}
                  </p>
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
                disabled={isProcessing || !selectedResumeId}
              >
                {isProcessing ? (
                  <>
                    <Wand2 className="mr-2 h-5 w-5 animate-spin" /> Tailoring...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" /> Start Tailoring All
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

        {/* Right Column: Job Targets */}
        <div className="w-full md:w-2/3 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="w-6 h-6" /> Job Targets
            </h2>
            <Button variant="outline" size="sm" onClick={handleAddJob}>
              <Plus className="w-4 h-4 mr-1" /> Add Job
            </Button>
          </div>

          <div className="space-y-4">
            {jobTargets.map((job, index) => (
              <Card
                key={job.id}
                className={`relative transition-all ${job.status === 'processing' ? 'border-primary ring-1 ring-primary/20' : ''}`}
              >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  {job.status === 'completed' && (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                    </Badge>
                  )}
                  {job.status === 'error' && (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        placeholder="e.g. Google"
                        value={job.company}
                        onChange={(e) => updateJob(job.id, 'company', e.target.value)}
                        disabled={job.status === 'completed' || isProcessing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title</Label>
                      <Input
                        placeholder="e.g. Senior Software Engineer"
                        value={job.title}
                        onChange={(e) => updateJob(job.id, 'title', e.target.value)}
                        disabled={job.status === 'completed' || isProcessing}
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
                      disabled={job.status === 'completed' || isProcessing}
                    />
                  </div>

                  {job.status === 'completed' && job.resultId && (
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/resumes/${job.resultId}/edit`)}
                      >
                        View & Edit Tailored CV
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartTailorPage;
