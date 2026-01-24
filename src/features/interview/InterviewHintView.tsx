import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Lightbulb } from 'lucide-react';
import { InterviewHints } from '@/services/geminiService';

interface InterviewHintViewProps {
  hints: InterviewHints;
  onClose: () => void;
}

const InterviewHintView: React.FC<InterviewHintViewProps> = ({ hints, onClose }) => {
  return (
    <Card className="mb-4 bg-amber-50/50 border-amber-200 shadow-md animate-in slide-in-from-bottom-2 fade-in duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
          AI Interview Hints
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-amber-800/50 hover:text-amber-900"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {/* Level 1: Attitude */}
        <div className="bg-white/80 p-3 rounded-lg border border-amber-100">
          <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Level 1: Beginner
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">{hints.level1}</p>
        </div>

        {/* Level 2: Creative */}
        <div className="bg-white/80 p-3 rounded-lg border border-amber-100">
          <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Level 2: Creative
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">{hints.level2}</p>
        </div>

        {/* Level 3: Expert */}
        <div className="bg-white/80 p-3 rounded-lg border border-amber-100">
          <div className="font-semibold text-slate-700 mb-1 flex items-center gap-2">
            <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">
              Level 3: Expert
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">{hints.level3}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default InterviewHintView;
