import React from 'react';
import { Plus, Copy, Trash2, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { AIProviderProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProfileListProps {
  profiles: AIProviderProfile[];
  editingProfileId: string | null;
  activeId?: string;
  fallbackIds: string[];
  onSelectProfile: (id: string) => void;
  onAddProfile: () => void;
  onDuplicateProfile: (profile: AIProviderProfile) => void;
  onDeleteProfile: (id: string) => void;
  onReorderFallback: (id: string, direction: 'up' | 'down') => void;
  onToggleFallback: (id: string) => void;
}

export const ProfileList: React.FC<ProfileListProps> = ({
  profiles,
  editingProfileId,
  activeId,
  fallbackIds,
  onSelectProfile,
  onAddProfile,
  onDuplicateProfile,
  onDeleteProfile,
  onReorderFallback,
  onToggleFallback,
}) => {
  return (
    <div className="w-full md:w-64 flex flex-col space-y-2 border-r pr-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Profiles</h3>
        <Button variant="ghost" size="icon" onClick={onAddProfile} title="Add new profile">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={cn(
              'group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
              editingProfileId === profile.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
            onClick={() => onSelectProfile(profile.id)}
          >
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{profile.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground uppercase">
                  {profile.provider}
                </span>
                {!profile.enabled && (
                  <Badge variant="outline" className="text-[8px] h-3 px-1">
                    Disabled
                  </Badge>
                )}
                {activeId === profile.id && (
                  <Badge className="text-[8px] h-3 px-1 bg-green-500 hover:bg-green-600">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateProfile(profile);
                }}
                title="Duplicate"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProfile(profile.id);
                }}
                disabled={activeId === profile.id}
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          Fallback Chain
          <span title="If the active profile fails, these will be tried in order.">
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
          </span>
        </h3>

        <div className="space-y-1">
          {fallbackIds.length === 0 && (
            <p className="text-[10px] text-muted-foreground italic">
              No fallback profiles configured.
            </p>
          )}
          {fallbackIds.map((fid, idx) => {
            const profile = profiles.find((p) => p.id === fid);
            if (!profile) return null;
            return (
              <div
                key={fid}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-[11px]"
              >
                <span className="truncate max-w-[100px]">{profile.name}</span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onReorderFallback(fid, 'up')}
                    disabled={idx === 0}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => onReorderFallback(fid, 'down')}
                    disabled={idx === fallbackIds.length - 1}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-destructive"
                    onClick={() => onToggleFallback(fid)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
