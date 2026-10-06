import React, { useState } from 'react';
import { QuestionClarificationCard } from '../components/QuestionClarificationCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Plus, CheckCircle2, Loader2, ListPlus } from 'lucide-react';
import type { KnowledgeGap, KnowledgeRequirement, QuestionPlan } from '@/types/careerKnowledge';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface CareerQuestionsTabProps {
  profileId: string;
  onRefresh: () => void;
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_REQUIREMENTS: KnowledgeRequirement[] = [
  {
    key: 'leadership',
    category: 'experience',
    description: 'Technical leadership, mentoring, or project management experience',
    importance: 'useful',
  },
  {
    key: 'cloud_infrastructure',
    category: 'skill',
    description: 'Cloud deployment, containerization, or infrastructure knowledge',
    importance: 'useful',
  },
  {
    key: 'system_architecture',
    category: 'project',
    description: 'Significant architecture, scalability, or backend system project',
    importance: 'useful',
  },
  {
    key: 'open_source_contributions',
    category: 'project',
    description: 'Open source or community code contributions',
    importance: 'useful',
  },
];

export const CareerQuestionsTab: React.FC<CareerQuestionsTabProps> = ({
  profileId,
  onRefresh,
  onNavigateTab,
}) => {
  // Standard requirements state
  const [requirements, setRequirements] = useState<KnowledgeRequirement[]>(DEFAULT_REQUIREMENTS);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('skill');

  // Question Engine state
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [plans, setPlans] = useState<QuestionPlan[]>([]);
  const [skippedGapIds, setSkippedGapIds] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  const handleScanGaps = async () => {
    setScanning(true);
    setSkippedGapIds([]);
    try {
      const detected = await careerKnowledgeAppService.detectGaps(profileId, requirements);
      const planned = careerKnowledgeAppService.planQuestionsForGaps(detected);
      setGaps(detected);
      setPlans(planned);
      setHasScanned(true);
      toast.success(`Found ${detected.length} knowledge gap${detected.length === 1 ? '' : 's'}.`);
    } catch (err) {
      toast.error('Failed to detect gaps: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setScanning(false);
    }
  };

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newDesc.trim()) return;

    const req: KnowledgeRequirement = {
      key: newKey.trim().toLowerCase().replace(/\s+/g, '_'),
      description: newDesc.trim(),
      category: newCat,
      importance: 'useful',
    };

    setRequirements([...requirements, req]);
    setNewKey('');
    setNewDesc('');
    toast.success(`Added requirement "${req.key}"`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Knowledge Gaps & Question Engine</h3>
          <p className="text-xs text-muted-foreground">
            Scan for knowledge gaps against target career requirements and plan structured
            clarification questions to build your canonical facts.
          </p>
        </div>
      </div>

      {/* Target Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ListPlus className="w-4 h-4 text-primary" /> Target Knowledge Requirements (
                {requirements.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Standard career domains to analyze your canonical facts against.
              </CardDescription>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleScanGaps}
              disabled={scanning}
              className="gap-1.5 text-xs shrink-0"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Gaps...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Scan for Gaps
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requirements.map((r) => (
              <div
                key={r.key}
                className="p-2.5 border rounded-lg bg-card text-xs flex items-center justify-between gap-2"
              >
                <div className="truncate">
                  <div className="font-semibold text-foreground truncate">{r.key}</div>
                  <div className="text-muted-foreground truncate">{r.description}</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-muted rounded shrink-0">
                  {r.category}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddRequirement}
            className="pt-2 border-t flex flex-col sm:flex-row gap-2"
          >
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Requirement key (e.g. go_backend)"
              className="text-xs flex-1"
            />
            <Input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (e.g. Experience with Go microservices)"
              className="text-xs flex-2"
            />
            <select
              aria-label="Requirement Category"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              className="px-2 py-1 rounded border text-xs bg-background"
            >
              <option value="skill">Skill</option>
              <option value="experience">Experience</option>
              <option value="project">Project</option>
              <option value="education">Education</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              disabled={!newKey.trim() || !newDesc.trim()}
              className="text-xs gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Requirement
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Detected Gaps & Clarification Questions (Question Engine Output) */}
      {hasScanned && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-foreground">
              Clarification Question Plans ({plans.length})
            </h4>
            <span className="text-xs text-muted-foreground">
              {gaps.length} knowledge gap{gaps.length === 1 ? '' : 's'} identified
            </span>
          </div>

          {gaps.length === 0 ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-xl text-center space-y-1 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" aria-hidden="true" />
              <div className="font-bold text-sm">No questions currently needed.</div>
              <div className="text-xs">
                Your confirmed Career Knowledge covers the current requirements.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {gaps
                .filter((gap) => !skippedGapIds.includes(gap.id))
                .map((gap) => {
                  const plan = plans.find((p) => p.gapId === gap.id);
                  if (!plan) return null;
                  return (
                    <QuestionClarificationCard
                      key={gap.id}
                      profileId={profileId}
                      gap={gap}
                      plan={plan}
                      onSkip={() => setSkippedGapIds((prev) => [...prev, gap.id])}
                      onNavigateToReview={() => onNavigateTab?.('confirmations')}
                      onAnswered={() => {
                        onRefresh();
                        handleScanGaps();
                      }}
                    />
                  );
                })}
              {gaps.length > 0 && gaps.every((gap) => skippedGapIds.includes(gap.id)) && (
                <div className="p-6 border rounded-xl bg-card text-center space-y-2 text-muted-foreground">
                  <p className="text-sm font-medium text-foreground">
                    All active questions skipped
                  </p>
                  <p className="text-xs">You can reset skipped questions at any time.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSkippedGapIds([])}
                    className="text-xs"
                  >
                    Show All Questions
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
