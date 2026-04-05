import React, { useState } from 'react';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
import { generateSubSkills, generateQuiz } from '../services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const SelectSkillStep: React.FC = () => {
  const {
    extractedSkills,
    selectedSkill,
    setSelectedSkill,
    quizQuestionCount,
    setQuizQuestionCount,
    setSubSkills,
    setQuizQuestions,
    setStep,
    setIsLoading,
    setError,
    isLoading,
    error,
    setExtractedSkills,
  } = useSkillAssessmentStore();

  const [manualSkill, setManualSkill] = useState('');

  const handleStartAssessment = async () => {
    if (!selectedSkill) {
      toast.error('Please select a skill to continue');
      return;
    }

      try {
        setIsLoading(true);
        setError(null);
        const config = getStoredAIConfig();
        
        if (!config?.apiKey) {
          // Khi không có API key thì dùng danh sách sub skill cứng mặc định
          setSubSkills([
            'Core Concepts',
            'Best Practices',
            'Problem Solving',
            'Performance Optimization',
            'Integration Patterns'
          ]);
          
          // Giả lập câu hỏi trắc nghiệm đơn giản không cần AI
          const mockQuestions = Array.from({ length: quizQuestionCount }, (_, i) => ({
            id: `q-${i}`,
            question: `Câu hỏi ${i + 1} về ${selectedSkill}`,
            options: ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
            correct_answer: 'Đáp án A',
            explanation: 'Giải thích chi tiết sẽ được cập nhật khi có kết nối AI',
            sub_skill: 'General Knowledge'
          }));
          
          setQuizQuestions(mockQuestions);
          setStep('quiz');
          return;
        }

        const subSkills = await generateSubSkills(selectedSkill, config);
        setSubSkills(subSkills);

        const questions = await generateQuiz(selectedSkill, subSkills, quizQuestionCount, config);
      if (!questions || questions.length === 0) {
        throw new Error('Failed to generate quiz questions');
      }

      setQuizQuestions(questions);
      setStep('quiz');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to initialize assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddManualSkill = () => {
    if (manualSkill.trim()) {
      setExtractedSkills([...extractedSkills, manualSkill.trim()]);
      setSelectedSkill(manualSkill.trim());
      setManualSkill('');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Select a Skill</CardTitle>
        <CardDescription>Choose a skill to test or enter a new one.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Extracted Skills</Label>
          <div className="flex flex-wrap gap-2">
            {extractedSkills.map((skill, index) => (
              <Badge
                key={index}
                variant={selectedSkill === skill ? 'default' : 'secondary'}
                className="cursor-pointer text-sm py-1.5 px-3"
                onClick={() => setSelectedSkill(skill)}
              >
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Label>Skill not listed? Add manually:</Label>
          <div className="flex gap-2">
            <Input
              value={manualSkill}
              onChange={(e) => setManualSkill(e.target.value)}
              placeholder="e.g. Python, Docker, UI/UX Design"
              onKeyDown={(e) => e.key === 'Enter' && handleAddManualSkill()}
              disabled={isLoading}
            />
            <Button
              variant="outline"
              onClick={handleAddManualSkill}
              disabled={!manualSkill.trim() || isLoading}
            >
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t">
          <Label>Quiz Configuration</Label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Number of questions:</span>
            <Select
              value={quizQuestionCount.toString()}
              onValueChange={(val) => setQuizQuestionCount(parseInt(val, 10))}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleStartAssessment}
          disabled={!selectedSkill || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Assessment...
            </>
          ) : error ? (
            'Retry Generating'
          ) : (
            'Start Assessment'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
