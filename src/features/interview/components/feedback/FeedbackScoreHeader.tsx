import React from 'react';
import { Building2, Medal, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Interview, InterviewFeedback } from '@/types';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface FeedbackScoreHeaderProps {
  interview: Interview;
  feedback: InterviewFeedback;
}

export const FeedbackScoreHeader: React.FC<FeedbackScoreHeaderProps> = ({
  interview,
  feedback,
}) => {
  const scoreClass =
    feedback.score >= 8
      ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
      : feedback.score >= 6
        ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
        : 'border-red-500 text-red-600 bg-red-50';

  const radarData = [
    { subject: 'Technical', A: feedback.score, fullMark: 10 },
    { subject: 'Culture', A: feedback.cultureFitScore || 5, fullMark: 10 },
    { subject: 'Resilience', A: feedback.resilienceScore || 5, fullMark: 10 },
    { subject: 'Comm', A: feedback.score * 0.9, fullMark: 10 },
    {
      subject: 'Problem Solving',
      A: Math.min(feedback.score * 1.1, 10),
      fullMark: 10,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="border-border shadow-md bg-card md:col-span-2">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Interview Analysis</h1>
            <p className="text-muted-foreground text-lg">
              {interview.jobTitle} @ {interview.company}
            </p>
            <div className="flex gap-2 mt-4 flex-wrap">
              {(feedback.badges || []).map((badge, idx) => (
                <div
                  key={idx}
                  className="flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200"
                >
                  <Medal className="w-3 h-3 mr-1" />
                  {badge}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
                Overall Score
              </p>
            </div>
            <div
              className={`w-24 h-24 rounded-full flex items-center justify-center border-[6px] text-3xl font-bold shadow-sm ${scoreClass}`}
            >
              {feedback.score}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex flex-col justify-center gap-4 p-6 bg-card border-border">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" /> Resilience
            </span>
            <span className="text-purple-600 font-bold">
              {feedback.resilienceScore || 'N/A'}/10
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500"
              style={{ width: `${(feedback.resilienceScore || 0) * 10}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" /> Culture Fit
            </span>
            <span className="text-blue-600 font-bold">{feedback.cultureFitScore || 'N/A'}/10</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${(feedback.cultureFitScore || 0) * 10}%` }}
            />
          </div>
        </div>

        <div className="h-[150px] w-full text-xs">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Radar
                name="Candidate"
                dataKey="A"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
