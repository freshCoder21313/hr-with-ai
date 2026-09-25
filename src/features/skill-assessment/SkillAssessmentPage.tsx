import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/core/notificationService';
import { useSkillAssessmentStore } from './stores/useSkillAssessmentStore';
import { AssessmentStep } from './types';
import { UploadStep } from './components/UploadStep';
import { SelectSkillStep } from './components/SelectSkillStep';
import { QuizStep } from './components/QuizStep';
import { ResultStep } from './components/ResultStep';

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'select_skill', label: 'Select Skill' },
  { key: 'quiz', label: 'Quiz' },
  { key: 'result', label: 'Results' },
] as const;

const SkillAssessmentPage: React.FC = () => {
  const step = useSkillAssessmentStore((state) => state.step);
  const setStep = useSkillAssessmentStore((state) => state.setStep);
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  const handleStepClick = async (targetStep: AssessmentStep, targetIndex: number) => {
    if (targetIndex >= currentIndex) return;
    if (step === 'quiz') {
      const confirmed = await notificationService.confirm({
        title: 'Leave quiz?',
        message: 'Progress will be lost.',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }
    setStep(targetStep);
  };
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-8 text-center tracking-tight text-foreground">Skill Assessment</h1>
      <div className="mx-auto mb-8 flex max-w-2xl items-start">
        {STEPS.map((s, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          return (
            <React.Fragment key={s.key}>
              <div
                className={cn(
                  'flex flex-col items-center gap-1.5',
                  isCompleted && 'cursor-pointer group'
                )}
                onClick={() => isCompleted && handleStepClick(s.key, i)}
                role={isCompleted ? 'button' : undefined}
                tabIndex={isCompleted ? 0 : undefined}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    isActive || isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                    isCompleted && 'group-hover:opacity-80'
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium',
                    isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground',
                    isCompleted && 'group-hover:underline'
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mt-4 h-0.5 flex-1 rounded-full transition-colors',
                    i < currentIndex ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {step === 'upload' && <UploadStep />}
      {step === 'select_skill' && <SelectSkillStep />}
      {step === 'quiz' && <QuizStep />}
      {step === 'result' && <ResultStep />}
    </div>
  );
};

export default SkillAssessmentPage;
