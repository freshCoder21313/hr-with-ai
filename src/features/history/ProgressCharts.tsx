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

interface ProgressChartsProps {
  interviews: Interview[];
}

const ProgressCharts: React.FC<ProgressChartsProps> = ({ interviews }) => {
  // 1. Filter completed interviews with valid scores
  const completedInterviews = interviews
    .filter((i) => i.status === 'completed' && i.feedback && typeof i.feedback.score === 'number')
    .sort((a, b) => a.createdAt - b.createdAt); // Sort by date ascending

  if (completedInterviews.length < 2) {
    return (
      <Card className="bg-slate-50 border-dashed border-2">
        <CardContent className="flex items-center justify-center h-40 text-slate-500">
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-800">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 10]}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              labelStyle={{ color: '#64748b' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              name="Interview Score"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ProgressCharts;
