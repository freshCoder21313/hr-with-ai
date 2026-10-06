import React, { useState } from 'react';
import { isNonEmptyString } from '@/lib/validation';
import { ProposedChange } from '@/features/cv-studio/utils/cvChatUtils';
import {
  computeItemFieldDiffs,
  computeObjectDiff,
  FieldDiff,
} from '@/features/cv-studio/utils/cvDiffUtils';
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
  GitCompare,
  ArrowRight,
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
  const [showDetailedDiff, setShowDetailedDiff] = useState(false);
  const busy = isPending || isLocked;

  const getActionInfo = () => {
    switch (change.action) {
      case 'add':
        return {
          icon: Plus,
          label: 'Add',
          color: 'bg-success/10 text-success border-success/30',
          accent: 'border-l-success',
        };
      case 'delete':
        return {
          icon: Trash2,
          label: 'Delete',
          color: 'bg-destructive/10 text-destructive border-destructive/30',
          accent: 'border-l-destructive',
        };
      case 'rewrite':
        return {
          icon: RefreshCw,
          label: 'Rewrite',
          color: 'bg-primary/10 text-primary border-primary/30',
          accent: 'border-l-primary',
        };
      default:
        return {
          icon: RefreshCw,
          label: 'Update',
          color: 'bg-info/10 text-info border-info/30',
          accent: 'border-l-info',
        };
    }
  };

  const actionInfo = getActionInfo();
  const SectionIcon = SECTION_ICONS[change.section] || Info;

  const renderContent = () => {
    const { newData, action, oldData } = change;

    if (action === 'delete') {
      return (
        <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-md flex items-center gap-2">
          <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>This section will be removed from your resume.</span>
        </div>
      );
    }

    // Case 1: Strings (Direct text rewrite)
    if (typeof newData === 'string') {
      const oldStr = typeof oldData === 'string' ? oldData : '';
      return (
        <div className="space-y-2 text-xs">
          {oldStr && (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive line-through">
              <span className="font-semibold block mb-0.5 text-[10px] uppercase">Previous:</span>
              {oldStr}
            </div>
          )}
          <div className="p-2 rounded bg-success/10 border border-success/20 text-success font-medium">
            <span className="font-semibold block mb-0.5 text-[10px] uppercase">Proposed:</span>
            {newData}
          </div>
        </div>
      );
    }

    // Case 2: Arrays (Work, Education, Skills, Projects, Languages, etc.)
    if (Array.isArray(newData)) {
      const getItemKey = (item: unknown) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim().toLowerCase();
        if (typeof item !== 'object') return '';
        const rec = item as Record<string, unknown>;
        return String(rec.id || rec.name || rec.company || rec.institution || rec.title || '')
          .trim()
          .toLowerCase();
      };

      const getItemTitle = (item: unknown, fallbackIdx: number) => {
        if (!item) return `Item ${fallbackIdx + 1}`;
        if (typeof item === 'string') return item;
        if (typeof item !== 'object') return `Item ${fallbackIdx + 1}`;
        const rec = item as Record<string, unknown>;
        return (
          (rec.name as string) ||
          (rec.company as string) ||
          (rec.institution as string) ||
          (rec.title as string) ||
          `Item ${fallbackIdx + 1}`
        );
      };

      const oldArray = Array.isArray(oldData) ? (oldData as Record<string, unknown>[]) : [];
      const newArray = newData as Record<string, unknown>[];

      // Build lookup map for old items by key
      const oldItemMap = new Map<string, Record<string, unknown>>();
      oldArray.forEach((item, idx) => {
        const key = getItemKey(item) || `__idx_${idx}`;
        oldItemMap.set(key, typeof item === 'object' && item !== null ? item : { name: item });
      });

      // Classify new items
      const classifiedNew = newArray.map((rawItem, idx) => {
        const key = getItemKey(rawItem) || `__idx_${idx}`;
        const existing = oldItemMap.get(key);
        const itemObj =
          typeof rawItem === 'object' && rawItem !== null
            ? (rawItem as Record<string, unknown>)
            : { name: rawItem };
        const isAdded = !existing;
        const isChanged = existing && JSON.stringify(existing) !== JSON.stringify(itemObj);

        const fieldDiffs =
          isChanged && existing ? computeItemFieldDiffs(existing, itemObj) : [];

        return {
          item: itemObj,
          existing,
          idx,
          key,
          title: getItemTitle(rawItem, idx),
          status: isAdded ? 'added' : isChanged ? 'changed' : 'unchanged',
          fieldDiffs,
        };
      });

      // Removed items
      const newKeys = new Set(newArray.map((item, idx) => getItemKey(item) || `__idx_${idx}`));
      const removedItems = oldArray.filter((item, idx) => {
        const key = getItemKey(item) || `__idx_${idx}`;
        return !newKeys.has(key);
      });

      const hasDiffsToInspect =
        classifiedNew.some((i) => i.status === 'changed' || i.status === 'added') ||
        removedItems.length > 0;

      return (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span className="font-medium">
              {newData.length} items total
              {classifiedNew.filter((i) => i.status === 'added').length > 0 && (
                <span className="text-success ml-1.5 font-semibold">
                  (+{classifiedNew.filter((i) => i.status === 'added').length})
                </span>
              )}
              {removedItems.length > 0 && (
                <span className="text-destructive ml-1.5 font-semibold">
                  (-{removedItems.length})
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {hasDiffsToInspect && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] gap-1 px-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setShowDetailedDiff(!showDetailedDiff)}
                  title="Toggle detailed diff view"
                >
                  <GitCompare className="w-3 h-3" />
                  <span>{showDetailedDiff ? 'Compact' : 'Detailed Diff'}</span>
                </Button>
              )}
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
          </div>

          {/* Detailed diff view */}
          {showDetailedDiff ? (
            <div className="max-h-60 overflow-y-auto bg-muted/40 p-2.5 rounded-lg text-xs border border-border space-y-3">
              {classifiedNew.map(({ item, title, status, fieldDiffs }, idx) => (
                <div key={idx} className="p-2 rounded bg-card border border-border space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground truncate">{title}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1.5 font-semibold ${
                        status === 'added'
                          ? 'border-success/30 text-success bg-success/10'
                          : status === 'changed'
                            ? 'border-info/30 text-info bg-info/10'
                            : 'border-border text-muted-foreground'
                      }`}
                    >
                      {status === 'added' ? 'Added' : status === 'changed' ? 'Changed' : 'Unchanged'}
                    </Badge>
                  </div>

                  {/* Bullet diff */}
                  {fieldDiffs.map((fd: FieldDiff): React.ReactNode => {
                    if (fd.type === 'bullets' && fd.bulletDiff) {
                      return (
                        <div key={fd.field} className="space-y-1 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Bullet Points Diff:
                          </span>
                          <div className="space-y-1 pl-1">
                            {fd.bulletDiff.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className={`text-[11px] leading-relaxed p-1 rounded ${
                                  b.type === 'added'
                                    ? 'bg-success/10 text-success border-l-2 border-success'
                                    : b.type === 'removed'
                                      ? 'bg-destructive/10 text-destructive line-through border-l-2 border-destructive'
                                      : 'text-muted-foreground'
                                }`}
                              >
                                {b.type === 'added' ? '+ ' : b.type === 'removed' ? '- ' : '• '}
                                {b.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (fd.type === 'keywords' && fd.keywordDiff) {
                      return (
                        <div key={fd.field} className="space-y-1 pt-1">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Keywords:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {fd.keywordDiff.removed.map((kw, kwIdx) => (
                              <Badge
                                key={`r-${kwIdx}`}
                                variant="outline"
                                className="text-[10px] line-through bg-destructive/10 text-destructive border-destructive/20"
                              >
                                - {kw}
                              </Badge>
                            ))}
                            {fd.keywordDiff.added.map((kw, kwIdx) => (
                              <Badge
                                key={`a-${kwIdx}`}
                                variant="outline"
                                className="text-[10px] bg-success/10 text-success border-success/20 font-medium"
                              >
                                + {kw}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={fd.field}
                        className="text-[11px] bg-muted/60 p-1.5 rounded flex items-center gap-2"
                      >
                        <span className="font-semibold text-muted-foreground uppercase text-[10px]">
                          {fd.field}:
                        </span>
                        <span className="line-through text-destructive">{String(fd.oldValue)}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-success font-medium">{String(fd.newValue)}</span>
                      </div>
                    );
                  })}

                  {status === 'added' && Boolean(item.summary) && (
                    <div className="text-[11px] text-muted-foreground italic pl-1 border-l-2 border-success/40">
                      {String(item.summary)}
                    </div>
                  )}
                </div>
              ))}

              {removedItems.length > 0 && (
                <div className="p-2 rounded bg-destructive/5 border border-destructive/20 space-y-1">
                  <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block">
                    Removed Items:
                  </span>
                  {removedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="line-through text-destructive text-[11px] flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3 shrink-0" />
                      <span>{getItemTitle(item, idx)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : isExpanded ? (
            /* Standard Expanded view */
            <div className="max-h-48 overflow-y-auto bg-muted p-2 rounded text-xs border border-border space-y-2">
              {classifiedNew.map(({ item, idx, title, status }) => (
                <div key={idx} className="pb-2 border-b last:border-0 border-border/60">
                  <div className="flex items-center gap-1.5 justify-between">
                    <span className="font-semibold truncate text-foreground">{title}</span>
                    {status === 'added' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 border-success/30 text-success bg-success/10"
                      >
                        Added
                      </Badge>
                    )}
                    {status === 'changed' && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 border-info/30 text-info bg-info/10"
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
            /* Compact list view */
            <div className="text-xs space-y-1">
              {classifiedNew.slice(0, 3).map(({ idx, title, status }) => (
                <div key={idx} className="flex items-center gap-1.5 justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        status === 'added'
                          ? 'bg-success'
                          : status === 'changed'
                            ? 'bg-info'
                            : 'bg-muted-foreground/60'
                      }`}
                    />
                    <span className="truncate max-w-[170px] font-medium text-foreground">{title}</span>
                  </div>
                  {status === 'added' && (
                    <span className="text-[10px] text-success font-medium shrink-0">Added</span>
                  )}
                  {status === 'changed' && (
                    <span className="text-[10px] text-info font-medium shrink-0">Changed</span>
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

    // Case 3: Objects (Basics, Meta, Location)
    if (typeof newData === 'object' && newData !== null) {
      const oldObj =
        typeof oldData === 'object' && oldData !== null
          ? (oldData as Record<string, unknown>)
          : undefined;
      const newObj = newData as Record<string, unknown>;

      const objectDiffs = computeObjectDiff(oldObj, newObj);

      if (objectDiffs.length > 0) {
        return (
          <div className="text-[11px] bg-muted/30 p-2.5 rounded-lg border border-border/50 space-y-2">
            {objectDiffs.map(({ key, status, oldValue, newValue }) => {
              if (status === 'modified') {
                return (
                  <div key={key} className="space-y-1 pb-1.5 border-b last:border-0 border-border/40">
                    <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] block">
                      {key}:
                    </span>
                    <div className="p-1.5 rounded bg-destructive/10 text-destructive line-through text-[11px]">
                      {String(oldValue)}
                    </div>
                    <div className="p-1.5 rounded bg-success/10 text-success font-medium text-[11px]">
                      {String(newValue)}
                    </div>
                  </div>
                );
              }
              if (status === 'added') {
                return (
                  <div key={key} className="p-1.5 rounded bg-success/10 text-success text-[11px]">
                    <span className="font-semibold uppercase text-[10px] mr-1">+{key}:</span>
                    {String(newValue)}
                  </div>
                );
              }
              if (status === 'removed') {
                return (
                  <div key={key} className="p-1.5 rounded bg-destructive/10 text-destructive line-through text-[11px]">
                    <span className="font-semibold uppercase text-[10px] mr-1">-{key}:</span>
                    {String(oldValue)}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }

      // Fallback if no specific diff detected
      const filteredEntries = Object.entries(newObj).filter(([_, value]) => {
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
