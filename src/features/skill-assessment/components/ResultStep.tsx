import React from 'react';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
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
import { CheckCircle, XCircle } from 'lucide-react';

export const ResultStep: React.FC = () => {
  const { quizScore, reset, testAnotherSkill, selectedSkill, quizQuestions, userAnswers } =
    useSkillAssessmentStore();

  return (
    <Card className="max-w-2xl mx-auto mt-10 text-center">
      <CardHeader>
        <CardTitle>Assessment Complete!</CardTitle>
        <CardDescription>Your quick quiz results for {selectedSkill}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <div className="text-6xl font-bold text-primary">{quizScore?.toFixed(0)}%</div>
          <Progress value={quizScore || 0} className="w-full h-4" />
        </div>

        <div className="text-left space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold">Review Answers</h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {quizQuestions.map((q, i) => {
              const userAnswer = userAnswers[q.id];
              const isCorrect = userAnswer === q.correct_answer;
              return (
                <div key={q.id} className="p-4 border rounded-md bg-muted/10">
                  <p className="font-medium mb-3">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div
                      className={`flex items-start gap-2 ${isCorrect ? 'text-green-600 dark:text-green-500' : 'text-destructive'}`}
                    >
                      {isCorrect ? (
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold">Your Answer: </span>
                        {userAnswer || 'Not answered'}
                      </div>
                    </div>
                    {!isCorrect && (
                      <div className="flex items-start gap-2 text-green-600 dark:text-green-500">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Correct Answer: </span>
                          {q.correct_answer}
                        </div>
                      </div>
                    )}
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-muted/50 rounded text-foreground/80 text-xs">
                        <span className="font-semibold">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-muted-foreground text-sm border-t pt-4 text-center">
          Database persistence to Dexie.js and the Interview Deep Dive will be implemented in Phase
          2.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center gap-4 flex-col sm:flex-row">
        <Button onClick={testAnotherSkill} size="lg" className="w-full sm:w-auto">
          Test Another Skill
        </Button>
        <Button onClick={reset} variant="outline" size="lg" className="w-full sm:w-auto">
          Start Over
        </Button>
      </CardFooter>
    </Card>
  );
};
