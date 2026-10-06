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
import { buildRadarData } from './radarData';

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
      ? 'border-success text-success bg-success/10'
      : feedback.score >= 6
        ? 'border-warning text-warning bg-warning/10'
        : 'border-destructive text-destructive bg-destructive/10';

  const radarData = buildRadarData(feedback);
  const hasRadarData = radarData.length >= 3;

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
                  className="flex items-center px-3 py-1 bg-warning/15 text-warning rounded-full text-xs font-bold border border-warning/30"
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
              <Zap className="w-4 h-4 text-primary" /> Resilience
            </span>
            <span className="text-primary font-bold">{feedback.resilienceScore || 'N/A'}/10</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${(feedback.resilienceScore || 0) * 10}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-info" /> Culture Fit
            </span>
            <span className="text-info font-bold">{feedback.cultureFitScore || 'N/A'}/10</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-info"
              style={{ width: `${(feedback.cultureFitScore || 0) * 10}%` }}
            />
          </div>
        </div>

        {hasRadarData && (
          <div className="h-[150px] w-full text-xs" data-testid="feedback-radar">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                <Radar
                  name="Candidate"
                  dataKey="A"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!hasRadarData && (
          <p className="text-sm text-muted-foreground">
            Not enough scored dimensions to chart a profile yet.
          </p>
        )}
      </Card>
    </div>
  );
};
