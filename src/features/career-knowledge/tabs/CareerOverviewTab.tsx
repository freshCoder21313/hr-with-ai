import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from '../components/VerificationBadge';
import {
  CheckCircle2,
  AlertCircle,
  Eye,
  XCircle,
  ShieldCheck,
  FileText,
  Github,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Plus,
} from 'lucide-react';
import type { CareerFact, CareerEvidence, CareerProfile } from '@/types/careerKnowledge';

interface CareerOverviewTabProps {
  profile: CareerProfile | null;
  profiles: CareerProfile[];
  facts: CareerFact[];
  evidence: CareerEvidence[];
  onSelectProfile: (id: string) => void;
  onCreateProfile: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenResumeImport: () => void;
  onOpenGitHubScan: () => void;
  onOpenProjectToResume: () => void;
  onFactSelect: (fact: CareerFact) => void;
}

export const CareerOverviewTab: React.FC<CareerOverviewTabProps> = ({
  profile,
  profiles,
  facts,
  evidence,
  onSelectProfile,
  onCreateProfile,
  onNavigateTab,
  onOpenResumeImport,
  onOpenGitHubScan,
  onOpenProjectToResume,
  onFactSelect,
}) => {
  const confirmedCount = facts.filter((f) => f.verificationState === 'confirmed').length;
  const needsConfirmationCount = facts.filter(
    (f) => f.verificationState === 'needs_confirmation'
  ).length;
  const observedCount = facts.filter((f) => f.verificationState === 'observed').length;
  const rejectedCount = facts.filter((f) => f.verificationState === 'rejected').length;

  const recentFacts = [...facts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Profile Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-sm">
        <div className="space-y-1">
          <div className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
            Active Career Profile
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label="Active Career Profile"
              value={profile?.id || ''}
              onChange={(e) => onSelectProfile(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {profiles.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  Profile {idx + 1} ({p.id.slice(0, 8)}...)
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" onClick={onCreateProfile} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> New Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Candidate Review Alert Banner if candidates exist */}
      {needsConfirmationCount > 0 && (
        <div
          role="alert"
          className="p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center text-warning shrink-0">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {needsConfirmationCount} Candidate Fact{needsConfirmationCount === 1 ? '' : 's'}{' '}
                Awaiting Confirmation
              </h2>
              <p className="text-xs text-muted-foreground">
                Candidate claims imported from Resumes, questions, or external sources require your
                explicit confirmation.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => onNavigateTab('confirmations')}
            className="bg-warning text-warning-foreground hover:bg-warning/90 gap-1.5 shadow-sm font-semibold"
          >
            Review Candidates <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Metrics Grid */}
      <section
        aria-label="Career Knowledge Metrics"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        <Card className="bg-success/5 border-success/20 dark:bg-success/10 dark:border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-success">
              <span className="text-xs font-semibold uppercase tracking-wider">Confirmed</span>
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{confirmedCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Canonical facts</div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-warning">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Needs Confirmation
              </span>
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{needsConfirmationCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Candidate queue</div>
          </CardContent>
        </Card>

        <Card className="bg-info/5 border-info/20 dark:bg-info/10 dark:border-info/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-info">
              <span className="text-xs font-semibold uppercase tracking-wider">Observed</span>
              <Eye className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{observedCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">External claims</div>
          </CardContent>
        </Card>

        <Card className="bg-muted/40 border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
              <XCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{rejectedCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Rejected claims</div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/40 border-purple-200/80 dark:bg-purple-950/20 dark:border-purple-900/50 col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Evidence</span>
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">{evidence.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Provenance records</div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Resume Migration
            </CardTitle>
            <CardDescription className="text-xs">
              Extract candidate facts from existing Resumes into your knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenResumeImport}
              className="w-full text-xs"
            >
              Import from Resume
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Github className="w-4 h-4 text-primary" /> GitHub Evidence
            </CardTitle>
            <CardDescription className="text-xs">
              Scan public repositories to collect immutable evidence records.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenGitHubScan}
              className="w-full text-xs"
            >
              Scan GitHub
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" /> Clarification Gaps
            </CardTitle>
            <CardDescription className="text-xs">
              Identify career knowledge gaps and formulate targeted questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab('questions')}
              className="w-full text-xs"
            >
              Explore Gaps
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Project to Resume
            </CardTitle>
            <CardDescription className="text-xs">
              Export confirmed facts into an attributed Resume presentation.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              variant="default"
              size="sm"
              onClick={onOpenProjectToResume}
              disabled={confirmedCount === 0}
              className="w-full text-xs"
            >
              Project to Resume
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Knowledge Activity */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Recent Knowledge Activity</CardTitle>
            <CardDescription className="text-xs">
              Most recently updated canonical facts and candidates.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTab('facts')}
            className="text-xs text-primary gap-1"
          >
            View all facts <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recentFacts.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <div className="text-xs text-muted-foreground max-w-sm mx-auto">
                No Career Facts yet. Import a Resume or add information through Career Knowledge.
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenResumeImport}
                  className="text-xs gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Import from Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenGitHubScan}
                  className="text-xs gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" aria-hidden="true" /> Scan GitHub Evidence
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
              {recentFacts.map((fact) => (
                <div
                  key={fact.id}
                  onClick={() => onFactSelect(fact)}
                  className="p-3 hover:bg-muted/30 cursor-pointer transition-colors flex items-center justify-between gap-3 text-sm"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.2 bg-muted rounded">
                        {fact.category}
                      </span>
                      <span className="font-semibold text-foreground truncate">{fact.subject}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{fact.claim}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <VerificationBadge state={fact.verificationState} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
