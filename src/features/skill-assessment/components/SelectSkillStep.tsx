import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { useSkillAssessmentStore } from '@/features/skill-assessment/stores/useSkillAssessmentStore';
import {
  generateSubSkills,
  generateQuiz,
} from '@/features/skill-assessment/services/skillAssessmentAiService';
import { getStoredAIConfig } from '@/services/ai/aiConfigService';
import { isNonEmptyString } from '@/lib/validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Check, Loader2, Sparkles, Plus, Code2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { openApiKeyModal, subscribeToApiKeyModal } from '@/events/apiKeyEvents';

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
  const [hasApiKey, setHasApiKey] = useState(() => !!getStoredAIConfig().apiKey);

  // The API key modal can be closed from anywhere, so re-check on every open.
  useEffect(() => subscribeToApiKeyModal(() => setHasApiKey(!!getStoredAIConfig().apiKey)), []);

  const isApiKeyMissing = !hasApiKey;

  const filteredSkills = extractedSkills.filter((skill) =>
    skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartAssessment = async () => {
    if (!selectedSkill) {
      toast.error('Please select a skill to continue');
      return;
    }

    const config = getStoredAIConfig();

    if (!config.apiKey) {
      openApiKeyModal();
      toast.error('Please configure an AI API key to start a real assessment.');
      // The quiz is scored against a real answer key, so there is nothing to
      // fall back to: block instead of faking a score the user would believe.
      setError(
        'An AI API key is required to generate a real assessment. Add one to continue.'
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const subSkills = await generateSubSkills(selectedSkill, config);
      setSubSkills(subSkills);

      const questions = await generateQuiz(selectedSkill, subSkills, quizQuestionCount, config);
      if (!questions || questions.length === 0) {
        throw new Error('Failed to generate quiz questions');
      }

      setQuizQuestions(questions);
      setStep('quiz');
    } catch (err) {
      logger.error(err);
      setError(err instanceof Error ? err.message : 'Failed to initialize assessment');
    } finally {
      setIsLoading(false);
    }
  };


  const handleAddManualSkill = () => {
    const newSkill = manualSkill.trim();

    if (!isNonEmptyString(newSkill)) {
      return;
    }

    const normalizedNewSkill = newSkill.toLowerCase();
    const alreadyExists = extractedSkills.some(
      (skill) => skill.trim().toLowerCase() === normalizedNewSkill
    );

    if (!alreadyExists) {
      setExtractedSkills([newSkill, ...extractedSkills]);
      toast.success(`Added ${newSkill} to skills`);
    }

    setSelectedSkill(newSkill);
    setManualSkill('');
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
                    <button
                      key={index}
                      type="button"
                      aria-pressed={selectedSkill === skill}
                      disabled={isLoading}
                      className={cn(
                        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors hover:scale-105',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        'disabled:pointer-events-none disabled:opacity-50',
                        selectedSkill === skill
                          ? 'border-transparent bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                      )}
                      onClick={() => setSelectedSkill(skill)}
                    >
                      {skill}
                      {selectedSkill === skill && <Check className="w-3.5 h-3.5" />}
                    </button>
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
                    disabled={!isNonEmptyString(manualSkill) || isLoading}
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
                    <SelectItem value="0">Auto (Let AI decide based on skill)</SelectItem>
                    <SelectItem value="5">5 Questions (Quick)</SelectItem>
                    <SelectItem value="10">10 Questions (Standard)</SelectItem>
                    <SelectItem value="15">15 Questions (Thorough)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  AI will generate tailored questions based on sub-topics of the selected skill.
                </p>
              </div>

              {isApiKeyMissing && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 space-y-2"
                >
                  <p className="font-medium">
                    An AI API key is required to generate and score a real assessment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => openApiKeyModal()}
                  >
                    <KeyRound className="w-4 h-4 mr-1" /> Configure API Key
                  </Button>
                </div>
              )}

              {error && !isApiKeyMissing && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20"
                >
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
                {!selectedSkill && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Select a skill from the list or add your own to continue.
                  </p>
                )}
                {isApiKeyMissing && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    We can&apos;t show a score without real questions, so the quiz stays locked
                    until a key is configured.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
