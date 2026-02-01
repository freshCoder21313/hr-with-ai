import React from 'react';
import { ResumeAnalysis } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';

interface ResumeAnalysisViewProps {
  analysis: ResumeAnalysis;
  onClose?: () => void;
}

const ResumeAnalysisView: React.FC<ResumeAnalysisViewProps> = ({ analysis }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-600 dark:bg-green-500';
    if (score >= 50) return 'bg-yellow-600 dark:bg-yellow-500';
    return 'bg-red-600 dark:bg-red-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-l-4 border-l-blue-500 shadow-md bg-card">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                Resume Fit Analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                AI-powered analysis of your resume against the job description.
              </CardDescription>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold ${getScoreColor(analysis.matchScore)}`}>
                {analysis.matchScore}%
              </span>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Match Score
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Progress
              value={analysis.matchScore}
              className={`h-2 ${getProgressColor(analysis.matchScore)}`}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground italic border-l-2 border-border pl-4 py-1 mb-4 bg-muted/50 rounded-r-md">
            &quot;{analysis.summary}&quot;
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Missing Keywords */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Missing Keywords
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.missingKeywords.length > 0 ? (
                  analysis.missingKeywords.map((keyword, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/20"
                    >
                      {keyword}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No critical missing keywords found. Great job!
                  </span>
                )}
              </div>
            </div>

            {/* Improvements */}
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Suggested Improvements
              </h4>
              <ul className="space-y-2">
                {analysis.improvements.map((imp, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-foreground flex items-start gap-2 bg-emerald-500/5 p-2 rounded border border-emerald-500/10"
                  >
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {imp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeAnalysisView;
