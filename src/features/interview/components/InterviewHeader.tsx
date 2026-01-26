import React from 'react';
import { StopCircle, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Interview } from '@/types';

interface InterviewHeaderProps {
  interview: Interview;
  timer: number;
  ttsEnabled: boolean;
  onToggleTts: () => void;
  onOpenSettings: () => void;
  onEndSession: () => void;
}

export const InterviewHeader: React.FC<InterviewHeaderProps> = ({
  interview,
  timer,
  ttsEnabled,
  onToggleTts,
  onOpenSettings,
  onEndSession,
}) => {
  return (
    <div className="px-3 md:px-6 py-2 md:py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center h-14 md:h-16 shrink-0">
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800 text-sm md:text-lg truncate max-w-[200px]">
            {interview.company}
          </h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 border border-slate-300 shrink-0">
            {interview.language === 'vi-VN' ? 'VI' : 'EN'}
          </span>
          {interview.difficulty === 'hardcore' && (
            <div
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold transition-all',
                timer <= 10
                  ? 'bg-red-100 text-red-600 border-red-200 animate-pulse'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              )}
            >
              <div
                className={cn('w-2 h-2 rounded-full', timer <= 10 ? 'bg-red-500' : 'bg-slate-400')}
              ></div>
              {timer}s
            </div>
          )}
        </div>
        <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide font-medium truncate max-w-[200px]">
          {interview.jobTitle}
        </p>
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          className="h-8 w-8 text-slate-400"
        >
          <SettingsIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleTts}
          className={cn('h-8 w-8', ttsEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-400')}
        >
          {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onEndSession}
          className="gap-2 h-8 px-3 text-xs"
        >
          <StopCircle className="w-3 h-3" />
          <span className="hidden md:inline">End Session</span>
        </Button>
      </div>
    </div>
  );
};
