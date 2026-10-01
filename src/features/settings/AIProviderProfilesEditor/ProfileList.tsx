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
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onAddProfile}
          title="Add new profile"
          aria-label="Add new profile"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {profiles.map((profile) => {
          const metaId = `profile-meta-${profile.id}`;
          return (
            <div
              key={profile.id}
              className={cn(
                'group flex items-center justify-between p-2 rounded-md transition-colors',
                editingProfileId === profile.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) return;
                onSelectProfile(profile.id);
              }}
            >
              <button
                type="button"
                aria-current={editingProfileId === profile.id}
                aria-describedby={metaId}
                onClick={() => onSelectProfile(profile.id)}
                className="flex flex-col overflow-hidden text-left rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span className="text-sm font-medium truncate">{profile.name}</span>
                <span
                  id={metaId}
                  className="flex items-center gap-1 text-left text-[10px] text-muted-foreground uppercase"
                >
                  {profile.provider}
                  {!profile.enabled && (
                    <Badge variant="outline" className="text-[8px] h-3 px-1">
                      Disabled
                    </Badge>
                  )}
                  {activeId === profile.id && (
                    <Badge className="text-[8px] h-3 px-1 bg-success text-success-foreground hover:bg-success">
                      Active
                    </Badge>
                  )}
                </span>
              </button>
              <div className="flex items-center opacity-100 md:opacity-0 transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-within:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateProfile(profile);
                  }}
                  title="Duplicate"
                  aria-label={`Duplicate profile ${profile.name}`}
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProfile(profile.id);
                  }}
                  disabled={activeId === profile.id}
                  title="Delete"
                  aria-label={`Delete profile ${profile.name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          Fallback Chain
          <span title="If the active profile fails, these will be tried in order.">
            <AlertCircle className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">
              If the active profile fails, these will be tried in order.
            </span>
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
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onReorderFallback(fid, 'up')}
                    disabled={idx === 0}
                    aria-label={`Move ${profile.name} up in the fallback chain`}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onReorderFallback(fid, 'down')}
                    disabled={idx === fallbackIds.length - 1}
                    aria-label={`Move ${profile.name} down in the fallback chain`}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-destructive"
                    onClick={() => onToggleFallback(fid)}
                    aria-label={`Remove ${profile.name} from the fallback chain`}
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
