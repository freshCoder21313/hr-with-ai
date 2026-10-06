import React, { useState } from 'react';
import { Play, ArrowLeft, ArrowRight, Check, Briefcase, FileText, Bot, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/shared/SEO';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isNonEmptyString } from '@/lib/validation';
import { useSetupRoom } from './hooks/useSetupRoom';
import { JobDetailsForm } from './components/setup-room/JobDetailsForm';
import { JDInput } from './components/setup-room/JDInput';
import { ResumeSelector } from './components/setup-room/ResumeSelector';
import { SetupModals } from './components/setup-room/SetupModals';
import { InterviewPresets, PresetItem } from './components/setup-room/InterviewPresets';

type SetupStep = 'role' | 'resume' | 'persona';

const STEPS = [
  { id: 'role' as const, label: 'Job & Role', icon: Briefcase, stepNumber: 1 },
  { id: 'resume' as const, label: 'Resume & Match', icon: FileText, stepNumber: 2 },
  { id: 'persona' as const, label: 'AI Persona & Format', icon: Bot, stepNumber: 3 },
];

const SetupRoom: React.FC = () => {
  const { state, actions } = useSetupRoom();
  const { formData } = state;
  const [currentStep, setCurrentStep] = useState<SetupStep>('role');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const handleSelectPreset = (preset: PresetItem, autoAdvance = true) => {
    setActivePresetId(preset.id);
    actions.applyPreset({
      company: preset.company,
      companyName: preset.company,
      jobTitle: preset.role,
      difficulty: preset.difficulty,
      type: preset.type,
      mode: preset.mode,
      interviewerPersona: preset.persona,
      jobDescription: preset.jobDescription,
    });
    if (autoAdvance) {
      toast.success(`Preset "${preset.title}" applied! Proceed to select your resume.`);
      setCurrentStep('resume');
    } else {
      toast.success(`Preset "${preset.title}" applied! You can customize details below.`);
    }
  };

  const handleNextFromRole = () => {
    if (!isNonEmptyString(formData.company) || !isNonEmptyString(formData.jobTitle)) {
      toast.error('Please enter both Target Company and Job Title before proceeding.');
      return;
    }
    setCurrentStep('resume');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="max-w-6xl w-full mx-auto p-4 md:p-8 pb-24 md:pb-12 flex flex-col items-center">
      <SEO
        title="Setup Interview - HR With AI"
        description="Configure your AI mock interview session."
      />

      <Card className="max-w-4xl w-full shadow-xl bg-card/95 backdrop-blur-sm border-border">
        <CardHeader className="text-center pb-4 md:pb-6 px-4 md:px-6">
          <CardTitle className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
            Setup Interview Room
          </CardTitle>
          <CardDescription className="text-sm md:text-base text-muted-foreground mt-1">
            Configure the AI persona, target role, and context for your realistic practice session.
          </CardDescription>

          {/* 3-Step Wizard Navigation Indicator */}
          <div className="pt-6 max-w-xl mx-auto w-full">
            <div className="flex items-center justify-between relative">
              {STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = idx < currentStepIndex;
                const isActive = step.id === currentStep;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      // Allow jumping backward anytime, or jumping forward if basic required fields exist
                      if (idx <= currentStepIndex || (isNonEmptyString(formData.company) && isNonEmptyString(formData.jobTitle))) {
                        setCurrentStep(step.id);
                      }
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 z-10 transition-colors group cursor-pointer focus-visible:outline-none'
                    )}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm',
                        isActive
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105'
                          : isCompleted
                            ? 'bg-success text-success-foreground'
                            : 'bg-muted text-muted-foreground border border-border group-hover:bg-muted/80'
                      )}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-semibold tracking-tight transition-colors',
                        isActive
                          ? 'text-primary'
                          : isCompleted
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}

              {/* Connecting progress lines */}
              <div
                className="absolute top-4 left-6 right-6 h-0.5 bg-muted -z-0"
                aria-hidden="true"
              >
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: currentStepIndex === 0 ? '0%' : currentStepIndex === 1 ? '50%' : '100%',
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 md:px-6 pt-4">
          <form onSubmit={actions.handleSubmit} className="space-y-6">
            {/* STEP 1: JOB & ROLE CONTEXT */}
            {currentStep === 'role' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Quick Presets Ribbon */}
                <div className="p-4 rounded-xl bg-muted/20 border border-border">
                  <InterviewPresets
                    onSelectPreset={handleSelectPreset}
                    activePresetId={activePresetId}
                  />
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-semibold">
                    <span className="bg-card px-3 text-muted-foreground">
                      Or Configure Target Details
                    </span>
                  </div>
                </div>

                {/* Target Company & Job Details */}
                <JobDetailsForm
                  section="role"
                  formData={formData}
                  selectedJobId={state.selectedJobId}
                  savedJobs={state.savedJobs}
                  isResearching={state.isResearching}
                  onSelectSavedJob={actions.handleSelectSavedJob}
                  onSaveJob={actions.handleSaveJob}
                  onDeleteJob={actions.handleDeleteJob}
                  onResearchCompany={actions.handleResearchCompany}
                  onTogglePanel={actions.handleTogglePanel}
                  onChange={actions.handleChange}
                  onAutoFillFromRawJD={actions.handleAutoFillFromRawJD}
                />

                {/* Job Description Textarea */}
                <JDInput
                  value={formData.jobDescription}
                  isExtracting={state.isExtracting}
                  onAutoFill={actions.handleAutoFill}
                  onChange={actions.handleChange}
                />

                {/* Step 1 Actions */}
                <div className="flex justify-end pt-4 border-t border-border">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleNextFromRole}
                    className="gap-2 font-medium"
                  >
                    Next: Candidate Resume <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: RESUME & MATCH ANALYSIS */}
            {currentStep === 'resume' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <span>
                      Target Role: <strong>{formData.jobTitle || 'Custom Role'}</strong> at{' '}
                      <strong>{formData.company || 'Target Company'}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setCurrentStep('role')}
                    className="text-primary hover:bg-primary/10"
                  >
                    Edit Role
                  </Button>
                </div>

                {/* Resume Selector & Tailor Controls */}
                <ResumeSelector
                  savedResumes={state.savedResumes}
                  selectedResumeId={state.selectedResumeId}
                  resumeText={formData.resumeText}
                  jobDescription={formData.jobDescription}
                  isParsing={state.isParsing}
                  isAnalyzing={state.isAnalyzing}
                  resumeAnalysis={state.resumeAnalysis}
                  onFileUpload={actions.handleFileUpload}
                  onResumeSelect={actions.handleResumeSelect}
                  onDeleteResume={actions.handleDeleteResume}
                  onTailorClick={actions.handleTailorClick}
                  onToggleMain={actions.handleToggleMain}
                  onRefresh={actions.loadData}
                  onChange={actions.handleChange}
                  onAnalyzeResume={actions.handleAnalyzeResume}
                  onFindJobClick={() => actions.setIsJobModalOpen(true)}
                />

                {/* Step 2 Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('role')}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Role
                  </Button>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setCurrentStep('persona')}
                    className="gap-2 font-medium"
                  >
                    Next: AI Persona & Format <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: AI PERSONA & FORMAT & LAUNCH */}
            {currentStep === 'persona' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Persona & Interview Configuration Form */}
                <JobDetailsForm
                  section="persona"
                  formData={formData}
                  selectedJobId={state.selectedJobId}
                  savedJobs={state.savedJobs}
                  isResearching={state.isResearching}
                  onSelectSavedJob={actions.handleSelectSavedJob}
                  onSaveJob={actions.handleSaveJob}
                  onDeleteJob={actions.handleDeleteJob}
                  onResearchCompany={actions.handleResearchCompany}
                  onTogglePanel={actions.handleTogglePanel}
                  onChange={actions.handleChange}
                  onAutoFillFromRawJD={actions.handleAutoFillFromRawJD}
                />

                {/* Summary Review Card */}
                <div className="p-4 rounded-xl bg-card border border-border space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Session Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Target:</span>
                      <span className="font-semibold text-foreground truncate block">
                        {formData.jobTitle} @ {formData.company}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Difficulty:</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold mt-0.5">
                        {formData.difficulty}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Type:</span>
                      <span className="font-semibold text-foreground capitalize block">
                        {formData.type || 'Standard'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Mode:</span>
                      <span className="font-semibold text-foreground capitalize block">
                        {formData.mode || 'Hybrid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 3 Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('resume')}
                    className="gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Resume
                  </Button>

                  <LoadingButton
                    type="submit"
                    disabled={state.isStarting}
                    isLoading={state.isStarting}
                    loadingText="Setting up Room..."
                    className="h-12 px-6 text-base bg-primary hover:bg-primary/90 shadow-md font-medium"
                  >
                    Enter Interview Room <Play className="ml-2 h-4 w-4 fill-current" />
                  </LoadingButton>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Supporting Modals */}
      <SetupModals
        isJobModalOpen={state.isJobModalOpen}
        onJobModalClose={() => actions.setIsJobModalOpen(false)}
        onSelectJob={actions.handleSelectJob}
        selectedResumeId={state.selectedResumeId}
        savedResumes={state.savedResumes}
        showMainCVCloneDialog={state.showMainCVCloneDialog}
        onMainCVCloneDialogChange={actions.setShowMainCVCloneDialog}
        isCloning={state.isCloning}
        onConfirmClone={actions.handleConfirmClone}
        isTailorModalOpen={state.isTailorModalOpen}
        onTailorModalClose={() => actions.setIsTailorModalOpen(false)}
        resumeToTailor={state.resumeToTailor}
        initialJobDescription={formData.jobDescription}
        onGenerateTailoredResume={actions.handleGenerateTailoredResume}
      />
    </div>
  );
};

export default SetupRoom;
