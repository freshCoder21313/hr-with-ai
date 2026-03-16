import React, { useState } from 'react';
import { ProposedChange } from '../utils/cvChatUtils';
import {
  Check, X, ChevronDown, ChevronUp,
  User, Briefcase, GraduationCap, Code,
  Globe, Heart, Quote, Award, BookOpen,
  Info, Sparkles, Plus, Trash2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

const SECTION_ICONS: Record<string, any> = {
  basics: User,
  work: Briefcase,
  education: GraduationCap,
  skills: Code,
  projects: Sparkles,
  languages: Globe,
  interests: Heart,
  references: Quote,
  awards: Award,
  publications: BookOpen,
  meta: Info
};

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

  const getActionInfo = () => {
    switch (change.action) {
      case 'add':
        return {
          icon: Plus,
          label: 'Add',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          indicator: 'bg-emerald-500'
        };
      case 'delete':
        return {
          icon: Trash2,
          label: 'Delete',
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          indicator: 'bg-rose-500'
        };
      case 'rewrite':
        return {
          icon: RefreshCw,
          label: 'Rewrite',
          color: 'bg-violet-50 text-violet-700 border-violet-200',
          indicator: 'bg-violet-500'
        };
      default:
        return {
          icon: RefreshCw,
          label: 'Update',
          color: 'bg-sky-50 text-sky-700 border-sky-200',
          indicator: 'bg-sky-500'
        };
    }
  };

  const actionInfo = getActionInfo();
  const SectionIcon = SECTION_ICONS[change.section] || Info;

  // Helper to render readable diff content
  const renderContent = () => {
    const { newData, action } = change;

    if (action === 'delete') {
      return <div className="text-sm text-red-600 italic">This section will be removed.</div>;
    }

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
      const filteredEntries = Object.entries(newData).filter(([_, value]) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      });

      if (filteredEntries.length === 0) {
        return <div className="text-xs text-muted-foreground italic px-1">Updating core fields...</div>;
      }

      return (
        <div className="text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50 space-y-1.5">
          {filteredEntries.slice(0, 8).map(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) return null;
            return (
              <div key={key} className="grid grid-cols-[70px_1fr] gap-3 items-start">
                <span className="text-muted-foreground font-medium uppercase tracking-tighter opacity-70 mt-0.5">{key}</span>
                <span className="text-foreground break-words leading-normal">
                  {Array.isArray(value) ? `${value.length} items` : String(value)}
                </span>
              </div>
            );
          })}
          {filteredEntries.length > 8 && (
            <div className="text-[10px] text-muted-foreground pt-1 italic text-right">
              +{filteredEntries.length - 8} more fields
            </div>
          )}
        </div>
      );
    }

    return <div className="text-xs text-muted-foreground italic">Complex data update</div>;
  };

  return (
    <Card className={`w-full shadow-sm border-l-4 ${actionInfo.color.split(' ')[2].replace('border-', 'border-l-')} overflow-hidden transition-all hover:shadow-md`}>
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-md ${actionInfo.color} shrink-0`}>
            <SectionIcon size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground truncate">
              {change.section}
            </h3>
            <span className="text-[11px] text-muted-foreground line-clamp-1 italic font-medium">
              {change.explanation}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={`${actionInfo.color} border-none font-bold text-[10px] uppercase h-5`}>
          {actionInfo.label}
        </Badge>
      </CardHeader>

      <CardContent className="px-3 py-2">{renderContent()}</CardContent>

      <CardFooter className="p-2 pt-0 flex justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2"
        >
          <X size={12} className="mr-1" /> REJECT
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          className="h-7 text-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-3 shadow-sm"
        >
          <Check size={12} className="mr-1" /> ACCEPT
        </Button>
      </CardFooter>
    </Card>
  );
};

