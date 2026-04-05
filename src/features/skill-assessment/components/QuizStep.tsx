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

  const handleSubmit = () => {
    calculateScore();
  };

  if (!question) return <div>Loading...</div>;

  return (
    <Card className="max-w-3xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>
          Question {currentIndex + 1} of {quizQuestions.length}
        </CardTitle>
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
                onChange={(e) => answerQuestion(question.id, e.target.value)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className="flex-1 cursor-pointer font-normal text-base">{option}</span>
            </label>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={handlePrev} disabled={isFirstQuestion}>
          Previous
        </Button>
        {isLastQuestion ? (
          <Button onClick={handleSubmit} disabled={!userAnswers[question.id]}>
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
