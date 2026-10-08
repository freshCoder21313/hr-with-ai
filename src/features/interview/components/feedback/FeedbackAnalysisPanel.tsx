import React, { RefObject, Suspense, lazy, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InterviewFeedback } from '@/types';
import { Interview } from '@/types';

const FeedbackScoreHeader = lazy(() =>
  import('./FeedbackScoreHeader').then((m) => ({ default: m.FeedbackScoreHeader }))
);

interface FeedbackAnalysisPanelProps {
  interview: Interview;
  feedback: InterviewFeedback;
  mermaidRef1: RefObject<HTMLDivElement>;
  mermaidRef2: RefObject<HTMLDivElement>;
}

export const FeedbackAnalysisPanel: React.FC<FeedbackAnalysisPanelProps> = ({
  interview,
  feedback,
  mermaidRef1,
  mermaidRef2,
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(() => new Set([0]));

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const allQuestionsExpanded =
    feedback.keyQuestionAnalysis &&
    feedback.keyQuestionAnalysis.length > 0 &&
    expandedQuestions.size === feedback.keyQuestionAnalysis.length;

  const toggleAllQuestions = () => {
    if (allQuestionsExpanded) {
      setExpandedQuestions(new Set());
    } else {
      setExpandedQuestions(new Set(feedback.keyQuestionAnalysis.map((_, i) => i)));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Suspense
        fallback={
          <div className="h-48 flex items-center justify-center bg-card rounded-lg border border-border animate-pulse">
            Loading analysis summary...
          </div>
        }
      >
        <FeedbackScoreHeader interview={interview} feedback={feedback} />
      </Suspense>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed text-lg">{feedback.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-5 h-5 text-primary" />
              Current Performance Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={mermaidRef1}
              className="overflow-x-auto flex justify-center py-4 bg-muted/50 rounded-lg min-h-[200px] items-center"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart2 className="w-5 h-5 text-success" />
              Potential & Improvement Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              ref={mermaidRef2}
              className="overflow-x-auto flex justify-center py-4 bg-muted/50 rounded-lg min-h-[200px] items-center"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-success/10 border-success/20">
          <CardHeader>
            <CardTitle className="flex items-center text-success">
              <CheckCircle2 className="w-5 h-5 mr-2" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start text-foreground text-sm">
                  <span className="mr-2 text-success font-bold">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="w-5 h-5 mr-2" /> Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {feedback.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start text-foreground text-sm">
                  <span className="mr-2 text-destructive font-bold">•</span> {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {feedback.recommendedResources && feedback.recommendedResources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Recommended Learning Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {feedback.recommendedResources.map((res, idx) => (
                <a
                  key={idx}
                  href={`https://www.google.com/search?q=${encodeURIComponent(res.searchQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                >
                  <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary flex items-center justify-between text-sm">
                    {res.topic}
                    <ExternalLink
                      size={14}
                      className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0"
                    />
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{res.description}</p>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {feedback.keyQuestionAnalysis && feedback.keyQuestionAnalysis.length > 0 && (
        <Card className="border-border">
          <CardHeader className="bg-muted/30 border-b border-border flex flex-row items-center justify-between py-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base sm:text-lg">Key Question Analysis</CardTitle>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
                {feedback.keyQuestionAnalysis.length}
              </span>
            </div>
            {feedback.keyQuestionAnalysis.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAllQuestions}
                className="text-xs h-7 text-muted-foreground hover:text-foreground"
              >
                {allQuestionsExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            )}
          </CardHeader>
          <div className="divide-y divide-border">
            {feedback.keyQuestionAnalysis.map((item, idx) => {
              const isExpanded = expandedQuestions.has(idx);
              return (
                <div key={idx} className="transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleQuestion(idx)}
                    className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                        Q{idx + 1}
                      </span>
                      <p className="font-medium text-foreground text-sm sm:text-base line-clamp-2">
                        {item.question}
                      </p>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 mt-1 sm:mt-0',
                        isExpanded ? 'rotate-180' : ''
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-1 animate-in fade-in-50 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="text-sm text-foreground bg-muted p-4 rounded-lg border border-border">
                          <span className="font-semibold block mb-2 text-foreground uppercase text-xs tracking-wider">
                            Analysis
                          </span>
                          {item.analysis}
                        </div>
                        <div className="text-sm text-foreground bg-primary/10 p-4 rounded-lg border border-primary/20">
                          <span className="font-semibold block mb-2 text-primary uppercase text-xs tracking-wider">
                            Better Approach
                          </span>
                          {item.improvement}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
