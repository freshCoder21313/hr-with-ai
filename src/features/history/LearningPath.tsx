import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Interview } from '@/types';
import { BookOpen, ExternalLink, Target, AlertTriangle } from 'lucide-react';

interface LearningPathProps {
  interviews: Interview[];
}

interface TopicRecommendation {
  topic: string;
  count: number;
  type: 'weakness' | 'missing_keyword';
}

const LearningPath: React.FC<LearningPathProps> = ({ interviews }) => {
  // 1. Aggregate Weaknesses and Missing Keywords
  const topicMap = new Map<string, TopicRecommendation>();

  interviews.forEach((interview) => {
    if (!interview.feedback) return;

    // Weaknesses
    interview.feedback.weaknesses?.forEach((weakness) => {
      // Simple normalization: lowercase and trim
      // In a real app, you'd use NLP to cluster similar topics (e.g., "React" vs "React.js")
      // Here we just take the raw string or try to extract key nouns if possible.
      // For now, let's just use the full string but maybe truncate if too long.
      const topic = weakness.trim();
      const existing = topicMap.get(topic);
      if (existing) {
        existing.count++;
      } else {
        topicMap.set(topic, { topic, count: 1, type: 'weakness' });
      }
    });

    // Missing Keywords (if available in resume analysis, but here we are looking at Interview Feedback)
    // Actually, InterviewFeedback has `recommendedResources` which is already computed per interview.
    // Maybe we can aggregate `recommendedResources` instead?
  });

  // Let's also aggregate recommended resources if available
  const aggregatedResources = new Map<string, { description: string; count: number }>();
  interviews.forEach((interview) => {
    if (!interview.feedback?.recommendedResources) return;
    interview.feedback.recommendedResources.forEach((res) => {
      const existing = aggregatedResources.get(res.topic);
      if (existing) {
        existing.count++;
      } else {
        aggregatedResources.set(res.topic, { description: res.description, count: 1 });
      }
    });
  });

  // If we have resources, prioritizing them is better because they are structured.
  // If not, fall back to weaknesses.

  const sortedResources = Array.from(aggregatedResources.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6); // Top 6

  const sortedWeaknesses = Array.from(topicMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (sortedResources.length === 0 && sortedWeaknesses.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-xl bg-card border-border/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Target className="w-5 h-5 text-purple-600" />
          Personalized Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from(aggregatedResources.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 6)
            .map(([topic, data], idx) => (
              <a
                key={idx}
                href={`https://www.google.com/search?q=${encodeURIComponent(topic + ' tutorial')}`}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between p-5 rounded-xl border border-border bg-muted/30 hover:border-purple-500/50 hover:bg-purple-500/5 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-3 gap-2 w-full">
                    <h4 className="font-bold text-foreground group-hover:text-purple-500 transition-colors flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 shrink-0">
                        <BookOpen size={16} />
                      </div>
                      <span className="truncate">{topic}</span>
                    </h4>
                    {data.count > 1 && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-700 px-2 py-0.5 rounded-full dark:text-purple-300 shrink-0">
                        {data.count}x Frequency
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 w-full">
                    {data.description}
                  </p>
                </div>
                <div className="flex items-center text-xs text-purple-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Start Learning <ExternalLink size={12} className="ml-1" />
                </div>
              </a>
            ))}

          {/* Fallback to weaknesses if no resources found */}
          {sortedResources.length === 0 &&
            Array.from(topicMap.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 6)
              .map(([topic, data], idx) => (
                <a
                  key={idx}
                  href={`https://www.google.com/search?q=${encodeURIComponent(topic + ' interview preparation')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col justify-between p-5 rounded-xl border border-border bg-muted/30 hover:border-red-500/50 hover:bg-red-500/5 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2 w-full">
                      <h4 className="font-bold text-foreground group-hover:text-red-500 transition-colors flex items-center gap-2 min-w-0 flex-1">
                        <div className="p-1.5 rounded-lg bg-red-500/10 text-red-600 shrink-0">
                          <AlertTriangle size={16} />
                        </div>
                        <span className="truncate">{topic}</span>
                      </h4>
                      {data.count > 1 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300 shrink-0">
                          Flagged {data.count}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground w-full">
                      Identified as an area for improvement in your sessions.
                    </p>
                  </div>
                  <div className="flex items-center text-xs text-red-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Find Resources <ExternalLink size={12} className="ml-1" />
                  </div>
                </a>
              ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LearningPath;
