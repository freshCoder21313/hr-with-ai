import React, { useState } from 'react';
import { useSkillAssessmentStore } from '../stores/useSkillAssessmentStore';
import { generateSubSkills, generateQuiz } from '../services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Search, Check, Loader2, Sparkles, Plus, Code2 } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = extractedSkills.filter((skill) =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        // Fallback mock data when no API key
        setSubSkills([
          'Core Concepts',
          'Best Practices',
          'Problem Solving',
          'Performance Optimization',
          'Integration Patterns',
        ]);

        const mockQuestions = Array.from({ length: quizQuestionCount }, (_, i) => ({
          id: `q-${i}`,
          question: `Mock Question ${i + 1} about ${selectedSkill}`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_answer: 'Option A',
          explanation: 'Detailed explanation will be provided when AI is connected.',
          sub_skill: 'General Knowledge',
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
      const newSkill = manualSkill.trim();
      if (!extractedSkills.includes(newSkill)) {
        setExtractedSkills([newSkill, ...extractedSkills]);
      }
      setSelectedSkill(newSkill);
      setManualSkill('');
      toast.success(`Added ${newSkill} to skills`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-4 md:mt-8 px-4">
      <div className="mb-8 text-center sm:text-left">
        <h2 className="text-3xl font-bold tracking-tight">Select Target Skill</h2>
        <p className="text-muted-foreground mt-2">
          Choose a skill from your resume or add a new one to test your knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Skill Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="h-full border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                Extracted Skills
              </CardTitle>
              <CardDescription>We found these skills in your resume</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/30"
                />
              </div>

              <div className="bg-muted/10 border rounded-xl p-4 min-h-[200px] max-h-[350px] overflow-y-auto">
                <div className="flex flex-wrap gap-2.5">
                  {filteredSkills.map((skill, index) => (
                    <Badge
                      key={index}
                      variant={selectedSkill === skill ? 'default' : 'outline'}
                      className={`cursor-pointer text-sm py-1.5 px-3 flex items-center gap-1.5 transition-all hover:scale-105 ${
                        selectedSkill === skill
                          ? 'shadow-md shadow-primary/20'
                          : 'hover:border-primary/50 hover:bg-primary/5'
                      }`}
                      onClick={() => setSelectedSkill(skill)}
                    >
                      {skill}
                      {selectedSkill === skill && <Check className="w-3.5 h-3.5" />}
                    </Badge>
                  ))}
                  {filteredSkills.length === 0 && (
                    <div className="text-sm text-muted-foreground flex flex-col items-center justify-center w-full py-8">
                      <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
                      <p>No skills found matching &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium mb-2 block">
                  Skill missing? Add manually:
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={manualSkill}
                    onChange={(e) => setManualSkill(e.target.value)}
                    placeholder="e.g. GraphQL, AWS, Figma"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddManualSkill()}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    variant="secondary"
                    onClick={handleAddManualSkill}
                    disabled={!manualSkill.trim() || isLoading}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Configuration & Action */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 shadow-sm sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Assessment Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selected Skill Preview */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">
                  Target Skill
                </p>
                {selectedSkill ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">{selectedSkill}</span>
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">None selected</span>
                )}
              </div>

              {/* Quiz Config */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Number of questions</Label>
                <Select
                  value={quizQuestionCount.toString()}
                  onValueChange={(val) => setQuizQuestionCount(parseInt(val, 10))}
                  disabled={isLoading || !selectedSkill}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions (Quick)</SelectItem>
                    <SelectItem value="10">10 Questions (Standard)</SelectItem>
                    <SelectItem value="15">15 Questions (Thorough)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AI will generate tailored questions based on sub-topics of the selected skill.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <div className="pt-4 border-t mt-4">
                <Button
                  className="w-full h-12 text-base font-medium shadow-md transition-all hover:scale-[1.02]"
                  onClick={handleStartAssessment}
                  disabled={!selectedSkill || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : error ? (
                    'Retry Generating'
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Start Assessment
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
