import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Interview } from '@/types';
import { BookOpen, ExternalLink, Target, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <Card className="shadow-lg bg-card border-border mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          <Target className="w-5 h-5 text-purple-600" />
          Personalized Learning Path
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(aggregatedResources.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 6)
            .map(([topic, data], idx) => (
              <a
                key={idx}
                href={`https://www.google.com/search?q=${encodeURIComponent(topic + ' tutorial')}`}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between p-4 rounded-lg border border-border hover:border-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-all cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-foreground group-hover:text-purple-600 transition-colors flex items-center gap-2">
                      <BookOpen size={16} />
                      {topic}
                    </h4>
                    {data.count > 1 && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full dark:bg-purple-900 dark:text-purple-300">
                        Seen {data.count}x
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
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
                  className="group flex flex-col justify-between p-4 rounded-lg border border-border hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all cursor-pointer"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground group-hover:text-red-600 transition-colors flex items-center gap-2">
                        <AlertTriangle size={16} />
                        {topic}
                      </h4>
                      {data.count > 1 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
                          Flagged {data.count}x
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
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
