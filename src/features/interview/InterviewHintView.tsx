import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Lightbulb } from 'lucide-react';
import { InterviewHints } from '@/services/interview/interviewAIService';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';

interface InterviewHintViewProps {
  hints: InterviewHints;
  onClose: () => void;
}

const InterviewHintView: React.FC<InterviewHintViewProps> = ({ hints, onClose }) => {
  return (
    <Card className="mb-4 bg-warning/10 border-warning/30 shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-warning flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-warning fill-warning" />
          AI Interview Hints
        </CardTitle>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close hints"
          className="text-warning hover:text-warning/80 hover:bg-warning/10"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {/* Level 1: Attitude */}
        <div className="bg-card p-3 rounded-lg border border-border">
          <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <span className="bg-success/15 text-success text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
              Level 1: Beginner
            </span>
          </div>
          <div className="text-muted-foreground leading-relaxed text-xs max-h-[120px] overflow-y-auto pr-1">
            <MarkdownRenderer content={hints.level1} />
          </div>
        </div>

        {/* Level 2: Creative */}
        <div className="bg-card p-3 rounded-lg border border-border">
          <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <span className="bg-info/15 text-info text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
              Level 2: Creative
            </span>
          </div>
          <div className="text-muted-foreground leading-relaxed text-xs max-h-[120px] overflow-y-auto pr-1">
            <MarkdownRenderer content={hints.level2} />
          </div>
        </div>

        {/* Level 3: Expert */}
        <div className="bg-card p-3 rounded-lg border border-border">
          <div className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <span className="bg-primary/15 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">
              Level 3: Expert
            </span>
          </div>
          <div className="text-muted-foreground leading-relaxed text-xs max-h-[120px] overflow-y-auto pr-1">
            <MarkdownRenderer content={hints.level3} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewHintView;
