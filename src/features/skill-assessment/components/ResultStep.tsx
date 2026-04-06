import React, { useMemo } from 'react';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowRight, BrainCircuit, RefreshCw, BarChart2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ResultStep: React.FC = () => {
  const { quizScore, reset, testAnotherSkill, selectedSkill, quizQuestions, userAnswers } =
    useSkillAssessmentStore();
  const navigate = useNavigate();

  // Tính điểm theo từng sub_skill
  const subSkillScores = useMemo(() => {
    const scores: Record<string, { total: number; correct: number }> = {};

    quizQuestions.forEach((q) => {
      const sub = q.sub_skill || 'General';
      if (!scores[sub]) {
        scores[sub] = { total: 0, correct: 0 };
      }
      scores[sub].total += 1;

      if (userAnswers[q.id] === q.correct_answer) {
        scores[sub].correct += 1;
      }
    });

    return Object.entries(scores).map(([name, data]) => ({
      name,
      score: Math.round((data.correct / data.total) * 100),
      total: data.total,
      correct: data.correct,
    }));
  }, [quizQuestions, userAnswers]);

  // Phân loại điểm yếu
  const weaknesses = subSkillScores.filter((s) => s.score < 70);

  const handleDeepDive = () => {
    // Điều hướng qua màn Setup Interview và truyền context (Sẽ xử lý sâu ở Phase 2)
    navigate('/setup');
  };

  return (
    <div className="max-w-5xl mx-auto mt-4 md:mt-8 px-4 pb-12">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Assessment Results</h2>
        <p className="text-muted-foreground mt-2">
          Your quick quiz performance for{' '}
          <span className="font-bold text-primary">{selectedSkill}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Score & Summary */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
            <CardHeader className="pb-2 text-center">
              <CardTitle className="text-lg text-muted-foreground font-medium">
                Overall Score
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-8 pt-4">
              <div className="relative flex items-center justify-center w-40 h-40">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-muted/30"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray="440"
                    strokeDashoffset={440 - (440 * (quizScore || 0)) / 100}
                    className="text-primary transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-primary tracking-tighter">
                    {quizScore?.toFixed(0)}
                    <span className="text-2xl">%</span>
                  </span>
                </div>
              </div>

              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Performance Level:</span>
                  <span className="font-bold">
                    {(quizScore || 0) >= 80
                      ? 'Excellent'
                      : (quizScore || 0) >= 60
                        ? 'Good'
                        : 'Needs Work'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                Sub-skill Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subSkillScores.map((sub, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium truncate pr-4">{sub.name}</span>
                    <span className="font-bold text-primary">{sub.score}%</span>
                  </div>
                  <Progress value={sub.score} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-right">
                    {sub.correct} / {sub.total} correct
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Next Steps & Review */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 2 Teaser / Next Steps */}
          <Card className="border-primary/30 bg-primary/5 shadow-sm">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
              <div className="bg-primary/10 p-4 rounded-full">
                <BrainCircuit className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-xl font-bold">Ready for the Deep Dive?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your quiz results look good. Now let&apos;s test your practical knowledge. Our AI
                  Interviewer will ask you open-ended questions specifically targeting your
                  weaknesses in{' '}
                  <span className="font-semibold">
                    {weaknesses.map((w) => w.name).join(', ') || selectedSkill}
                  </span>
                  .
                </p>
              </div>
              <Button onClick={handleDeepDive} className="shrink-0 group">
                Start Interview{' '}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button onClick={testAnotherSkill} variant="outline" className="gap-2 bg-background">
              <RefreshCw className="w-4 h-4" /> Test Another Skill
            </Button>
            <Button onClick={reset} variant="ghost" className="gap-2">
              Start Over
            </Button>
          </div>

          {/* Answer Review */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Detailed Answer Review</CardTitle>
              <CardDescription>Review your mistakes to learn and improve.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quizQuestions.map((q, i) => {
                  const userAnswer = userAnswers[q.id];
                  const isCorrect = userAnswer === q.correct_answer;
                  return (
                    <div
                      key={q.id}
                      className={`p-5 border rounded-xl transition-colors ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-destructive/20 bg-destructive/5'}`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="mt-0.5">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground leading-snug">
                            {i + 1}. {q.question}
                          </p>
                          <span className="inline-block mt-2 text-xs font-medium bg-background px-2 py-0.5 rounded border text-muted-foreground">
                            {q.sub_skill || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="pl-8 space-y-3 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 bg-background rounded-lg border">
                            <span className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                              Your Answer
                            </span>
                            <span
                              className={
                                isCorrect
                                  ? 'text-green-600 dark:text-green-400 font-medium'
                                  : 'text-destructive font-medium'
                              }
                            >
                              {userAnswer || 'Not answered'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                              <span className="block text-xs font-semibold uppercase text-green-600/80 dark:text-green-400/80 mb-1">
                                Correct Answer
                              </span>
                              <span className="text-green-700 dark:text-green-400 font-medium">
                                {q.correct_answer}
                              </span>
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <div className="mt-4 p-4 bg-muted/30 rounded-lg text-foreground/90 border border-border/50">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground mb-2">
                              <BrainCircuit className="w-3.5 h-3.5" /> Explanation
                            </span>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    </div>
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
