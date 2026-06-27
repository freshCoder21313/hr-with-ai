import React from 'react';
import { Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

interface EntryCardProps {
  children: React.ReactNode;
  onRemove: () => void;
  removeTooltip?: string;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
  analyzeTooltip?: string;
  className?: string;
}

export const EntryCard: React.FC<EntryCardProps> = ({
  children,
  onRemove,
  removeTooltip = 'Remove entry',
  onAnalyze,
  isAnalyzing = false,
  analyzeTooltip = 'AI Analysis',
  className,
}) => {
  return (
    <Card className={cn('relative p-4 mb-4 group hover:shadow-md transition-shadow', className)}>
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {onAnalyze && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary"
                onClick={onAnalyze}
                disabled={isAnalyzing}
                data-testid="entry-card-analyze-button"
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{analyzeTooltip}</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
              data-testid="entry-card-remove-button"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{removeTooltip}</TooltipContent>
        </Tooltip>
      </div>
      <div className="pt-2">{children}</div>
    </Card>
  );
};
