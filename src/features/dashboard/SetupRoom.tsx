import React from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import SEO from '@/components/shared/SEO';
import { useSetupRoom } from './hooks/useSetupRoom';
import { JobDetailsForm } from './components/setup-room/JobDetailsForm';
import { JDInput } from './components/setup-room/JDInput';
import { ResumeSelector } from './components/setup-room/ResumeSelector';
import { SetupModals } from './components/setup-room/SetupModals';

const SetupRoom: React.FC = () => {
  const { state, actions } = useSetupRoom();
  const { formData } = state;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <SEO
        title="Setup Interview - HR With AI"
        description="Configure your AI mock interview session."
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
          <form onSubmit={actions.handleSubmit} className="space-y-4 md:space-y-8">
            <JobDetailsForm
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
            />

            <JDInput
              value={formData.jobDescription}
              isExtracting={state.isExtracting}
              onAutoFill={actions.handleAutoFill}
              onChange={actions.handleChange}
            />

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

            <div className="pt-6">
              <LoadingButton
                type="submit"
                disabled={state.isStarting}
                isLoading={state.isStarting}
                loadingText="Setting up Room..."
                className="w-full h-14 text-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.01]"
              >
                Enter Interview Room <Play className="ml-2 h-5 w-5 fill-current" />
              </LoadingButton>
            </div>
          </form>
        </CardContent>
      </Card>

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
        onGenerateTailoredResume={actions.handleGenerateTailoredResume}
      />
    </div>
  );
};

export default SetupRoom;
