import React, { useState } from 'react';
import { isNonEmptyString } from '@/lib/validation';
import { ProposedChange } from '@/features/cv-studio/utils/cvChatUtils';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Globe,
  Heart,
  Quote,
  Award,
  BookOpen,
  Info,
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

const SECTION_ICONS: Record<string, LucideIcon> = {
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
  meta: Info,
};

interface ChangeReviewCardProps {
  change: ProposedChange;
  onAccept: () => void;
  onReject: () => void;
  isPending?: boolean;
  isLocked?: boolean;
}

export const ChangeReviewCard: React.FC<ChangeReviewCardProps> = ({
  change,
  onAccept,
  onReject,
  isPending = false,
  isLocked = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const busy = isPending || isLocked;

  const getActionInfo = () => {
    switch (change.action) {
      case 'add':
        return {
          icon: Plus,
          label: 'Add',
          color:
            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30',
          accent: 'border-l-emerald-500',
        };
      case 'delete':
        return {
          icon: Trash2,
          label: 'Delete',
          color:
            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
          accent: 'border-l-rose-500',
        };
      case 'rewrite':
        return {
          icon: RefreshCw,
          label: 'Rewrite',
          color:
            'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30',
          accent: 'border-l-violet-500',
        };
      default:
        return {
          icon: RefreshCw,
          label: 'Update',
          color:
            'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30',
          accent: 'border-l-sky-500',
        };
    }
  };

  const actionInfo = getActionInfo();
  const SectionIcon = SECTION_ICONS[change.section] || Info;

  // Helper to render readable diff content
  const renderContent = () => {
    const { newData, action } = change;
    const oldData = change.oldData;

    if (action === 'delete') {
      return (
        <div className="text-sm text-red-600 dark:text-red-400 italic">
          This section will be removed.
        </div>
      );
    }

    // Case 1: Arrays (Work, Education, Skills, Projects)
    if (Array.isArray(newData)) {
      const getItemKey = (item: Record<string, unknown>) => {
        if (!item || typeof item !== 'object') return '';
        return String(item.id || item.name || item.company || item.institution || item.title || '')
          .trim()
          .toLowerCase();
      };

      const getItemTitle = (item: Record<string, unknown>, fallbackIdx: number) => {
        if (!item || typeof item !== 'object') return `Item ${fallbackIdx + 1}`;
        return (
          (item.name as string) ||
          (item.company as string) ||
          (item.institution as string) ||
          (item.title as string) ||
          `Item ${fallbackIdx + 1}`
        );
      };

      const oldArray = Array.isArray(oldData) ? (oldData as Record<string, unknown>[]) : [];
      const newArray = newData as Record<string, unknown>[];

      // Build lookup map for old items by stable key
      const oldItemMap = new Map<string, Record<string, unknown>>();
      oldArray.forEach((item, idx) => {
        const key = getItemKey(item) || `__idx_${idx}`;
        oldItemMap.set(key, item);
      });

      // Classify new items as Added or Changed
      const classifiedNew = newArray.map((item, idx) => {
        const key = getItemKey(item) || `__idx_${idx}`;
        const existing = oldItemMap.get(key);
        const isAdded = !existing;
        const isChanged = existing && JSON.stringify(existing) !== JSON.stringify(item);
        return {
          item,
          idx,
          key,
          title: getItemTitle(item, idx),
          status: isAdded ? 'added' : isChanged ? 'changed' : 'unchanged',
        };
      });

      // Find dropped / removed items from oldData
      const newKeys = new Set(newArray.map((item, idx) => getItemKey(item) || `__idx_${idx}`));
      const removedItems = oldArray.filter((item, idx) => {
        const key = getItemKey(item) || `__idx_${idx}`;
        return !newKeys.has(key);
      });

      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>{newData.length} items in list</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 md:h-6 text-xs gap-1"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronUp size={12} aria-hidden="true" />
              ) : (
                <ChevronDown size={12} aria-hidden="true" />
              )}
            </Button>
          </div>

          {isExpanded ? (
            <div className="max-h-48 overflow-y-auto bg-muted p-2 rounded text-xs border border-border space-y-2">
              {classifiedNew.map(({ item, idx, title, status }) => (
                <div key={idx} className="pb-2 border-b last:border-0 border-border/60">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="font-semibold truncate">{title}</span>
                    {status === 'added' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
                      >
                        Added
                      </Badge>
                    )}
                    {status === 'changed' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                      >
                        Changed
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground text-[11px]">
                    {(item.position as string) || (item.area as string) || (item.level as string)}
                  </div>
                </div>
              ))}
              {removedItems.length > 0 && (
                <div className="pt-1 border-t border-border/60">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
                    Removed
                  </div>
                  {removedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="line-through text-muted-foreground text-[11px] truncate"
                    >
                      {getItemTitle(item, idx)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs space-y-1">
              {classifiedNew.slice(0, 3).map(({ idx, title, status }) => (
                <div key={idx} className="flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        status === 'added'
                          ? 'bg-emerald-500'
                          : status === 'changed'
                            ? 'bg-blue-500'
                            : 'bg-muted-foreground/60'
                      }`}
                    />
                    <span className="truncate max-w-[170px] font-medium">{title}</span>
                  </div>
                  {status === 'added' && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium shrink-0">
                      Added
                    </span>
                  )}
                  {status === 'changed' && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium shrink-0">
                      Changed
                    </span>
                  )}
                </div>
              ))}
              {classifiedNew.length > 3 && (
                <span className="text-muted-foreground pl-3 text-[11px] block">
                  +{classifiedNew.length - 3} more...
                </span>
              )}
              {removedItems.length > 0 && (
                <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="line-through">
                    {removedItems
                      .slice(0, 2)
                      .map((item, idx) => getItemTitle(item, idx))
                      .join(', ')}
                  </span>
                  {removedItems.length > 2 && (
                    <span className="italic ml-1">+{removedItems.length - 2} removed</span>
                  )}
                </div>
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
        if (typeof value === 'string' && !isNonEmptyString(value)) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'object' && Object.keys(value).length === 0) return false;
        return true;
      });

      if (filteredEntries.length === 0) {
        return (
          <div className="text-xs text-muted-foreground italic px-1">Updating core fields...</div>
        );
      }

      return (
        <div className="text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50 space-y-1.5">
          {filteredEntries.slice(0, 8).map(([key, value]) => {
            if (typeof value === 'object' && !Array.isArray(value)) return null;
            return (
              <div key={key} className="grid grid-cols-[70px_1fr] gap-3 items-start">
                <span className="text-muted-foreground font-medium uppercase tracking-tighter opacity-70 mt-0.5">
                  {key}
                </span>
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
    <Card
      className={`w-full shadow-sm border-l-4 ${actionInfo.accent} overflow-hidden transition-all hover:shadow-md`}
      aria-busy={isPending}
    >
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-md ${actionInfo.color} shrink-0`}>
            <SectionIcon size={16} aria-hidden="true" />
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
        <Badge
          variant="outline"
          className={`${actionInfo.color} border-none font-bold text-[10px] uppercase h-5`}
        >
          {actionInfo.label}
        </Badge>
      </CardHeader>

      <CardContent className="px-3 py-2">{renderContent()}</CardContent>

      <CardFooter className="p-2 pt-0 flex justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReject}
          disabled={busy}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X size={12} className="mr-1" aria-hidden="true" /> Reject
        </Button>
        <Button size="sm" onClick={onAccept} disabled={busy} className="shadow-sm">
          {isPending ? (
            <RefreshCw size={12} className="mr-1 animate-spin" aria-hidden="true" />
          ) : (
            <Check size={12} className="mr-1" aria-hidden="true" />
          )}{' '}
          {isPending ? 'Saving…' : 'Accept'}
        </Button>
      </CardFooter>
    </Card>
  );
};
