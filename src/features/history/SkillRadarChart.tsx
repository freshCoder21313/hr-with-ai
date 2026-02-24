import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Interview } from '@/types';
import { Shield } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface SkillRadarChartProps {
  interviews: Interview[];
}

const STOP_WORDS = new Set([
  'knowledge',
  'understanding',
  'adaptability',
  'troubleshooting',
  'ability',
  'proficiency',
  'skills',
  'of',
  'in',
  'to',
  'and',
  'with',
  'for',
]);

const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ interviews }) => {
  const { theme } = useTheme();

  const formatSkillLabel = (value: string) => {
    if (value.length > 15) return value.substring(0, 12) + '...';
    return value;
  };

  // Aggregate skills/topics from feedback
  const skillMap = new Map<
    string,
    { totalScore: number; strengthCount: number; resourceCount: number }
  >();

  interviews.forEach((interview) => {
    if (!interview.feedback) return;

    // Use score as a weight for topics mentioned in strengths and resources
    const interviewScore = interview.feedback.score;

    interview.feedback.strengths?.forEach((strength) => {
      // Improved extraction: remove common stop words and take meaningful nouns/concepts
      const words = strength.toLowerCase().replace(/[,.]/g, '').split(' ');

      // Filter out stop words and take the first 2 meaningful words
      const meaningfulWords = words.filter((w) => !STOP_WORDS.has(w) && w.length > 2);
      let skill = meaningfulWords.slice(0, 2).join(' ');

      if (!skill || skill.length < 3) {
        // Fallback to a slightly better truncation if meaningful words fail
        skill = words
          .slice(0, 3)
          .filter((w) => !['of', 'to', 'in', 'the'].includes(w))
          .join(' ');
      }

      // Capitalize
      skill = skill
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      if (skill.length < 3) return;

      const existing = skillMap.get(skill);
      if (existing) {
        existing.totalScore += interviewScore;
        existing.strengthCount++;
      } else {
        skillMap.set(skill, { totalScore: interviewScore, strengthCount: 1, resourceCount: 0 });
      }
    });

    interview.feedback.recommendedResources?.forEach((res) => {
      const skill = res.topic;
      const existing = skillMap.get(skill);
      // For resources (weaknesses), we might want to show lower proficiency or just frequency
      // Let's just track frequency for now to show "Knowledge Areas"
      if (existing) {
        existing.resourceCount++;
      } else {
        skillMap.set(skill, { totalScore: 0, strengthCount: 0, resourceCount: 1 });
      }
    });
  });

  const data = Array.from(skillMap.entries())
    .map(([name, stats]) => {
      let proficiency = 5;
      if (stats.strengthCount > 0) {
        proficiency = stats.totalScore / stats.strengthCount;
        // Apply a small penalty for each time it was recommended as a resource
        proficiency = Math.max(1, proficiency - stats.resourceCount * 0.5);
      } else if (stats.resourceCount > 0) {
        proficiency = 3; // Baseline for something they need to learn
      }

      return {
        subject: name,
        proficiency: Number(proficiency.toFixed(1)),
        fullMark: 10,
      };
    })
    .sort((a, b) => b.proficiency - a.proficiency)
    .slice(0, 6); // Top 6 skills

  if (data.length < 3) return null;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Card className="shadow-lg bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          Technical Skill Map
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <PolarGrid stroke={isDark ? '#334155' : '#e2e8f0'} strokeOpacity={0.5} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 500 }}
              tickFormatter={formatSkillLabel}
            />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            <Radar
              name="Proficiency"
              dataKey="proficiency"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#radarGradient)"
              fillOpacity={0.6}
              animationBegin={0}
              animationDuration={1500}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderRadius: '8px',
                border: 'none',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default SkillRadarChart;
