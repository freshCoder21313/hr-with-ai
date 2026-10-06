import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, CheckCircle2, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';
import type {
  KnowledgeGap,
  QuestionPlan,
  QuestionGenerationResult,
  AnswerNormalizationResult,
} from '@/types/careerKnowledge';
import { careerKnowledgeAppService } from '@/services/careerKnowledge/careerKnowledgeAppService';
import { toast } from 'sonner';

interface QuestionClarificationCardProps {
  profileId: string;
  gap: KnowledgeGap;
  plan: QuestionPlan;
  onAnswered: () => void;
  onSkip?: () => void;
  onNavigateToReview?: () => void;
}

export const QuestionClarificationCard: React.FC<QuestionClarificationCardProps> = ({
  profileId,
  gap,
  plan,
  onAnswered,
  onSkip,
  onNavigateToReview,
}) => {
  const [wording, setWording] = useState<QuestionGenerationResult | null>(null);
  const [loadingWording, setLoadingWording] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AnswerNormalizationResult | null>(null);

  const handleGenerateQuestion = async () => {
    setLoadingWording(true);
    try {
      const generated = await careerKnowledgeAppService.generateQuestionWording(
        plan,
        gap.requirement
      );
      setWording(generated);
    } catch (err) {
      toast.error(
        'Could not generate question wording: ' + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setLoadingWording(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) {
      toast.error('Please enter your response.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await careerKnowledgeAppService.submitUserAnswer(
        profileId,
        plan,
        answerText.trim()
      );
      setResult(res);
      toast.success(
        `Answer recorded with ${res.candidateFacts.length} candidate facts created for confirmation.`
      );
      onAnswered();
    } catch (err) {
      toast.error('Failed to submit answer: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded">
            Gap: {gap.type}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{gap.requirementKey}</span>
        </div>
        <CardTitle className="text-base font-bold text-foreground">{gap.description}</CardTitle>
        <CardDescription className="text-xs">
          Target category: <strong className="capitalize">{plan.targetFactShape.category}</strong>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {!wording && !result && (
          <div className="p-4 bg-muted/20 border rounded-lg flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              Formulate a clarification question for this career gap.
            </div>
            <div className="flex items-center gap-2">
              {onSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-xs text-muted-foreground"
                >
                  Skip for Now
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestion}
                disabled={loadingWording}
                className="gap-1.5 shrink-0"
              >
                {loadingWording ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> Preparing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Generate
                    Question
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {wording && !result && (
          <form onSubmit={handleSubmitAnswer} className="space-y-3">
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
              <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Clarification Question
              </div>
              <div className="text-sm font-medium text-foreground">{wording.question}</div>
              {wording.answerShape && (
                <div className="text-[11px] text-muted-foreground italic">
                  Suggested format: {wording.answerShape}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`answer-${plan.gapId}`}
                className="text-xs font-semibold text-foreground"
              >
                Your Answer (Direct User Claim)
              </label>
              <Textarea
                id={`answer-${plan.gapId}`}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="e.g. Yes, I led the migration of our monolithic payment service to Go microservices in Kubernetes..."
                rows={3}
                disabled={submitting}
                required
              />
            </div>

            <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-primary" aria-hidden="true" />
                Raw answer is saved as immutable provenance evidence.
              </div>
              <div className="flex items-center gap-2">
                {onSkip && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={onSkip}
                    disabled={submitting}
                    className="text-xs text-muted-foreground"
                  >
                    Skip
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={!answerText.trim() || submitting}
                  className="gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />{' '}
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" aria-hidden="true" /> Submit Answer
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {result && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>Answer Recorded and Normalized</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Created <strong>{result.candidateFacts.length}</strong> candidate fact
              {result.candidateFacts.length === 1 ? '' : 's'} under <em>Needs confirmation</em>:
            </div>
            <ul className="space-y-1 text-xs list-disc list-inside text-foreground">
              {result.candidateFacts.map((f) => (
                <li key={f.id} className="font-medium">
                  {f.subject}: {f.claim}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 flex-wrap">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300">
                Go to Candidate Review to explicitly confirm these facts.
              </span>
              {onNavigateToReview && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToReview}
                  className="text-xs bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border-emerald-300 hover:bg-emerald-50"
                >
                  Go to Candidate Review
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
