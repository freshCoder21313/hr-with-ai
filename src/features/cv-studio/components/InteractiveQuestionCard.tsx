import React, { useState } from 'react';
import { InteractiveQuestion, InteractiveQuestionGroup } from '@/services/ai/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, Send, X, CheckCircle2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InteractiveQuestionAnswer {
  selectedOptions: string[];
  customText?: string;
}

export type InteractiveQuestionAnswers = Record<string, InteractiveQuestionAnswer>;

export interface InteractiveQuestionCardProps {
  /** Multi-question group or normalized question group */
  questionGroup?: InteractiveQuestionGroup;
  /** Single question for direct or backward-compatible usage */
  question?: InteractiveQuestion;
  onSubmit: (answers: InteractiveQuestionAnswers) => void;
  onSkip?: () => void;
  isAnswered?: boolean;
  answeredValue?: InteractiveQuestionAnswers | InteractiveQuestionAnswer;
  disabled?: boolean;
}

export const InteractiveQuestionCard: React.FC<InteractiveQuestionCardProps> = ({
  questionGroup,
  question,
  onSubmit,
  onSkip,
  isAnswered = false,
  answeredValue,
  disabled = false,
}) => {
  const group: InteractiveQuestionGroup | null = React.useMemo(() => {
    if (questionGroup) return questionGroup;
    if (question) {
      return {
        id: question.id,
        questions: [question],
        submitLabel: question.submitLabel,
      };
    }
    return null;
  }, [questionGroup, question]);

  const initialAnswers: InteractiveQuestionAnswers = React.useMemo(() => {
    if (!group) return {};
    const res: InteractiveQuestionAnswers = {};

    if (answeredValue) {
      if (Array.isArray((answeredValue as InteractiveQuestionAnswer).selectedOptions)) {
        // Single answer passed
        const single = answeredValue as InteractiveQuestionAnswer;
        const firstQ = group.questions[0];
        if (firstQ) {
          res[firstQ.id] = {
            selectedOptions: single.selectedOptions || [],
            customText: single.customText || '',
          };
        }
      } else {
        // Map passed
        const map = answeredValue as InteractiveQuestionAnswers;
        Object.entries(map).forEach(([qId, ans]) => {
          if (ans) {
            res[qId] = {
              selectedOptions: ans.selectedOptions || [],
              customText: ans.customText || '',
            };
          }
        });
      }
    }

    group.questions.forEach((q) => {
      if (!res[q.id]) {
        res[q.id] = { selectedOptions: [], customText: '' };
      }
    });

    return res;
  }, [group, answeredValue]);

  const [answers, setAnswers] = useState<InteractiveQuestionAnswers>(initialAnswers);

  if (!group || group.questions.length === 0) return null;

  const isMulti = group.questions.length > 1;

  const handleOptionToggle = (q: InteractiveQuestion, optId: string) => {
    if (disabled || isAnswered) return;

    const currentAnswer = answers[q.id] || { selectedOptions: [], customText: '' };
    const currentSelected = currentAnswer.selectedOptions;
    const isRadio = q.type === 'radio';

    let nextSelected: string[];
    if (isRadio) {
      nextSelected = [optId];
    } else {
      if (currentSelected.includes(optId)) {
        nextSelected = currentSelected.filter((id) => id !== optId);
      } else {
        if (q.maxSelect && currentSelected.length >= q.maxSelect) {
          return;
        }
        nextSelected = [...currentSelected, optId];
      }
    }

    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...currentAnswer,
        selectedOptions: nextSelected,
      },
    }));
  };

  const handleCustomTextChange = (q: InteractiveQuestion, text: string) => {
    if (disabled || isAnswered) return;
    const currentAnswer = answers[q.id] || { selectedOptions: [], customText: '' };
    setAnswers((prev) => ({
      ...prev,
      [q.id]: {
        ...currentAnswer,
        customText: text,
      },
    }));
  };

  const isQuestionValid = (q: InteractiveQuestion): boolean => {
    const a = answers[q.id];
    const selCount = a?.selectedOptions.length || 0;
    const hasCustom = Boolean(a?.customText?.trim());

    if (q.type === 'input') {
      if (!isMulti) return hasCustom;
      return true; // In a multi-group, input questions can be optional unless filled
    }

    if (q.minSelect && q.minSelect > 0) {
      if (selCount > 0 || hasCustom) {
        return selCount >= q.minSelect || hasCustom;
      }
      if (!isMulti) return false;
      return true;
    }

    return true;
  };

  const getAnsweredCount = (): number => {
    return group.questions.filter((q) => {
      const a = answers[q.id];
      return Boolean(a && (a.selectedOptions.length > 0 || a.customText?.trim()));
    }).length;
  };

  const canSubmit = (): boolean => {
    if (disabled || isAnswered) return false;

    const answeredCount = getAnsweredCount();
    if (answeredCount === 0) return false;

    // All questions that have partial input must be valid
    for (const q of group.questions) {
      if (!isQuestionValid(q)) return false;
    }

    if (!isMulti) {
      const singleQ = group.questions[0];
      const a = answers[singleQ.id];
      if (singleQ.type === 'input') {
        return Boolean(a?.customText?.trim());
      }
      if (singleQ.minSelect && singleQ.minSelect > 0) {
        return (
          (a?.selectedOptions.length || 0) >= singleQ.minSelect || Boolean(a?.customText?.trim())
        );
      }
      return (a?.selectedOptions.length || 0) > 0 || Boolean(a?.customText?.trim());
    }

    return true;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit()) return;

    // Filter only questions with answers or provide all answers trimmed
    const cleanedAnswers: InteractiveQuestionAnswers = {};
    group.questions.forEach((q) => {
      const a = answers[q.id];
      if (a && (a.selectedOptions.length > 0 || a.customText?.trim())) {
        cleanedAnswers[q.id] = {
          selectedOptions: a.selectedOptions,
          customText: a.customText?.trim() || undefined,
        };
      }
    });

    onSubmit(cleanedAnswers);
  };

  // Render Answered View
  if (isAnswered) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2 animate-in fade-in duration-200">
        <div className="flex items-center gap-1.5 font-medium text-primary">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-semibold">
            {group.title || (isMulti ? 'Interactive Questions Completed' : group.questions[0].question)}
          </span>
          {isMulti && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-normal">
              {group.questions.length} questions
            </span>
          )}
        </div>

        <div className="space-y-1.5 pl-5">
          {group.questions.map((q, idx) => {
            const a = answers[q.id];
            const labels = (a?.selectedOptions || [])
              .map((id) => q.options?.find((o) => o.id === id)?.label || id)
              .filter(Boolean);
            const custom = a?.customText;

            if (labels.length === 0 && !custom) return null;

            return (
              <div key={q.id} className="text-muted-foreground flex flex-wrap gap-1 items-center">
                {isMulti && (
                  <span className="font-medium text-foreground mr-1">
                    {idx + 1}. {q.question}:
                  </span>
                )}
                {!isMulti && <span className="font-semibold text-foreground">Selected:</span>}
                {labels.map((lbl, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded-md border border-border text-[11px] font-medium text-foreground"
                  >
                    <Check className="w-3 h-3 text-primary" />
                    {lbl}
                  </span>
                ))}
                {custom && (
                  <span className="inline-flex items-center bg-background px-2 py-0.5 rounded-md border border-border text-[11px] italic text-muted-foreground">
                    &ldquo;{custom}&rdquo;
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const answeredCount = getAnsweredCount();
  const submitText =
    group.submitLabel ||
    (isMulti
      ? answeredCount > 1
        ? `Submit ${answeredCount} answers`
        : answeredCount === 1
          ? 'Submit 1 answer'
          : 'Submit answer'
      : group.questions[0].submitLabel || 'Confirm & Continue');

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/30 bg-card shadow-sm p-3.5 space-y-3.5 transition-all',
        'dark:border-primary/20 dark:bg-card/95',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Top Header */}
      <div className="space-y-1">
        <div className="flex items-start gap-2 justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs md:text-sm text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
            <span>
              {group.title || (isMulti ? 'Interactive Questions' : group.questions[0].question)}
            </span>
            {isMulti && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                {group.questions.length} Questions
              </span>
            )}
          </div>
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0 -mt-1 -mr-1"
              onClick={onSkip}
              title={isMulti ? 'Skip all' : 'Skip question'}
              aria-label="Skip question"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        {group.description && (
          <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed pl-5">
            {group.description}
          </p>
        )}
        {!isMulti && group.questions[0].description && (
          <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed pl-5">
            {group.questions[0].description}
          </p>
        )}
      </div>

      {/* Stacked Questions Form */}
      <div className="space-y-4">
        {group.questions.map((q, idx) => {
          const qAnswer = answers[q.id] || { selectedOptions: [], customText: '' };
          const isRadio = q.type === 'radio';
          const isCheckbox = q.type === 'checkbox';
          const isInputOnly = q.type === 'input';
          const showCustomInput = q.allowCustomInput || isInputOnly || q.type === 'combo';

          return (
            <div
              key={q.id}
              className={cn(
                'space-y-2.5',
                isMulti && 'p-3 rounded-lg bg-muted/20 border border-border/60'
              )}
            >
              {/* Question Label in Multi-mode */}
              {isMulti && (
                <div className="space-y-0.5">
                  <div className="flex items-start gap-2 font-medium text-xs text-foreground">
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>
                  {q.description && (
                    <p className="text-[10px] text-muted-foreground pl-6">{q.description}</p>
                  )}
                </div>
              )}

              {/* Options */}
              {q.options && q.options.length > 0 && (
                <div
                  className="space-y-1.5"
                  role={isRadio ? 'radiogroup' : 'group'}
                  aria-label={q.question}
                >
                  {q.options.map((opt) => {
                    const isSelected = qAnswer.selectedOptions.includes(opt.id);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleOptionToggle(q, opt.id)}
                        role={isRadio ? 'radio' : 'checkbox'}
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            handleOptionToggle(q, opt.id);
                          }
                        }}
                        className={cn(
                          'flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none',
                          isSelected
                            ? 'border-primary bg-primary/10 text-foreground font-medium shadow-xs'
                            : 'border-border/70 bg-background/60 hover:bg-muted/50 hover:border-primary/30 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isCheckbox ? (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleOptionToggle(q, opt.id)}
                              className="pointer-events-none"
                            />
                          ) : (
                            <div
                              className={cn(
                                'w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all',
                                isSelected
                                  ? 'border-primary bg-primary'
                                  : 'border-muted-foreground/40'
                              )}
                            >
                              {isSelected && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs leading-snug">{opt.label}</div>
                          {opt.description && (
                            <div className="text-[10px] text-muted-foreground/80 mt-0.5 leading-tight">
                              {opt.description}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Custom Input */}
              {showCustomInput && (
                <div className="space-y-1">
                  <Input
                    value={qAnswer.customText || ''}
                    onChange={(e) => handleCustomTextChange(q, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canSubmit()) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={
                      q.inputPlaceholder ||
                      (isInputOnly ? 'Type your answer...' : 'Other (Custom input)...')
                    }
                    className="h-8 text-xs bg-background"
                    disabled={disabled}
                  />
                </div>
              )}

              {/* Validation helper label for individual question if applicable */}
              {(q.minSelect || q.maxSelect) && (
                <div className="text-[10px] text-muted-foreground/80 pl-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-muted-foreground/60" />
                  <span>
                    {q.minSelect && q.maxSelect
                      ? `Select ${q.minSelect} - ${q.maxSelect} items`
                      : q.maxSelect
                        ? `Maximum ${q.maxSelect} items`
                        : `Select at least ${q.minSelect} items`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
        <div className="text-[10px] text-muted-foreground">
          {isMulti
            ? `Answered ${answeredCount}/${group.questions.length} questions`
            : group.questions[0].minSelect && group.questions[0].maxSelect
              ? `Select ${group.questions[0].minSelect} - ${group.questions[0].maxSelect} items`
              : group.questions[0].maxSelect
                ? `Maximum ${group.questions[0].maxSelect} items`
                : group.questions[0].minSelect
                  ? `Select at least ${group.questions[0].minSelect} items`
                  : group.questions[0].type === 'radio'
                    ? 'Select 1 item'
                    : ''}
        </div>
        <div className="flex items-center gap-1.5">
          {onSkip && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-foreground"
              onClick={onSkip}
              disabled={disabled}
            >
              {isMulti ? 'Skip all' : 'Skip'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs px-3 gap-1.5 shadow-xs"
            onClick={() => handleSubmit()}
            disabled={!canSubmit()}
          >
            <span>{submitText}</span>
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};
