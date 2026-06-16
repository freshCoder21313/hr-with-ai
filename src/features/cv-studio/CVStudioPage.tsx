import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/shared/SEO';
import ResumePreview from '@/features/resume-builder/ResumePreview';
import SectionReorderDialog from '@/features/resume-builder/components/SectionReorderDialog';
import { EditGlobalPromptModal } from './components/EditGlobalPromptModal';
import { GitHubImportModal } from '@/features/resume-builder/github-import/GitHubImportModal';
import { CVJobPanel } from './components/CVJobPanel';
import { CVChatPanel } from './components/CVChatPanel';
import { CVPreviewPanel } from './components/CVPreviewPanel';
import { useCVStudio } from './hooks/useCVStudio';
import { Loader2 } from 'lucide-react';

const CVStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, ui, actions } = useCVStudio();

  const handleViewResult = useCallback((id: number) => {
    navigate(`/resumes/${id}/edit`);
  }, [navigate]);

  if (state.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="hidden print:block" style={{ width: '210mm', margin: '0', padding: '0' }}>
        {state.previewData && (
          <ResumePreview data={state.previewData} template={ui.template} onUpdate={actions.handleManualUpdate} />
        )}
      </div>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background print:hidden">
        <SEO title="CV Studio \u2014 HR With AI" description="Unified CV editing, tailoring, and AI chat." />

        <CVJobPanel
          jobs={state.jobs}
          selectedResumeId={state.selectedResumeId}
          selectedJobs={state.selectedJobs}
          isJobPanelOpen={ui.isJobPanelOpen}
          isProcessing={state.isProcessing}
          progress={state.progress}
          resumes={state.resumes}
          processingStatus={state.processingStatus}
          onAddJob={actions.handleAddJob}
          onRemoveJob={actions.handleRemoveJob}
          onUpdateJob={actions.updateJob}
          onExportJobs={actions.handleExportJobs}
          onImportJobs={actions.handleImportJobs}
          onStartTailoring={actions.handleStartTailoring}
          onSelectResume={actions.setSelectedResumeId}
          onToggleJobSelection={actions.handleToggleJobSelection}
          onTogglePanel={() => ui.setIsJobPanelOpen(!ui.isJobPanelOpen)}
          onOpenPromptModal={() => ui.setIsPromptModalOpen(true)}
          onViewResult={handleViewResult}
        />

        <CVChatPanel
          messages={state.messages}
          isTyping={state.isTyping}
          mainCV={state.mainCV}
          chatResumeId={state.chatResumeId}
          pendingChanges={state.pendingChanges}
          resumes={state.resumes}
          contextResumeId={state.contextResumeId}
          contextJobId={state.contextJobId}
          jobs={state.jobs}
          onSendMessage={actions.handleSendMessage}
          onAcceptChange={actions.handleAcceptChange}
          onRejectChange={actions.handleRejectChange}
          onChatCVChange={actions.handleChatCVChange}
          onDeleteCV={actions.handleDeleteCurrentCV}
          onCreateNewCV={actions.handleCreateNewCV}
          onSetContextResumeId={actions.setContextResumeId}
          onSetContextJobId={actions.setContextJobId}
          onGitHubImportOpen={() => ui.setIsGitHubModalOpen(true)}
        />

        <CVPreviewPanel
          previewData={state.previewData}
          template={ui.template}
          previewViewMode={ui.previewViewMode}
          activeTab={ui.activeTab}
          mainCV={state.mainCV}
          onSetPreviewViewMode={ui.setPreviewViewMode}
          onSetTemplate={ui.setTemplate}
          onSetActiveTab={ui.setActiveTab}
          onManualUpdate={actions.handleManualUpdate}
          onOpenReorderDialog={() => ui.setShowReorderDialog(true)}
          onPrint={() => window.print()}
        />

        <SectionReorderDialog
          isOpen={ui.showReorderDialog}
          onClose={() => ui.setShowReorderDialog(false)}
          data={
            state.previewData
              ? { ...state.previewData, meta: { ...state.previewData.meta, template: ui.template } }
              : { basics: { name: '', email: '', summary: '' }, work: [], education: [], skills: [], projects: [] }
          }
          onSave={(newOrder) => {
            if (!state.mainCV?.parsedData || !state.mainCV.id) return;
            actions.handleManualUpdate({
              ...state.mainCV.parsedData,
              meta: { ...state.mainCV.parsedData.meta, sectionOrder: newOrder, template: ui.template },
            });
          }}
        />

        <EditGlobalPromptModal
          isOpen={ui.isPromptModalOpen}
          onClose={() => ui.setIsPromptModalOpen(false)}
          currentPrompt={state.globalPrompt}
          onSave={actions.setGlobalPrompt}
        />

        <GitHubImportModal
          isOpen={ui.isGitHubModalOpen}
          onClose={() => ui.setIsGitHubModalOpen(false)}
          onImportComplete={actions.handleGitHubImportComplete}
        />
      </div>
    </>
  );
};

export default CVStudioPage;
