import React from 'react';
import { useParams } from 'react-router-dom';
import { BarChart2, FileText, Loader2, MessageSquare, Printer } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatArea } from './components/ChatArea';
import SEO from '@/components/shared/SEO';
import { useFeedbackData } from './hooks/useFeedbackData';
import { FeedbackAnalysisPanel } from './components/feedback/FeedbackAnalysisPanel';

const FeedbackView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const {
    interview,
    feedback,
    loading,
    activeTab,
    setActiveTab,
    analysisMap,
    mermaidRef1,
    mermaidRef2,
  } = useFeedbackData(id);

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

  if (!feedback || !interview) {
    return <div className="p-8 text-center text-red-500 dark:text-red-400">Error loading feedback</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-6 md:p-8">
      <SEO
        title={`Feedback: ${interview.jobTitle} - HR With AI`}
        description={`AI detailed feedback for ${interview.jobTitle} at ${interview.company}. Score: ${feedback.score}/10.`}
      />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="analysis" className="gap-2">
              <BarChart2 className="w-4 h-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Transcript
            </TabsTrigger>
          </TabsList>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
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
            interview={interview}
            feedback={feedback}
            mermaidRef1={mermaidRef1}
            mermaidRef2={mermaidRef2}
          />
        </TabsContent>

        <TabsContent value="transcript" className="h-[calc(100vh-200px)] min-h-[500px]">
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
