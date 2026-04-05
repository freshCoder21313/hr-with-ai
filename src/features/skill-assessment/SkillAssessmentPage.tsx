import React from 'react';
import { useSkillAssessmentStore } from './stores/useSkillAssessmentStore';
import { UploadStep } from './components/UploadStep';
import { SelectSkillStep } from './components/SelectSkillStep';
import { QuizStep } from './components/QuizStep';
import { ResultStep } from './components/ResultStep';

const SkillAssessmentPage: React.FC = () => {
  const step = useSkillAssessmentStore((state) => state.step);

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Skill Assessment</h1>
      {step === 'upload' && <UploadStep />}
      {step === 'select_skill' && <SelectSkillStep />}
      {step === 'quiz' && <QuizStep />}
      {step === 'result' && <ResultStep />}
    </div>
  );
};

export default SkillAssessmentPage;
