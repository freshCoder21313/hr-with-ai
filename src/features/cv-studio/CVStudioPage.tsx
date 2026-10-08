import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/shared/SEO';
import { ResumePreview, SectionReorderDialog, GitHubImportModal } from '@/features/resume-builder';
import { EditGlobalPromptModal } from './components/EditGlobalPromptModal';
import { CVJobPanel } from './components/CVJobPanel';
import { CVChatPanel } from './components/CVChatPanel';
import { CVPreviewPanel } from './components/CVPreviewPanel';
import { CareerKnowledgeDrawer } from './components/CareerKnowledgeDrawer';
import { useCVStudio } from './hooks/useCVStudio';
import { Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { exportElementToPdf } from '@/services/resume/pdfExportService';
import { logger } from '@/lib/logger';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';

const CVStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, ui, actions } = useCVStudio();
  const [mobileTab, setMobileTab] = useState<'jobs' | 'chat' | 'preview'>('chat');
  const [isCareerKnowledgeOpen, setIsCareerKnowledgeOpen] = useState(false);
  const [candidateFactCount, setCandidateFactCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const refreshCandidateCount = useCallback(async () => {
    try {
      const pid = await careerKnowledgeAppService.getActiveProfileId();
      const facts = await careerKnowledgeAppService.listFacts(pid);
      const candidates = facts.filter((f) => f.verificationState === 'needs_confirmation');
      setCandidateFactCount(candidates.length);
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchCandidateCount = async () => {
      try {
        const pid = await careerKnowledgeAppService.getActiveProfileId();
        const facts = await careerKnowledgeAppService.listFacts(pid);
        const candidates = facts.filter((f) => f.verificationState === 'needs_confirmation');
        if (mounted) {
          setCandidateFactCount(candidates.length);
        }
      } catch {
        // Ignore background fetch error
      }
    };
    fetchCandidateCount();
    return () => {
      mounted = false;
    };
  }, []);

  const handleViewResult = useCallback(
    (id: number) => {
      navigate(`/resumes/${id}/edit`);
    },
    [navigate]
  );

  if (state.isLoading) {
    return (
      <div
        data-app-fill
        className="flex flex-1 min-h-0 items-center justify-center gap-3 text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading CV Studio…</span>
      </div>
    );
  }

  return (
    <>
      <div className="hidden print:block" style={{ width: '210mm', margin: '0', padding: '0' }}>
        {state.previewData && (
          <ResumePreview
            data={state.previewData}
            template={ui.template}
            onUpdate={actions.handleManualUpdate}
          />
        )}
      </div>

      <div
        data-app-fill
        className="flex flex-col flex-1 min-h-0 overflow-hidden bg-background print:hidden"
      >
        <SEO
          title="CV Studio \u2014 HR With AI"
          description="Unified CV editing, tailoring, and AI chat."
        />

        <div className="flex md:hidden border-b border-border shrink-0 items-stretch bg-card">
          <div className="flex flex-1">
            {(['jobs', 'chat', 'preview'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMobileTab(tab)}
                aria-pressed={mobileTab === tab}
                className={cn(
                  'flex-1 py-2.5 text-sm font-medium capitalize transition-colors',
                  mobileTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCareerKnowledgeOpen(true)}
            className="h-auto rounded-none px-3 border-l border-border flex items-center gap-1.5 text-xs font-semibold hover:bg-muted text-primary shrink-0"
            aria-label="Open Career Knowledge"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Knowledge</span>
            {candidateFactCount > 0 && (
              <Badge
                variant="default"
                className="px-1.5 py-0 text-[10px] h-4 bg-warning text-warning-foreground rounded-full font-bold"
              >
                {candidateFactCount}
              </Badge>
            )}
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div
            className={cn(mobileTab === 'jobs' ? 'flex flex-1 min-w-0' : 'hidden', 'md:contents')}
          >
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
              onRenameResume={actions.handleRenameCV}
              onSetMainResume={actions.handleSetMainResume}
              onToggleJobSelection={actions.handleToggleJobSelection}
              onTogglePanel={() => ui.setIsJobPanelOpen(!ui.isJobPanelOpen)}
              onOpenPromptModal={() => ui.setIsPromptModalOpen(true)}
              onViewResult={handleViewResult}
              onReTailorJob={actions.handleReTailorJob}
            />
          </div>
          <div
            className={cn(mobileTab === 'chat' ? 'flex flex-1 min-w-0' : 'hidden', 'md:contents')}
          >
            <CVChatPanel
              messages={state.messages}
              isTyping={state.isTyping}
              canRetry={state.canRetry}
              mainCV={state.mainCV}
              chatResumeId={state.chatResumeId}
              pendingChanges={state.pendingChanges}
              pendingChangeId={state.pendingChangeId}
              activeQuestionGroup={state.activeQuestionGroup}
              activeQuestion={state.activeQuestion}
              resumes={state.resumes}
              contextResumeId={state.contextResumeId}
              contextJobId={state.contextJobId}
              jobs={state.jobs}
              candidateFactCount={candidateFactCount}
              onOpenCareerKnowledge={() => setIsCareerKnowledgeOpen(true)}
              onSendMessage={actions.handleSendMessage}
              onRetryLastResponse={actions.handleRetryLastResponse}
              onAnswerQuestionGroup={actions.handleAnswerQuestionGroup}
              onAnswerQuestion={actions.handleAnswerQuestion}
              onSkipQuestion={actions.handleSkipQuestion}
              onAcceptChange={actions.handleAcceptChange}
              onRejectChange={actions.handleRejectChange}
              onChatCVChange={actions.handleChatCVChange}
              onRenameCV={actions.handleRenameCV}
              onDeleteCV={actions.handleDeleteCurrentCV}
              onCreateNewCV={actions.handleCreateNewCV}
              onSetContextResumeId={actions.setContextResumeId}
              onSetContextJobId={actions.setContextJobId}
              onGitHubImportOpen={() => ui.setIsGitHubModalOpen(true)}
            />
          </div>
          <div
            className={cn(
              mobileTab === 'preview' ? 'flex flex-1 min-w-0' : 'hidden',
              'md:contents'
            )}
          >
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
              onOpenFullEditor={() => {
                const targetId = state.mainCV?.id ?? state.selectedResumeId;
                if (targetId) handleViewResult(targetId);
              }}
              isExporting={isExporting}
              onPrint={async () => {
                if (!exportRef.current || isExporting) return;
                setIsExporting(true);
                try {
                  const result = await exportElementToPdf(
                    exportRef.current,
                    state.mainCV?.fileName ?? 'CV'
                  );
                  toast.success(
                    result.method === 'download' ? 'PDF downloaded.' : 'PDF ready to share.'
                  );
                } catch (error) {
                  logger.error('PDF export failed:', error);
                  toast.error('Could not export PDF. Please try again.');
                } finally {
                  setIsExporting(false);
                }
              }}
            />
          </div>
        </div>

        {/* Off-screen laid-out capture host for PDF export. */}
        {state.previewData && (
          <div
            ref={exportRef}
            aria-hidden="true"
            className="pointer-events-none fixed -left-[10000px] top-0 w-[794px] bg-white"
          >
            <ResumePreview
              data={state.previewData}
              template={ui.template}
              onUpdate={actions.handleManualUpdate}
            />
          </div>
        )}

        <SectionReorderDialog
          isOpen={ui.showReorderDialog}
          onClose={() => ui.setShowReorderDialog(false)}
          data={
            state.previewData
              ? { ...state.previewData, meta: { ...state.previewData.meta, template: ui.template } }
              : {
                  basics: { name: '', email: '', summary: '' },
                  work: [],
                  education: [],
                  skills: [],
                  projects: [],
                }
          }
          onSave={(newOrder) => {
            if (!state.mainCV?.parsedData || !state.mainCV.id) return;
            actions.handleManualUpdate({
              ...state.mainCV.parsedData,
              meta: {
                ...state.mainCV.parsedData.meta,
                sectionOrder: newOrder,
                template: ui.template,
              },
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

        <CareerKnowledgeDrawer
          isOpen={isCareerKnowledgeOpen}
          onClose={() => setIsCareerKnowledgeOpen(false)}
          onFactUpdated={refreshCandidateCount}
        />
      </div>
    </>
  );
};

export default CVStudioPage;
