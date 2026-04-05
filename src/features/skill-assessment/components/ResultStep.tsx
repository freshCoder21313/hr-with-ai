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

export const ResultStep: React.FC = () => {
  const { quizScore, reset, selectedSkill } = useSkillAssessmentStore();

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
        <p className="text-muted-foreground text-sm border-t pt-4">
          Database persistence to Dexie.js and the Interview Deep Dive will be implemented in Phase
          2.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={reset} size="lg">
          Finish & Retake
        </Button>
      </CardFooter>
    </Card>
  );
};
