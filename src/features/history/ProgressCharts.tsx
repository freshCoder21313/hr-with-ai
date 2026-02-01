import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Interview } from '@/types';
import { useTheme } from '@/components/theme-provider';

interface ProgressChartsProps {
  interviews: Interview[];
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ interviews }) => {
  const { theme } = useTheme();
  // 1. Filter completed interviews with valid scores
  const completedInterviews = interviews
    .filter((i) => i.status === 'completed' && i.feedback && typeof i.feedback.score === 'number')
    .sort((a, b) => a.createdAt - b.createdAt); // Sort by date ascending

  if (completedInterviews.length < 2) {
    return (
      <Card className="bg-muted/50 border-dashed border-2 border-border">
        <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
          Complete at least 2 interviews to see your progress chart!
        </CardContent>
      </Card>
    );
  }

  // 2. Transform data for Recharts
  const data = completedInterviews.map((interview, index) => ({
    name: `Session ${index + 1}`,
    date: new Date(interview.createdAt).toLocaleDateString(),
    score: interview.feedback!.score,
    company: interview.company,
  }));

  // Determine chart colors based on theme
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const gridColor = isDark ? '#334155' : '#e2e8f0'; // slate-700 vs slate-200
  const axisColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 vs slate-500
  const tooltipBg = isDark ? '#1e293b' : '#fff'; // slate-800 vs white
  const tooltipText = isDark ? '#f8fafc' : '#0f172a'; // slate-50 vs slate-900

  return (
    <Card className="shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
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
            <Line
              type="monotone"
              dataKey="score"
              name="Interview Score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: isDark ? '#0f172a' : '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProgressCharts;
