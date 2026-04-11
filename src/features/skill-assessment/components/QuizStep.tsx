import React, { useState } from 'react';
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
import { ChevronLeft, ChevronRight, Play, Lightbulb } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const QuizStep: React.FC = () => {
  const { quizQuestions, userAnswers, answerQuestion, calculateScore, selectedSkill } =
    useSkillAssessmentStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  const question = quizQuestions[currentIndex];
  const isLastQuestion = currentIndex === quizQuestions.length - 1;
  const isFirstQuestion = currentIndex === 0;

  const handleNext = () => {
    if (!isLastQuestion) setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (!isFirstQuestion) setCurrentIndex((prev) => prev - 1);
  };

  const handleAnswer = (option: string) => {
    // Only auto-advance if the question was previously unanswered
    const isNewAnswer = !userAnswers[question.id];
    answerQuestion(question.id, option);

    if (!isLastQuestion && isNewAnswer) {
      setTimeout(() => {
        handleNext();
      }, 500);
    }
  };

  const handleSubmit = () => {
    calculateScore();
  };

  if (!question) return <div>Loading...</div>;

  const answeredCount = Object.keys(userAnswers).length;
  const totalCount = quizQuestions.length;
  const progress = (answeredCount / totalCount) * 100;
  const isAllAnswered = answeredCount === totalCount;

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto mt-4 md:mt-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content: Question Card */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col shadow-sm border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    Question {currentIndex + 1}
                    <span className="text-muted-foreground text-lg font-normal ml-2">
                      / {totalCount}
                    </span>
                  </CardTitle>
                  <div className="text-sm font-medium bg-muted/50 px-3 py-1 rounded-full text-muted-foreground">
                    {question.sub_skill || 'General'}
                  </div>
                </div>
                <Progress value={progress} className="h-2 mb-6 bg-muted" />
                <CardDescription className="text-xl font-medium text-foreground mt-4 leading-relaxed relative pr-8">
                  {question.question}
                  {question.hint && (
                    <div className="absolute right-0 top-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-amber-500 hover:text-amber-600 hover:bg-amber-100/50"
                          >
                            <Lightbulb className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          className="max-w-xs bg-amber-500 text-white border-none"
                          side="bottom"
                        >
                          <p className="font-medium text-sm">Hint</p>
                          <p className="text-xs">{question.hint}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-4 pt-2">
                  {question.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center space-x-4 border rounded-xl p-5 cursor-pointer transition-all duration-200 group ${
                        userAnswers[question.id] === option
                          ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                          : 'border-border hover:bg-muted/50 hover:border-primary/30'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded-full border ${userAnswers[question.id] === option ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground group-hover:border-primary/50'}`}
                      >
                        {userAnswers[question.id] === option && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={option}
                        checked={userAnswers[question.id] === option}
                        onChange={(e) => handleAnswer(e.target.value)}
                        className="hidden"
                      />
                      <span className="flex-1 cursor-pointer font-normal text-[1.05rem] leading-snug">
                        {option}
                      </span>
                    </label>
                  ))}
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
                  <Button
                    onClick={handleNext}
                    disabled={!userAnswers[question.id]}
                    className="gap-2"
                  >
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
                      btnClass +=
                        'bg-primary/10 text-primary hover:bg-primary/20 border-transparent';
                    } else {
                      btnClass +=
                        'bg-muted/50 text-muted-foreground hover:bg-muted border-transparent';
                    }

                    return (
                      <Button
                        key={q.id}
                        variant="outline"
                        className={btnClass}
                        onClick={() => setCurrentIndex(idx)}
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
    </TooltipProvider>
  );
};
