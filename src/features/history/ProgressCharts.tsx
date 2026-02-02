import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Interview } from '@/types';
import { useTheme } from '@/components/theme-provider';
import { Trophy, Target, Zap, TrendingUp } from 'lucide-react';

interface ProgressChartsProps {
  interviews: Interview[];
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ interviews }) => {
  const { theme } = useTheme();

  // 1. Filter completed interviews with valid scores
  const completedInterviews = interviews
    .filter((i) => i.status === 'completed' && i.feedback && typeof i.feedback.score === 'number')
    .sort((a, b) => a.createdAt - b.createdAt); // Sort by date ascending

  // 2. Calculate Stats
  const totalInterviews = completedInterviews.length;
  const averageScore =
    totalInterviews > 0
      ? (
          completedInterviews.reduce((acc, curr) => acc + (curr.feedback?.score || 0), 0) /
          totalInterviews
        ).toFixed(1)
      : '0.0';
  const highestScore =
    totalInterviews > 0
      ? Math.max(...completedInterviews.map((i) => i.feedback?.score || 0))
      : 0;

  if (totalInterviews < 2) {
    return (
      <Card className="bg-muted/50 border-dashed border-2 border-border mb-8">
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
          Complete at least 2 interviews to see your progress analytics!
        </CardContent>
      </Card>
    );
  }

  // 3. Transform data for Recharts (Last 10 sessions max)
  const recentInterviews = completedInterviews.slice(-10);
  const data = recentInterviews.map((interview, index) => ({
    name: `S${index + 1}`, // Short label
    fullDate: new Date(interview.createdAt).toLocaleDateString(),
    score: interview.feedback!.score,
    resilience: interview.feedback!.resilienceScore || 0,
    culture: interview.feedback!.cultureFitScore || 0,
    company: interview.company,
  }));

  // Determine chart colors based on theme
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#1e293b' : '#fff';
  const tooltipText = isDark ? '#f8fafc' : '#0f172a';

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Average Score</p>
              <h3 className="text-2xl font-bold text-primary">{averageScore}</h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <TrendingUp size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Highest Score</p>
              <h3 className="text-2xl font-bold text-emerald-600">{highestScore}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600">
              <Trophy size={24} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
              <h3 className="text-2xl font-bold text-blue-600">{totalInterviews}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-full text-blue-600">
              <Target size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card className="shadow-lg bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Performance Metrics (Last 10 Sessions)
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis
                dataKey="name"
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 10]}
                stroke={axisColor}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  color: tooltipText,
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                itemStyle={{ color: tooltipText }}
                labelStyle={{ color: axisColor }}
              />
              <Legend />
              {/* Areas & Bars */}
              <Area
                type="monotone"
                dataKey="score"
                name="Overall Score"
                fill="url(#scoreGradient)"
                stroke="#3b82f6"
                strokeWidth={3}
              />
              <Bar dataKey="resilience" name="Resilience" barSize={12} fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="culture" name="Culture Fit" barSize={12} fill="#10b981" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressCharts;
