import React, { useState } from 'react';
import { ProposedChange } from './cvChatUtils';
import { Check, X, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface ChangeReviewCardProps {
  change: ProposedChange;
  onAccept: () => void;
  onReject: () => void;
}

export const ChangeReviewCard: React.FC<ChangeReviewCardProps> = ({
  change,
  onAccept,
  onReject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to render readable diff content
  const renderContent = () => {
    const { section, newData } = change;

    // Case 1: Arrays (Work, Education, Skills, Projects)
    if (Array.isArray(newData)) {
      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{newData.length} items in list</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {isExpanded ? 'Collapse' : 'View Details'}
            </Button>
          </div>

          {isExpanded ? (
            <div className="max-h-40 overflow-y-auto bg-slate-50 p-2 rounded text-xs border">
              {newData.map((item, idx) => (
                <div key={idx} className="mb-2 pb-2 border-b last:border-0">
                  <div className="font-semibold">
                    {item.name || item.institution || item.company || `Item ${idx + 1}`}
                  </div>
                  <div className="text-slate-500">{item.position || item.area || item.level}</div>
                </div>
              ))}
            </div>
          ) : (
            // Preview last added/modified item logic is hard without diffing.
            // We just show a summary of the first few items.
            <div className="text-xs space-y-1">
              {newData.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="truncate max-w-[200px] font-medium">
                    {item.name || item.company || item.institution || 'Item'}
                  </span>
                </div>
              ))}
              {newData.length > 3 && (
                <span className="text-slate-400 pl-3">+{newData.length - 3} more...</span>
              )}
            </div>
          )}
        </div>
      );
    }

    // Case 2: Objects (Basics, Location)
    if (typeof newData === 'object' && newData !== null) {
      return (
        <div className="text-xs bg-slate-50 p-2 rounded border space-y-1">
          {Object.entries(newData)
            .slice(0, 5)
            .map(([key, value]) => {
              if (typeof value === 'object') return null; // Skip nested for summary
              return (
                <div key={key} className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-slate-500 truncate">{key}:</span>
                  <span className="font-medium truncate" title={String(value)}>
                    {String(value)}
                  </span>
                </div>
              );
            })}
        </div>
      );
    }

    return <div className="text-xs text-slate-500 italic">Complex data update</div>;
  };

  return (
    <Card className="w-full shadow-lg border-l-4 border-l-blue-500 animate-in slide-in-from-right-4 duration-300">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
        <div className="flex flex-col">
          <h3 className="font-bold text-sm uppercase tracking-wide text-blue-700 flex items-center gap-2">
            Update: {change.section}
          </h3>
          <span className="text-xs text-slate-500 line-clamp-1">{change.explanation}</span>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
          Pending
        </Badge>
      </CardHeader>

      <CardContent className="p-3 pt-0">{renderContent()}</CardContent>

      <CardFooter className="p-2 bg-slate-50 flex justify-end gap-2 rounded-b-xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X size={14} className="mr-1" /> Reject
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Check size={14} className="mr-1" /> Accept
        </Button>
      </CardFooter>
    </Card>
  );
};
