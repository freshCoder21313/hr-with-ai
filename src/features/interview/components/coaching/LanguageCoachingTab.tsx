import React, { useState, useEffect } from 'react';
import {
  Languages,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowRight,
  HelpCircle,
  Award,
} from 'lucide-react';
import { Interview, CommunicationCoachingReport } from '@/types';
import {
  generateCommunicationReport,
  COACHING_LANGUAGES,
  POPULAR_CUSTOM_LANGUAGES,
  inspectTargetLanguage,
} from '@/services/interview/communicationCoachService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CircularProgressRing } from '@/components/shared/CircularProgressRing';
import { db } from '@/lib/db';
import { toast } from 'sonner';

interface LanguageCoachingTabProps {
  interview: Interview;
  onReportUpdated?: (updatedReport: CommunicationCoachingReport) => void;
}

export const LanguageCoachingTab: React.FC<LanguageCoachingTabProps> = ({
  interview,
  onReportUpdated,
}) => {
  const [report, setReport] = useState<CommunicationCoachingReport | undefined>(
    interview.feedback?.communicationCoach
  );
  const [selectedLangCode, setSelectedLangCode] = useState<string>('en-US');
  const [customLanguage, setCustomLanguage] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [stageText, setStageText] = useState<string>('Bắt đầu phân tích...');
  const [coachingSubTab, setCoachingSubTab] = useState<'bilingual' | 'grammar' | 'fluency'>(
    'bilingual'
  );

  // Sync report when interview prop updates or when component remounts on tab switch
  useEffect(() => {
    if (interview.feedback?.communicationCoach) {
      setReport(interview.feedback.communicationCoach);
      return;
    }
    // Fallback: Check Dexie if props don't have communicationCoach yet
    let isCancelled = false;
    if (interview.id) {
      db.interviews.get(interview.id).then((saved) => {
        if (!isCancelled && saved?.feedback?.communicationCoach) {
          setReport(saved.feedback.communicationCoach);
        }
      });
    }
    return () => {
      isCancelled = true;
    };
  }, [interview.id, interview.feedback?.communicationCoach]);

  const rawTargetLanguage = isCustomMode ? customLanguage : selectedLangCode;
  const targetInspection = inspectTargetLanguage(rawTargetLanguage);
  const activeTargetLanguage = isCustomMode
    ? targetInspection.matchedLanguage || customLanguage.trim() || 'English'
    : selectedLangCode;

  const handleGenerate = async () => {
    if (!targetInspection.isValid) {
      toast.error(targetInspection.warningMessage || 'Vui lòng nhập tên ngôn ngữ đích hợp lệ.');
      return;
    }

    setIsGenerating(true);
    setProgress(12);
    setStageText('Đang trích xuất đối thoại & câu trả lời phỏng vấn...');

    // Incremental progress simulation with meaningful milestones
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 32) {
          setStageText('Đang trích xuất đối thoại & câu trả lời phỏng vấn...');
          return prev + 6;
        } else if (prev < 58) {
          setStageText('Đang phát hiện từ đệm & đo lường nhịp điệu phát biểu...');
          return prev + 4;
        } else if (prev < 82) {
          setStageText(
            `Đang chuyển đổi câu trả lời theo chuẩn STAR & nâng cấp từ vựng (${activeTargetLanguage})...`
          );
          return prev + 3;
        } else if (prev < 94) {
          setStageText('Đang tổng hợp báo cáo ngôn ngữ & hoàn thiện đánh giá...');
          return prev + 1;
        }
        return prev;
      });
    }, 350);

    try {
      const generated = await generateCommunicationReport(interview, activeTargetLanguage);
      clearInterval(progressInterval);
      setProgress(100);
      setStageText('Hoàn tất phân tích!');
      // Brief smooth transition before displaying report
      await new Promise((resolve) => setTimeout(resolve, 300));
      setReport(generated);
      onReportUpdated?.(generated);
      toast.success('Communication & language analysis completed!');
    } catch (err) {
      clearInterval(progressInterval);
      toast.error(err instanceof Error ? err.message : 'Failed to generate coaching report');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setProgress(0);
    }
  };

  if (!report && !isGenerating) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <Languages className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Interview Language & Communication Coach
          </CardTitle>
          <CardDescription className="max-w-xl mx-auto text-muted-foreground mt-1">
            Turn your real interview answers into communication mastery. Identify grammar
            weaknesses, eliminate filler words, and convert your answers into native professional
            responses in any target language.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 max-w-2xl mx-auto">
          {/* Target Language Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Choose Target Practice Language</span>
              <span className="text-xs text-muted-foreground font-normal">
                No limit: Pick a preset or enter any language
              </span>
            </label>

            {/* Language Preset Chips */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Target language options">
              {COACHING_LANGUAGES.map((lang) => {
                const isSelected = !isCustomMode && selectedLangCode === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedLangCode(lang.code);
                      setIsCustomMode(false);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label.split(' ')[0]}</span>
                  </button>
                );
              })}
              <button
                type="button"
                aria-pressed={isCustomMode}
                onClick={() => setIsCustomMode(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isCustomMode
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <span>🌐</span>
                <span>Custom / Other</span>
              </button>
            </div>

            {/* Custom Language Input */}
            {isCustomMode && (
              <div className="pt-2 space-y-2">
                <Input
                  id="custom-target-language"
                  aria-label="Custom target practice language"
                  placeholder="Enter any target language (e.g., Swedish, Russian, Italian, Business Japanese)..."
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  className="bg-card"
                />

                {/* Popular Custom Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Quick picks:</span>
                  {POPULAR_CUSTOM_LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setCustomLanguage(item.code)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <span>{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* Live Validation / Warning Feedback */}
                {customLanguage.trim().length > 0 && (() => {
                  const check = inspectTargetLanguage(customLanguage);
                  if (!check.isValid) {
                    return (
                      <p role="alert" className="text-xs text-destructive flex items-center gap-1.5 pt-0.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {check.warningMessage}
                      </p>
                    );
                  }
                  if (!check.isRecognized) {
                    return (
                      <p role="alert" className="text-xs text-warning flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {check.warningMessage}
                      </p>
                    );
                  }
                  return (
                    <p className="text-xs text-success flex items-center gap-1.5 pt-0.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      Recognized: {check.matchedLanguage}
                    </p>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> What this analysis provides:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Direct translation & executive native-level upgrades formatted with STAR.</li>
              <li>Grammar corrections and professional word choice substitutions.</li>
              <li>Pacing evaluation and filler words detector (à, ừm, basically, like...).</li>
            </ul>
          </div>

          <div className="pt-2 text-center">
            <Button
              size="lg"
              onClick={handleGenerate}
              className="gap-2 font-semibold px-8 shadow-sm"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Language & Communication
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-border shadow-sm p-8 sm:p-12 text-center bg-card">
        <CircularProgressRing
          progress={progress}
          size={148}
          strokeWidth={10}
          title="Đang phân tích phản hồi & ngôn ngữ..."
          subtitle={stageText}
          badge={
            <Badge
              variant="outline"
              className="gap-1.5 px-3 py-1 text-xs border-primary/30 text-primary bg-primary/5 mb-1"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Ngôn ngữ thực hành: {activeTargetLanguage}
            </Badge>
          }
        />
      </Card>
    );
  }

  // Active Report View
  return (
    <div className="space-y-6">
      {/* Unrecognized Language Warning Banner */}
      {report?.isTargetLanguageRecognized === false && (
        <Card className="border-warning/40 bg-warning/10 text-foreground">
          <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-sm font-bold text-warning flex items-center gap-2">
                Không nhận diện được ngôn ngữ: &ldquo;{report.requestedLanguage || 'Tùy chỉnh'}&rdquo;
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {report.unrecognizedLanguageMessage ||
                  'Ngôn ngữ bạn yêu cầu không nằm trong các ngôn ngữ tự nhiên hợp lệ. Hệ thống đã tự động chuyển đổi sang Tiếng Anh (English - US / International) làm ngôn ngữ thực hành thay thế.'}
              </p>
              <div className="pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReport(undefined)}
                  className="gap-1.5 text-xs h-8 border-warning/40 hover:bg-warning/20 text-warning"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Chọn lại ngôn ngữ khác
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Score Card */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-1.5">
                <Languages className="w-3.5 h-3.5" />
                Target Practice: {report?.targetLanguage}
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Communication & Language Coaching Report
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Source: {report?.sourceLanguage} • Analyzed on{' '}
                {new Date(report?.generatedAt || Date.now()).toLocaleDateString()}
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReport(undefined)}
              className="gap-1.5 shrink-0 self-start sm:self-auto text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Change Target Language
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 3 Metric Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Fluency & Flow
              </span>
              <div className="text-3xl font-extrabold text-foreground mt-1">
                {report?.overallScore.fluencyScore}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Vocabulary Range
              </span>
              <div className="text-3xl font-extrabold text-foreground mt-1">
                {report?.overallScore.vocabularyScore}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 text-center">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Professionalism & Executive Tone
              </span>
              <div className="text-3xl font-extrabold text-foreground mt-1">
                {report?.overallScore.professionalismScore}
                <span className="text-sm font-normal text-muted-foreground">/10</span>
              </div>
            </div>
          </div>

          {/* Key Executive Takeaway */}
          {report?.summaryTakeaway && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold text-primary">Executive Feedback: </span>
                {report.summaryTakeaway}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3 Coaching Sub-Tabs */}
      <Tabs
        value={coachingSubTab}
        onValueChange={(v) => setCoachingSubTab(v as 'bilingual' | 'grammar' | 'fluency')}
        className="w-full"
      >
        <div className="w-full overflow-x-auto pb-1 mb-6">
          <TabsList className="bg-muted p-1 w-full sm:w-auto inline-flex justify-start sm:justify-center">
            <TabsTrigger value="bilingual" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">Multilingual Transformation</span>
              <span className="sm:hidden">Transformation</span>
            </TabsTrigger>
            <TabsTrigger value="grammar" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Grammar & Word Choices</span>
              <span className="sm:hidden">Grammar</span>
            </TabsTrigger>
            <TabsTrigger value="fluency" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Delivery & Filler Words</span>
              <span className="sm:hidden">Delivery</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* SUBTAB 1: MULTILINGUAL TRANSFORMATION */}
        <TabsContent value="bilingual" className="space-y-6">
          {report?.turnAnalyses.map((turn) => {
            const trans = turn.languageTransformation;
            return (
              <Card key={turn.questionIndex} className="border-border shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                      Question {turn.questionIndex}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold text-foreground mt-1">
                    {turn.question}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-5 pt-4">
                  {/* Original Answer vs Direct Translation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-lg border border-border bg-card">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Your Original Answer ({report.sourceLanguage.split(' ')[0]})
                      </span>
                      <p className="text-sm text-foreground leading-relaxed italic">
                        &ldquo;{turn.originalAnswer}&rdquo;
                      </p>
                    </div>

                    <div className="p-3.5 rounded-lg border border-border bg-muted/20">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                        Direct Translation ({trans?.targetLanguage.split(' ')[0]})
                      </span>
                      <p className="text-sm text-foreground leading-relaxed">
                        {trans?.directTranslation || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Professional Native Upgrade */}
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Executive / STAR Upgrade ({trans?.targetLanguage})
                      </span>
                    </div>

                    <p className="text-sm text-foreground font-medium leading-relaxed">
                      &ldquo;{trans?.professionalUpgrade}&rdquo;
                    </p>

                    {/* Framework STAR Breakdown */}
                    {trans?.frameworkBreakdown && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-primary/20 text-xs">
                        {trans.frameworkBreakdown.situation && (
                          <div className="p-2 rounded bg-card/60">
                            <span className="font-semibold text-primary">Situation: </span>
                            <span className="text-muted-foreground">
                              {trans.frameworkBreakdown.situation}
                            </span>
                          </div>
                        )}
                        {trans.frameworkBreakdown.task && (
                          <div className="p-2 rounded bg-card/60">
                            <span className="font-semibold text-primary">Task: </span>
                            <span className="text-muted-foreground">
                              {trans.frameworkBreakdown.task}
                            </span>
                          </div>
                        )}
                        {trans.frameworkBreakdown.action && (
                          <div className="p-2 rounded bg-card/60">
                            <span className="font-semibold text-primary">Action: </span>
                            <span className="text-muted-foreground">
                              {trans.frameworkBreakdown.action}
                            </span>
                          </div>
                        )}
                        {trans.frameworkBreakdown.result && (
                          <div className="p-2 rounded bg-card/60">
                            <span className="font-semibold text-primary">Result: </span>
                            <span className="text-muted-foreground">
                              {trans.frameworkBreakdown.result}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Key Vocabulary & Idiomatic Collocations */}
                  {trans?.keyVocabulary && trans.keyVocabulary.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary" /> Key Vocabulary &
                        Collocations to Learn:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {trans.keyVocabulary.map((vocab, vIdx) => (
                          <div
                            key={vIdx}
                            className="p-3 rounded-lg border border-border bg-card space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-foreground">
                                {vocab.term}
                              </span>
                              {vocab.phonetic && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {vocab.phonetic}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{vocab.meaning}</p>
                            <p className="text-xs text-primary/80 italic font-medium pt-0.5">
                              Ex: &ldquo;{vocab.sampleUsage}&rdquo;
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* SUBTAB 2: GRAMMAR & WORD CHOICE REFINEMENT */}
        <TabsContent value="grammar" className="space-y-6">
          {report?.turnAnalyses.map((turn) => (
            <Card key={turn.questionIndex} className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <Badge variant="outline" className="w-fit text-xs">
                  Question {turn.questionIndex}
                </Badge>
                <CardTitle className="text-base font-semibold text-foreground mt-1">
                  {turn.question}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6 pt-4">
                {/* Grammar Issues */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                    Grammar & Syntax Adjustments (
                    {turn.grammarIssues.length > 0 ? turn.grammarIssues.length : 'Clean'})
                  </h4>

                  {turn.grammarIssues.length === 0 ? (
                    <div className="p-3 rounded-lg border border-success/30 bg-success/5 text-xs text-success flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      No notable grammar errors found in this answer.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {turn.grammarIssues.map((issue, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <span className="line-through text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                              {issue.originalSnippet}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded">
                              {issue.correction}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed pl-1">
                            {issue.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vocabulary Upgrades */}
                {turn.vocabularyUpgrades && turn.vocabularyUpgrades.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Elevated Word Substitutions
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {turn.vocabularyUpgrades.map((vocab, vIdx) => (
                        <div
                          key={vIdx}
                          className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through">
                              {vocab.casualWord}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {vocab.professionalAlternative}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{vocab.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* SUBTAB 3: DELIVERY, FILLER WORDS & PACING */}
        <TabsContent value="fluency" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Stats Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Cadence & Word Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border text-sm">
                  <span className="text-muted-foreground">Total Words Spoken:</span>
                  <span className="font-bold text-foreground">
                    {report?.deliveryMetrics.totalWords} words
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border text-sm">
                  <span className="text-muted-foreground">Average Answer Length:</span>
                  <span className="font-bold text-foreground">
                    ~{report?.deliveryMetrics.averageAnswerWordCount} words/turn
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border text-sm">
                  <span className="text-muted-foreground">Hesitant Phrasing (Hedging):</span>
                  <span className="font-bold text-foreground">
                    {report?.deliveryMetrics.hedgingPhrasesCount} instances
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 text-sm">
                  <span className="text-muted-foreground">Pacing Assessment:</span>
                  <Badge
                    variant={
                      report?.deliveryMetrics.pacingAssessment === 'good'
                        ? 'default'
                        : 'secondary'
                    }
                    className="capitalize text-xs font-semibold"
                  >
                    {report?.deliveryMetrics.pacingAssessment === 'good'
                      ? 'Well Balanced'
                      : report?.deliveryMetrics.pacingAssessment.replace('_', ' ')}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Filler Words Card */}
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-warning" />
                  Filler Words Detected
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Frequent crutch words and fillers to consciously reduce.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report?.deliveryMetrics.fillerWords &&
                report.deliveryMetrics.fillerWords.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {report.deliveryMetrics.fillerWords.map((item, idx) => (
                        <div
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning border border-warning/30"
                        >
                          <span>&ldquo;{item.word}&rdquo;</span>
                          <span className="bg-warning/20 px-1.5 py-0.2 rounded-full text-[10px]">
                            {item.count}×
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">Context examples:</p>
                      {report.deliveryMetrics.fillerWords.slice(0, 3).map((item, idx) =>
                        item.contextSnippets.slice(0, 1).map((snippet, sIdx) => (
                          <p key={`${idx}-${sIdx}`} className="italic pl-2 border-l-2 border-warning/40">
                            {snippet}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-success/5 border border-success/30 text-xs text-success flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Clean articulation! No notable filler words detected.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
