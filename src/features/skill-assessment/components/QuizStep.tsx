import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Lightbulb,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { notificationService } from '@/services/core/notificationService';
import { useGenerateQuiz } from '@/features/skill-assessment/hooks/useGenerateQuiz';

export const QuizStep: React.FC = () => {
  const {
    quizQuestions,
    userAnswers,
    answerQuestion,
    calculateScore,
    selectedSkill,
    clearQuiz,
    setStep,
    isLoading,
    error,
    setError,
  } = useSkillAssessmentStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [justSelectedOption, setJustSelectedOption] = useState<string | null>(null);
  // The 900ms auto-advance is owned here so manual navigation and unmount can
  // cancel it; otherwise it fires later and skips a question nobody chose.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { generate } = useGenerateQuiz();

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);
  // A Radix Tooltip is hover-only, so the hint is unreachable by touch. An
  // inline disclosure is operable by mouse, keyboard and screen reader alike.
  const [hintOpen, setHintOpen] = useState(false);
  const hintId = useId();

  const question = quizQuestions[currentIndex];
  const isLastQuestion = currentIndex === quizQuestions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  const goToQuestion = useCallback(
    (index: number) => {
      clearAdvanceTimer();
      setJustSelectedOption(null);
      setCurrentIndex(index);
    },
    [clearAdvanceTimer]
  );

  const handleNext = () => {
    if (!isLastQuestion) goToQuestion(currentIndex + 1);
  };

  const handlePrev = () => {
    if (!isFirstQuestion) goToQuestion(currentIndex - 1);
  };

  const handleAnswer = (option: string) => {
    clearAdvanceTimer();
    // Only auto-advance if the question was previously unanswered
    const isNewAnswer = !userAnswers[question.id];
    setJustSelectedOption(option);
    answerQuestion(question.id, option);

    if (!isLastQuestion && isNewAnswer) {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        goToQuestion(currentIndex + 1);
      }, 900);
    } else {
      advanceTimer.current = setTimeout(() => {
        advanceTimer.current = null;
        setJustSelectedOption(null);
      }, 900);
    }
  };

  const handleBackToSkills = async () => {
    // With no questions on screen there is no progress to lose, so an escape
    // hatch must not sit behind a confirmation the user has to reason about.
    const confirmed =
      quizQuestions.length === 0 ||
      (await notificationService.confirm({
        title: 'Leave quiz?',
        message: 'Progress will be lost.',
        variant: 'destructive',
      }));
    if (confirmed) {
      clearQuiz();
      setStep('select_skill');
    }
  };

  const handleSubmit = () => {
    calculateScore();
  };

  // No question is a legitimate outcome (generation failed or came back empty),
  // so it needs a way out instead of an endless busy spinner.
  if (!question) {
    if (isLoading) {
      return (
        <div
          role="status"
          aria-busy="true"
          className="flex flex-col items-center justify-center gap-3 max-w-6xl mx-auto mt-4 md:mt-8 px-4 min-h-[40dvh]"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading questions…</span>
          <span aria-hidden="true" className="text-sm text-muted-foreground">
            Loading questions…
          </span>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-4 max-w-6xl mx-auto mt-4 md:mt-8 px-4 min-h-[40dvh] text-center"
      >
        <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">No questions are available</p>
          <p className="text-sm text-muted-foreground">
            {error ?? 'The AI returned an empty question set for this skill.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackToSkills} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Skills
          </Button>
          <Button
            onClick={() => {
              setError(null);
              if (selectedSkill) void generate(selectedSkill);
            }}
            disabled={isLoading || !selectedSkill}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = quizQuestions.length;
  const progress = (answeredCount / totalCount) * 100;
  const isAllAnswered = answeredCount === totalCount;

  return (
    <div className="max-w-6xl mx-auto mt-4 md:mt-8 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content: Question Card */}
        <div className="lg:col-span-3">
          <Card className="h-full flex flex-col shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToSkills}
                    className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Skills
                  </Button>
                </div>
                <div className="text-sm font-medium bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">
                  {question.sub_skill || 'General'}
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Question {currentIndex + 1}
                  <span className="text-muted-foreground text-lg font-normal ml-2">
                    / {totalCount}
                  </span>
                </CardTitle>
                {selectedSkill && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {selectedSkill}
                  </span>
                )}
              </div>
              <Progress value={progress} className="h-2 mb-6 bg-muted" />
              <div className="mt-4 pr-0">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-xl font-medium text-foreground leading-relaxed">
                    {question.question}
                  </p>
                  {question.hint && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Show hint"
                      aria-expanded={hintOpen}
                      aria-controls={hintId}
                      onClick={() => setHintOpen((open) => !open)}
                      className="shrink-0 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-100/50"
                    >
                      <Lightbulb className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {question.hint && hintOpen && (
                  <div
                    id={hintId}
                    className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-foreground"
                  >
                    <span className="mr-1 font-semibold text-amber-700 dark:text-amber-300">
                      Hint:
                    </span>
                    {question.hint}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4 pt-2">
                {question.options.map((option, index) => {
                  const isSelected = userAnswers[question.id] === option;
                  const isRecentlyChosen = justSelectedOption === option;
                  return (
                    <label
                      key={index}
                      className={`flex items-center space-x-4 border rounded-xl p-5 cursor-pointer transition-all duration-300 group ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border hover:bg-muted/50 hover:border-primary/30'
                      } ${
                        isRecentlyChosen ? 'ring-2 ring-primary ring-offset-2 scale-[1.005]' : ''
                      } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2`}
                    >
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded-full border transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground group-hover:border-primary/50'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={isSelected}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="sr-only"
                      />
                      <span className="flex-1 cursor-pointer font-normal text-[1.05rem] leading-snug">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center mt-6 pt-6 border-t border-border/50">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={isFirstQuestion}
                className="gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              {isLastQuestion ? (
                <Button onClick={handleSubmit} disabled={!isAllAnswered} className="gap-2">
                  Submit Assessment <Play className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={!userAnswers[question.id]} className="gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar: Navigation & Context */}
        <div className="lg:col-span-1 space-y-6">
          {/* Context Card */}
          <Card className="bg-muted/30 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Assessment Context</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Target Skill
                  </p>
                  <p className="font-medium text-primary bg-primary/10 inline-block px-2 py-1 rounded-md">
                    {selectedSkill}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                    Status
                  </p>
                  <p className="text-sm font-medium">
                    {answeredCount} of {totalCount} Answered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Grid */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Question Navigator</CardTitle>
              <CardDescription>Jump to any question</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {quizQuestions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isCurrent = currentIndex === idx;

                  let btnClass = 'h-10 w-full p-0 font-medium transition-all ';
                  if (isCurrent) {
                    btnClass +=
                      'ring-2 ring-primary ring-offset-2 ring-offset-background bg-background text-foreground hover:bg-muted';
                  } else if (isAnswered) {
                    btnClass += 'bg-primary/10 text-primary hover:bg-primary/20 border-transparent';
                  } else {
                    btnClass +=
                      'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent';
                  }

                  return (
                    <Button
                      key={q.id}
                      variant="outline"
                      className={btnClass}
                      onClick={() => goToQuestion(idx)}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
