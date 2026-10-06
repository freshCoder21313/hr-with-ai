import React, { useState, useMemo } from 'react';
import { FactCard } from '../components/FactCard';
import { FactDetailModal } from '../components/FactDetailModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, BookOpen } from 'lucide-react';
import type { CareerFact, CareerFactCategory, VerificationState } from '@/types/careerKnowledge';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface CareerFactsTabProps {
  facts: CareerFact[];
  onRefresh: () => void;
  onOpenResumeImport?: () => void;
  onOpenGitHubScan?: () => void;
  onOpenProjectToResume?: () => void;
}

const CATEGORIES: { value: CareerFactCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'experience', label: 'Experience' },
  { value: 'skill', label: 'Skills' },
  { value: 'project', label: 'Projects' },
  { value: 'education', label: 'Education' },
  { value: 'achievement', label: 'Achievements' },
  { value: 'certification', label: 'Certifications' },
  { value: 'preference', label: 'Preferences' },
  { value: 'goal', label: 'Goals' },
];

const STATES: { value: VerificationState | 'all'; label: string }[] = [
  { value: 'all', label: 'All States' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'needs_confirmation', label: 'Needs confirmation' },
  { value: 'observed', label: 'Observed' },
  { value: 'rejected', label: 'Rejected' },
];

export const CareerFactsTab: React.FC<CareerFactsTabProps> = ({
  facts,
  onRefresh,
  onOpenResumeImport,
  onOpenGitHubScan,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CareerFactCategory | 'all'>('all');
  const [selectedState, setSelectedState] = useState<VerificationState | 'all'>('all');
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);

  const filteredFacts = useMemo(() => {
    return facts.filter((f) => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) return false;
      if (selectedState !== 'all' && f.verificationState !== selectedState) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesSubject = f.subject.toLowerCase().includes(q);
        const matchesClaim = f.claim.toLowerCase().includes(q);
        const matchesCat = f.category.toLowerCase().includes(q);
        if (!matchesSubject && !matchesClaim && !matchesCat) return false;
      }
      return true;
    });
  }, [facts, selectedCategory, selectedState, search]);

  const handleConfirm = async (fact: CareerFact) => {
    try {
      await careerKnowledgeAppService.confirmFact(fact.id);
      toast.success(`Confirmed "${fact.subject}"`);
      onRefresh();
    } catch (err) {
      toast.error('Confirmation failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleReject = async (fact: CareerFact) => {
    try {
      await careerKnowledgeAppService.rejectFact(fact.id);
      toast.info(`Rejected "${fact.subject}"`);
      onRefresh();
    } catch (err) {
      toast.error('Rejection failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleInvalidate = async (fact: CareerFact) => {
    try {
      await careerKnowledgeAppService.invalidateFact(fact.id);
      toast.info(`Moved "${fact.subject}" back to needs confirmation`);
      onRefresh();
    } catch (err) {
      toast.error('Invalidate failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const hasFiltersActive =
    search.trim() !== '' || selectedCategory !== 'all' || selectedState !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedState('all');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Canonical Knowledge Base</h3>
          <p className="text-xs text-muted-foreground">
            Search and inspect canonical claims, categories, and verification status.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claims, subjects, or categories..."
            className="pl-9 text-sm"
            aria-label="Search career facts"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter by Category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as CareerFactCategory | 'all')}
            className="px-3 py-2 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Verification State"
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value as VerificationState | 'all')}
            className="px-3 py-2 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Facts Grid or Empty States */}
      {facts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-10 h-10 text-primary/70" aria-hidden="true" />}
          title="No Career Facts yet"
          message="Import a Resume or add information through Career Knowledge. Your verified facts form the canonical ground truth for all tailored projections."
          action={
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {onOpenResumeImport && (
                <Button onClick={onOpenResumeImport} size="sm" className="text-xs gap-1.5">
                  Import from Resume
                </Button>
              )}
              {onOpenGitHubScan && (
                <Button
                  onClick={onOpenGitHubScan}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                >
                  Scan GitHub Evidence
                </Button>
              )}
            </div>
          }
        />
      ) : filteredFacts.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-8 h-8 text-muted-foreground/60" aria-hidden="true" />}
          title="No matching career facts found"
          message="Try adjusting your search query or filters to find specific career facts."
          action={
            hasFiltersActive ? (
              <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                Clear Filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFacts.map((fact) => (
            <FactCard
              key={fact.id}
              fact={fact}
              onSelect={(f) => setSelectedFactId(f.id)}
              onConfirm={handleConfirm}
              onReject={handleReject}
              onInvalidate={handleInvalidate}
            />
          ))}
        </div>
      )}

      {/* Fact Detail Modal */}
      <FactDetailModal
        factId={selectedFactId}
        isOpen={Boolean(selectedFactId)}
        onClose={() => setSelectedFactId(null)}
        onFactUpdated={onRefresh}
      />
    </div>
  );
};
