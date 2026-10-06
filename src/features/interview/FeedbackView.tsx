import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart2,
  FileText,
  Languages,
  Loader2,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatArea } from './components/ChatArea';
import SEO from '@/components/shared/SEO';
import { useFeedbackData } from './hooks/useFeedbackData';
import { FeedbackAnalysisPanel } from './components/feedback/FeedbackAnalysisPanel';
import { LanguageCoachingTab } from './components/coaching/LanguageCoachingTab';

const FeedbackView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    interview,
    setInterview,
    feedback,
    setFeedback,
    loading,
    error,
    activeTab,
    setActiveTab,
    analysisMap,
    mermaidRef1,
    mermaidRef2,
  } = useFeedbackData(id);

  const currentInterview = React.useMemo(() => {
    if (!interview) return null;
    return {
      ...interview,
      feedback: feedback ?? interview.feedback,
    };
  }, [interview, feedback]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin" />
        <p className="text-muted-foreground font-medium text-lg">
          AI is analyzing your performance...
        </p>
        <p className="text-muted-foreground">Generating comprehensive report & visualization</p>
      </div>
    );
  }

  if (error || !feedback || !interview || !currentInterview) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Feedback unavailable</h2>
          <p className="text-sm text-muted-foreground">{error ?? 'Error loading feedback'}</p>
        </div>
        <Button onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto space-y-8 pb-24 md:pb-12 p-4 md:p-8">
      <SEO
        title={`Feedback: ${interview.jobTitle} - HR With AI`}
        description={`AI detailed feedback for ${interview.jobTitle} at ${interview.company}. Score: ${feedback.score}/10.`}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 print:hidden">
          <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <TabsList className="bg-muted p-1 w-full sm:w-auto inline-flex justify-start sm:justify-center">
              <TabsTrigger value="analysis" className="gap-2 text-xs sm:text-sm">
                <BarChart2 className="w-4 h-4" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="coaching" className="gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">Language & Delivery Coach</span>
                <span className="sm:hidden">Language Coach</span>
              </TabsTrigger>
              <TabsTrigger value="transcript" className="gap-2 text-xs sm:text-sm">
                <MessageSquare className="w-4 h-4" />
                Transcript
              </TabsTrigger>
            </TabsList>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 self-end sm:self-auto shrink-0"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                Save as PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print or Save as PDF</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <TabsContent value="analysis">
          <FeedbackAnalysisPanel
            interview={currentInterview}
            feedback={feedback}
            mermaidRef1={mermaidRef1}
            mermaidRef2={mermaidRef2}
          />
        </TabsContent>

        <TabsContent value="coaching">
          <LanguageCoachingTab
            interview={currentInterview}
            onReportUpdated={(updatedReport) => {
              setFeedback((prev) =>
                prev ? { ...prev, communicationCoach: updatedReport } : prev
              );
              setInterview((prev) =>
                prev
                  ? {
                      ...prev,
                      feedback: prev.feedback
                        ? { ...prev.feedback, communicationCoach: updatedReport }
                        : {
                            score: 7,
                            summary: 'Interview feedback',
                            strengths: [],
                            weaknesses: [],
                            keyQuestionAnalysis: [],
                            mermaidGraphCurrent: '',
                            mermaidGraphPotential: '',
                            recommendedResources: [],
                            communicationCoach: updatedReport,
                          },
                    }
                  : prev
              );
            }}
          />
        </TabsContent>

        <TabsContent value="transcript" className="h-[calc(100dvh-200px)] min-h-[500px]">
          <Card className="h-full border-none shadow-md overflow-hidden flex flex-col bg-card">
            <CardHeader className="border-b bg-muted/30 py-4 shrink-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Review Transcript
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <ChatArea messages={interview.messages} analysisMap={analysisMap} />
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeedbackView;
