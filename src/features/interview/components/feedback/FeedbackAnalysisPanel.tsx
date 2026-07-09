import React, { RefObject } from 'react';
import { AlertCircle, BarChart2, BookOpen, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InterviewFeedback } from '@/types';
import { FeedbackScoreHeader } from './FeedbackScoreHeader';
import { Interview } from '@/types';

interface FeedbackAnalysisPanelProps {
  interview: Interview;
  feedback: InterviewFeedback;
  mermaidRef1: RefObject<HTMLDivElement>;
  mermaidRef2: RefObject<HTMLDivElement>;
}

export const FeedbackAnalysisPanel: React.FC<FeedbackAnalysisPanelProps> = ({
  interview,
  feedback,
  mermaidRef1,
  mermaidRef2,
}) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
    <FeedbackScoreHeader interview={interview} feedback={feedback} />

    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed text-lg">{feedback.summary}</p>
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            Current Performance Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={mermaidRef1}
            className="overflow-x-auto flex justify-center py-4 bg-muted/50 rounded-lg min-h-[200px] items-center"
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            Potential & Improvement Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={mermaidRef2}
            className="overflow-x-auto flex justify-center py-4 bg-muted/50 rounded-lg min-h-[200px] items-center"
          />
        </CardContent>
      </Card>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-emerald-500/10 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center text-emerald-800 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 mr-2" /> Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {feedback.strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start text-emerald-700 dark:text-emerald-100 text-sm"
              >
                <span className="mr-2 text-emerald-800 dark:text-emerald-400 font-bold">•</span>
                {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <Card className="bg-red-500/10 border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center text-red-800 dark:text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" /> Areas for Improvement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start text-red-700 dark:text-red-100 text-sm">
                <span className="mr-2 text-red-800 dark:text-red-400 font-bold">•</span> {w}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>

    {feedback.recommendedResources && feedback.recommendedResources.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Recommended Learning Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedback.recommendedResources.map((res, idx) => (
              <a
                key={idx}
                href={`https://www.google.com/search?q=${encodeURIComponent(res.searchQuery)}`}
                target="_blank"
                rel="noreferrer"
                className="group block p-4 rounded-lg border border-border hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left"
              >
                <h4 className="font-semibold text-foreground mb-1 group-hover:text-purple-500 flex items-center justify-between text-sm">
                  {res.topic}
                  <ExternalLink
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{res.description}</p>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    )}

    <Card>
      <CardHeader className="bg-muted/30 border-b border-border">
        <CardTitle>Key Question Analysis</CardTitle>
      </CardHeader>
      <div className="divide-y divide-border">
        {feedback.keyQuestionAnalysis.map((item, idx) => (
          <div key={idx} className="p-6">
            <p className="font-medium text-foreground mb-3 text-lg">Q: {item.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-sm text-foreground bg-muted p-4 rounded-lg border border-border">
                <span className="font-semibold block mb-2 text-foreground uppercase text-xs tracking-wider">
                  Analysis
                </span>
                {item.analysis}
              </div>
              <div className="text-sm text-blue-900 dark:text-blue-100 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                <span className="font-semibold block mb-2 text-blue-700 dark:text-blue-300 uppercase text-xs tracking-wider">
                  Better Approach
                </span>
                {item.improvement}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);
