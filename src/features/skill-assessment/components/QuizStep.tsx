import React, { useState } from 'react';
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

export const QuizStep: React.FC = () => {
  const { quizQuestions, userAnswers, answerQuestion, calculateScore } = useSkillAssessmentStore();
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
    <Card className="max-w-3xl mx-auto mt-10">
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>
            Question {currentIndex + 1} of {totalCount}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {answeredCount} / {totalCount} answered
          </span>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <CardDescription className="text-lg font-medium text-foreground mt-2">
          {question.question}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {question.options.map((option, index) => (
            <label
              key={index}
              className={`flex items-center space-x-3 border rounded-md p-4 cursor-pointer transition-colors ${userAnswers[question.id] === option ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option}
                checked={userAnswers[question.id] === option}
                onChange={(e) => handleAnswer(e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="flex-1 cursor-pointer font-normal text-base">{option}</span>
            </label>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between mt-6">
        <Button variant="outline" onClick={handlePrev} disabled={isFirstQuestion}>
          Previous
        </Button>
        {isLastQuestion ? (
          <Button onClick={handleSubmit} disabled={!isAllAnswered}>
            Submit Assessment
          </Button>
        ) : (
          <Button onClick={handleNext} disabled={!userAnswers[question.id]}>
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
