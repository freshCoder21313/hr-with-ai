import React, { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  BookOpen,
  CheckSquare,
  Layers,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { CareerOverviewTab } from '@/features/career-knowledge/tabs/CareerOverviewTab';
import { CandidateReviewTab } from '@/features/career-knowledge/tabs/CandidateReviewTab';
import { CareerFactsTab } from '@/features/career-knowledge/tabs/CareerFactsTab';
import { CareerEvidenceTab } from '@/features/career-knowledge/tabs/CareerEvidenceTab';
import { CareerQuestionsTab } from '@/features/career-knowledge/tabs/CareerQuestionsTab';
import { FactDetailModal } from '@/features/career-knowledge/components/FactDetailModal';
import { ResumeImportModal } from '@/features/career-knowledge/components/ResumeImportModal';
import { GitHubEvidenceScanModal } from '@/features/career-knowledge/components/GitHubEvidenceScanModal';
import { ProjectToResumeModal } from '@/features/career-knowledge/components/ProjectToResumeModal';
import type { CareerFact, CareerEvidence, CareerProfile } from '@/types/careerKnowledge';
import { toast } from 'sonner';

export interface CareerKnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFactUpdated?: () => void;
  initialTab?: string;
}

export const CareerKnowledgeDrawer: React.FC<CareerKnowledgeDrawerProps> = ({
  isOpen,
  onClose,
  onFactUpdated,
  initialTab = 'overview',
}) => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<CareerProfile[]>([]);
  const [facts, setFacts] = useState<CareerFact[]>([]);
  const [evidence, setEvidence] = useState<CareerEvidence[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(initialTab);

  // Modals
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [isResumeImportOpen, setIsResumeImportOpen] = useState(false);
  const [isGitHubScanOpen, setIsGitHubScanOpen] = useState(false);
  const [isProjectToResumeOpen, setIsProjectToResumeOpen] = useState(false);

  const loadData = useCallback(async (targetProfileId?: string) => {
    try {
      const pid = targetProfileId || (await careerKnowledgeAppService.getActiveProfileId());
      setActiveProfileId(pid);

      const [profList, factList, evList] = await Promise.all([
        careerKnowledgeAppService.listProfiles(),
        careerKnowledgeAppService.listFacts(pid),
        careerKnowledgeAppService.listEvidence(pid),
      ]);

      setProfiles(profList);
      setFacts(factList);
      setEvidence(evList);
    } catch (err) {
      toast.error(
        'Failed to load Career Knowledge: ' + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleSelectProfile = (id: string) => {
    careerKnowledgeAppService.setActiveProfileId(id);
    setActiveProfileId(id);
    loadData(id);
    onFactUpdated?.();
  };

  const handleCreateProfile = async () => {
    try {
      const created = await careerKnowledgeAppService.createProfile();
      toast.success('New career profile created');
      loadData(created.id);
      onFactUpdated?.();
    } catch (err) {
      toast.error(
        'Could not create profile: ' + (err instanceof Error ? err.message : String(err))
      );
    }
  };

  const handleDataRefresh = () => {
    loadData(activeProfileId || undefined);
    onFactUpdated?.();
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;
  const candidates = facts.filter((f) => f.verificationState === 'needs_confirmation');
  const confirmedCount = facts.filter((f) => f.verificationState === 'confirmed').length;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full gap-0 overflow-hidden"
          aria-label="Career Knowledge Drawer"
        >
          {/* Header */}
          <SheetHeader className="px-4 sm:px-6 py-4 border-b border-border bg-background shrink-0">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-bold text-foreground">
                    Career Knowledge
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Canonical career facts, provenance evidence, candidate reviews & sync.
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Drawer Body */}
          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-1 flex-col items-center justify-center min-h-[40dvh] gap-3"
            >
              <Loader2 className="w-7 h-7 animate-spin text-primary" aria-hidden="true" />
              <span className="text-xs text-muted-foreground font-medium">
                Loading Career Knowledge...
              </span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList
                  aria-label="Career Knowledge tabs"
                  className="grid grid-cols-3 sm:grid-cols-5 h-auto p-1 bg-muted/60"
                >
                  <TabsTrigger value="overview" className="text-xs py-1.5 gap-1">
                    <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Overview</span>
                  </TabsTrigger>

                  <TabsTrigger value="confirmations" className="text-xs py-1.5 gap-1 relative">
                    <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Review</span>
                    {candidates.length > 0 && (
                      <Badge
                        variant="default"
                        className="px-1.5 py-0 text-[10px] h-4 bg-amber-600 text-white rounded-full font-bold ml-0.5"
                        aria-label={`${candidates.length} candidate facts awaiting confirmation`}
                      >
                        {candidates.length}
                      </Badge>
                    )}
                  </TabsTrigger>

                  <TabsTrigger value="facts" className="text-xs py-1.5 gap-1">
                    <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Facts ({facts.length})</span>
                  </TabsTrigger>

                  <TabsTrigger value="evidence" className="text-xs py-1.5 gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Evidence ({evidence.length})</span>
                  </TabsTrigger>

                  <TabsTrigger value="questions" className="text-xs py-1.5 gap-1">
                    <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Questions</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview">
                  <CareerOverviewTab
                    profile={activeProfile}
                    profiles={profiles}
                    facts={facts}
                    evidence={evidence}
                    onSelectProfile={handleSelectProfile}
                    onCreateProfile={handleCreateProfile}
                    onNavigateTab={setActiveTab}
                    onOpenResumeImport={() => setIsResumeImportOpen(true)}
                    onOpenGitHubScan={() => setIsGitHubScanOpen(true)}
                    onOpenProjectToResume={() => setIsProjectToResumeOpen(true)}
                    onFactSelect={(f) => setSelectedFactId(f.id)}
                  />
                </TabsContent>

                {/* Tab 2: Candidate Review */}
                <TabsContent value="confirmations">
                  <CandidateReviewTab
                    candidates={candidates}
                    onRefresh={handleDataRefresh}
                    onOpenResumeImport={() => setIsResumeImportOpen(true)}
                    onOpenGitHubScan={() => setIsGitHubScanOpen(true)}
                  />
                </TabsContent>

                {/* Tab 3: Canonical Facts */}
                <TabsContent value="facts">
                  <CareerFactsTab
                    facts={facts}
                    onRefresh={handleDataRefresh}
                    onOpenResumeImport={() => setIsResumeImportOpen(true)}
                    onOpenGitHubScan={() => setIsGitHubScanOpen(true)}
                    onOpenProjectToResume={() => setIsProjectToResumeOpen(true)}
                  />
                </TabsContent>

                {/* Tab 4: Provenance & Evidence */}
                <TabsContent value="evidence">
                  <CareerEvidenceTab
                    evidence={evidence}
                    onOpenGitHubScan={() => setIsGitHubScanOpen(true)}
                    onOpenResumeImport={() => setIsResumeImportOpen(true)}
                  />
                </TabsContent>

                {/* Tab 5: Gaps & Clarification Questions */}
                <TabsContent value="questions">
                  <CareerQuestionsTab
                    profileId={activeProfileId || ''}
                    onRefresh={handleDataRefresh}
                    onNavigateTab={setActiveTab}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Fact Detail Modal */}
      <FactDetailModal
        factId={selectedFactId}
        isOpen={Boolean(selectedFactId)}
        onClose={() => setSelectedFactId(null)}
        onFactUpdated={handleDataRefresh}
      />

      {/* Resume Import Modal */}
      <ResumeImportModal
        profileId={activeProfileId || ''}
        isOpen={isResumeImportOpen}
        onClose={() => setIsResumeImportOpen(false)}
        onImportComplete={() => {
          handleDataRefresh();
          setActiveTab('confirmations');
        }}
      />

      {/* GitHub Scan Modal */}
      <GitHubEvidenceScanModal
        profileId={activeProfileId || ''}
        isOpen={isGitHubScanOpen}
        onClose={() => setIsGitHubScanOpen(false)}
        onScanComplete={handleDataRefresh}
      />

      {/* Project to Resume Modal */}
      <ProjectToResumeModal
        profileId={activeProfileId || ''}
        isOpen={isProjectToResumeOpen}
        onClose={() => setIsProjectToResumeOpen(false)}
        confirmedCount={confirmedCount}
      />
    </>
  );
};

export default CareerKnowledgeDrawer;
