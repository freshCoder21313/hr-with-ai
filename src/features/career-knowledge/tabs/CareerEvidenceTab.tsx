import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ShieldCheck, ExternalLink, Github, FileText, User, MessageSquare } from 'lucide-react';
import type { CareerEvidence, EvidenceSourceType } from '@/types/careerKnowledge';

interface CareerEvidenceTabProps {
  evidence: CareerEvidence[];
  onOpenGitHubScan: () => void;
  onOpenResumeImport?: () => void;
}

const SOURCE_TYPES: { value: EvidenceSourceType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'github', label: 'GitHub' },
  { value: 'user', label: 'User Answers' },
  { value: 'ai_conversation', label: 'AI Conversation' },
  { value: 'uploaded_document', label: 'Uploaded Documents' },
  { value: 'other', label: 'Resume / Other' },
];

export const CareerEvidenceTab: React.FC<CareerEvidenceTabProps> = ({
  evidence,
  onOpenGitHubScan,
  onOpenResumeImport,
}) => {
  const [selectedSource, setSelectedSource] = useState<EvidenceSourceType | 'all'>('all');

  const filteredEvidence = evidence.filter((e) => {
    if (selectedSource !== 'all' && e.sourceType !== selectedSource) return false;
    return true;
  });

  const getSourceIcon = (source: EvidenceSourceType) => {
    switch (source) {
      case 'github':
        return <Github className="w-4 h-4 text-foreground/80" aria-hidden="true" />;
      case 'user':
        return <User className="w-4 h-4 text-success" aria-hidden="true" />;
      case 'ai_conversation':
        return <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />;
      case 'uploaded_document':
        return <FileText className="w-4 h-4 text-info" aria-hidden="true" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Provenance & Evidence Records</h3>
          <p className="text-xs text-muted-foreground">
            Immutable observations from Resumes, user answers, and external sources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenResumeImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenResumeImport}
              className="gap-1.5 text-xs"
            >
              <FileText className="w-4 h-4" aria-hidden="true" /> Import Resume
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={onOpenGitHubScan}
            className="gap-1.5 text-xs"
          >
            <Github className="w-4 h-4" aria-hidden="true" /> Scan GitHub Evidence
          </Button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="p-3.5 bg-muted/40 border border-border rounded-xl text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-0.5">
          <div className="font-semibold text-foreground">Immutable Provenance Invariant</div>
          <div className="text-muted-foreground">
            Evidence records are permanent audit trails. External observations provide supporting
            context, but never automatically confirm a career claim without user review.
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="evidence-source-filter"
          className="text-xs font-semibold text-muted-foreground"
        >
          Source:
        </label>
        <select
          id="evidence-source-filter"
          aria-label="Filter Evidence by Source"
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value as EvidenceSourceType | 'all')}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {SOURCE_TYPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Evidence List or Empty States */}
      {evidence.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-10 h-10 text-primary/70" aria-hidden="true" />}
          title="No evidence found"
          message="Evidence will appear when imported or acquired. Scan GitHub repositories or import existing resumes to capture immutable evidence records."
          action={
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {onOpenResumeImport && (
                <Button onClick={onOpenResumeImport} size="sm" className="text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Import from Resume
                </Button>
              )}
              <Button
                onClick={onOpenGitHubScan}
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
              >
                <Github className="w-3.5 h-3.5" aria-hidden="true" /> Scan GitHub Evidence
              </Button>
            </div>
          }
        />
      ) : filteredEvidence.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8 text-muted-foreground/60" aria-hidden="true" />}
          title="No matching evidence records found"
          message={`No evidence records recorded under the "${selectedSource}" source filter.`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedSource('all')}
              className="text-xs"
            >
              Show All Sources
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((ev) => (
            <Card key={ev.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(ev.sourceType)}
                    <span className="font-semibold text-foreground uppercase tracking-wide px-2 py-0.5 bg-muted rounded">
                      {ev.sourceType.replace('_', ' ')}
                    </span>
                    {ev.sourceRef && (
                      <span className="text-muted-foreground font-mono truncate max-w-xs sm:max-w-md">
                        {ev.sourceRef}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    Captured: {new Date(ev.capturedAt).toLocaleString()}
                  </span>
                </div>

                {ev.excerpt && (
                  <blockquote className="border-l-2 border-primary/40 pl-3 py-1 text-xs italic text-muted-foreground bg-muted/20 rounded-r whitespace-pre-wrap">
                    {ev.excerpt}
                  </blockquote>
                )}

                {ev.url && (
                  <div className="pt-1">
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> {ev.url}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
