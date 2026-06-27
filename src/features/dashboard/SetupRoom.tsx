import React from 'react';
import {
  Upload, Play, Sparkles, Briefcase, Save, Trash2, ChevronDown, Search, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import SEO from '@/components/shared/SEO';
import ResumeList from './ResumeList';
import ResumeAnalysisView from '@/features/resume-analysis/ResumeAnalysisView';
import JobRecommendationModal from '@/features/interview/JobRecommendationModal';
import { TailorResumeModal } from './TailorResumeModal';
import { isNonEmptyString } from '@/lib/validation';
import { useSetupRoom } from './hooks/useSetupRoom';

const SetupRoom: React.FC = () => {
  const { state, actions } = useSetupRoom();
  const { formData } = state;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <SEO title="Setup Interview - HR With AI" description="Configure your AI mock interview session." />
      <Card className="shadow-xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6 md:pb-8 px-4 md:px-6">
          <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">Setup Interview Room</CardTitle>
          <CardDescription className="text-sm md:text-lg text-muted-foreground mt-2">
            Configure the AI persona and context for your realistic practice session.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <form onSubmit={actions.handleSubmit} className="space-y-4 md:space-y-8">
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
              <div className="flex-1">
                <Label className="mb-2 block">Load Saved Job</Label>
                <div className="relative">
                  <select value={state.selectedJobId} onChange={actions.handleSelectSavedJob}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none">
                    <option value="new">+ New / Custom Job</option>
                    {state.savedJobs.map((job) => (
                      <option key={job.id} value={job.id?.toString()}>{job.jobTitle} @ {job.company}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>
              <div className="flex items-end h-[62px] pb-[2px]">
                <Button type="button" variant="outline" onClick={actions.handleSaveJob} title="Save current details as a reusable job template">
                  <Save className="w-4 h-4 mr-2" /> Save Job
                </Button>
              </div>
              {state.selectedJobId !== 'new' && (
                <div className="flex items-end h-[62px] pb-[2px]">
                  <Button type="button" variant="destructive" size="icon"
                    onClick={(e) => actions.handleDeleteJob(e, parseInt(state.selectedJobId))} title="Delete this saved job">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="company">Target Company</Label>
                <Input id="company" required name="company" value={formData.company} onChange={actions.handleChange}
                  placeholder="e.g. Google, Shopee, Startup..." className="h-11" />
                <div className="mt-2">
                  <LoadingButton type="button" variant="ghost" size="sm" onClick={actions.handleResearchCompany}
                    disabled={state.isResearching || !isNonEmptyString(formData.company)} isLoading={state.isResearching}
                    loadingText="Researching..." className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
                    leftIcon={<Search className="w-3 h-3" />}>
                    Auto-Research Company
                  </LoadingButton>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" required name="jobTitle" value={formData.jobTitle} onChange={actions.handleChange}
                  placeholder="e.g. Product Manager" className="h-11" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="interviewerPersona">Interviewer Persona</Label>
                <Textarea id="interviewerPersona" required name="interviewerPersona" value={formData.interviewerPersona}
                  onChange={actions.handleChange} rows={3} placeholder="Describe the interviewer's style..." className="resize-none" />
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="language">Language</Label>
                <div className="relative">
                  <select id="language" name="language" value={formData.language} onChange={actions.handleChange}
                    className="flex h-11 md:h-[88px] w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="en-US">English (US)</option>
                    <option value="vi-VN">Tiếng Việt</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="type">Interview Type</Label>
                <div className="relative">
                  <select id="type" name="type" value={formData.type} onChange={actions.handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
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
                  <select id="mode" name="mode" value={formData.mode} onChange={actions.handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="text">Text Chat</option>
                    <option value="voice">Voice Interview</option>
                    <option value="hybrid">Hybrid (Text + Voice)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="isPanel" className="flex items-center gap-2 cursor-pointer">
                  <Users className="w-4 h-4 text-primary" /> Panel Interview
                </Label>
                <button type="button" role="switch" aria-checked={formData.isPanel}
                  className={`flex w-full text-left items-center gap-3 p-3 rounded-md border transition-all cursor-pointer ${
                    formData.isPanel ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20' : 'bg-background border-input hover:bg-accent/50'
                  }`}
                  onClick={actions.handleTogglePanel}>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isPanel ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${formData.isPanel ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-medium">{formData.isPanel ? 'Enabled' : 'Disabled'}</span>
                </button>
                <p className="text-[10px] text-muted-foreground italic">AI will simulate multiple interviewers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <div className="relative">
                  <select id="difficulty" name="difficulty" value={formData.difficulty} onChange={actions.handleChange}
                    className="flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="easy">Easy (Friendly)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="hard">Hard (Strict)</option>
                    <option value="hardcore">Hardcore (Pressure)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="companyStatus">Company Status</Label>
                <Input id="companyStatus" name="companyStatus" value={formData.companyStatus} onChange={actions.handleChange}
                  placeholder="e.g. Hiring urgently" className="h-11" />
              </div>
              <div className="space-y-2 md:space-y-3">
                <Label htmlFor="interviewContext">Interview Context</Label>
                <Input id="interviewContext" name="interviewContext" value={formData.interviewContext} onChange={actions.handleChange}
                  placeholder="e.g. Modern Video Call" className="h-11" />
              </div>
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="jobDescription">Job Description</Label>
                <LoadingButton type="button" variant="outline" size="sm" onClick={actions.handleAutoFill}
                  disabled={state.isExtracting || !isNonEmptyString(formData.jobDescription)} isLoading={state.isExtracting}
                  loadingText="Auto-fill from JD"
                  className="text-primary border-primary/20 hover:bg-primary/10 dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10"
                  leftIcon={<Sparkles className="w-4 h-4" />}>
                  Auto-fill from JD
                </LoadingButton>
              </div>
              <Textarea id="jobDescription" name="jobDescription" value={formData.jobDescription} onChange={actions.handleChange}
                rows={5} placeholder="Paste the JD here..." className="font-mono text-sm" />
            </div>

            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="resumeText">Resume / CV Content</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => actions.setIsJobModalOpen(true)}
                    className="text-yellow-500 border-primary/20 hover:bg-primary/10 hover:border-primary/50 dark:text-primary dark:border-yellow-500/30 dark:hover:bg-primary/10">
                    <Briefcase className="mr-2 h-4 w-4" /> Find Job with CV
                  </Button>
                  <LoadingButton variant="outline" size="sm" isLoading={state.isParsing} loadingText="Reading PDF..."
                    disabled={state.isParsing}
                    className="relative">
                    <Upload className="mr-2 h-4 w-4" /> Upload PDF/TXT
                    <input type="file" accept=".pdf,.txt" className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={actions.handleFileUpload} disabled={state.isParsing} />
                  </LoadingButton>
                </div>
              </div>

              <ResumeList
                resumes={state.savedResumes} selectedResumeId={state.selectedResumeId}
                onSelect={actions.handleResumeSelect} onDelete={actions.handleDeleteResume}
                onTailor={actions.handleTailorClick} onToggleMain={actions.handleToggleMain}
                onRefresh={actions.loadData}
              />

              <Textarea id="resumeText" name="resumeText" value={formData.resumeText} onChange={actions.handleChange}
                rows={5} placeholder="Paste your resume text here..." className="font-mono text-sm" />

              {formData.resumeText && formData.jobDescription && (
                <div className="pt-2">
                  <LoadingButton type="button" variant="secondary" onClick={actions.handleAnalyzeResume}
                    disabled={state.isAnalyzing} isLoading={state.isAnalyzing} loadingText="Analyzing Fit..." className="w-full"
                    leftIcon={<Sparkles className="w-4 h-4 text-primary" />}>
                    Analyze Resume Fit (AI)
                  </LoadingButton>
                </div>
              )}

              {state.resumeAnalysis && <ResumeAnalysisView analysis={state.resumeAnalysis} />}
            </div>

            <div className="pt-6">
              <LoadingButton type="submit" disabled={state.isStarting} isLoading={state.isStarting}
                loadingText="Setting up Room..."
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]">
                Enter Interview Room <Play className="ml-2 h-5 w-5 fill-current" />
              </LoadingButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <JobRecommendationModal isOpen={state.isJobModalOpen} onClose={() => actions.setIsJobModalOpen(false)}
        onSelectJob={actions.handleSelectJob} existingResumeId={state.selectedResumeId}
        availableResumes={state.savedResumes} />

      <Dialog open={state.showMainCVCloneDialog} onOpenChange={actions.setShowMainCVCloneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Main CV?</DialogTitle>
            <DialogDescription>
              You selected your Main CV. Would you like to create a tailored copy for this interview or use the original?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => actions.handleConfirmClone(false)} disabled={state.isCloning}>
              Use Original
            </Button>
            <LoadingButton onClick={() => actions.handleConfirmClone(true)} isLoading={state.isCloning} loadingText="Cloning...">
              Make a Copy & Use
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TailorResumeModal isOpen={state.isTailorModalOpen} onClose={() => actions.setIsTailorModalOpen(false)}
        sourceResume={state.resumeToTailor} onGenerate={actions.handleGenerateTailoredResume} />

    </div>
  );
};

export default SetupRoom;
