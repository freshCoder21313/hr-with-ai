import React from 'react';
import {
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Plus,
  Play,
  AlertCircle,
} from 'lucide-react';
import { AIProviderProfile, AIModelProvider } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface ProfileEditorProps {
  profile: AIProviderProfile;
  activeId?: string;
  fallbackIds: string[];
  isTesting: boolean;
  isFetchingModels: boolean;
  fetchedModels?: string[];
  onUpdateProfile: (id: string, updates: Partial<AIProviderProfile>) => void;
  onSetActive: (id: string) => void;
  onTestConnection: (profile: AIProviderProfile) => void;
  onFetchModels: (profile: AIProviderProfile) => void;
  onAddModels: (id: string, newModelIds: string[]) => void;
  onToggleFallback: (id: string) => void;
}

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  profile,
  activeId,
  fallbackIds,
  isTesting,
  isFetchingModels,
  fetchedModels,
  onUpdateProfile,
  onSetActive,
  onTestConnection,
  onFetchModels,
  onAddModels,
  onToggleFallback,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Edit Profile</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={activeId === profile.id ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onSetActive(profile.id)}
            disabled={activeId === profile.id || !profile.enabled}
          >
            {activeId === profile.id ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" /> Active
              </>
            ) : (
              'Set as Active'
            )}
          </Button>
          <div className="flex items-center gap-2 ml-2">
            <Label htmlFor="profile-enabled" className="text-xs">
              Enabled
            </Label>
            <Switch
              id="profile-enabled"
              checked={profile.enabled}
              onCheckedChange={(c) => onUpdateProfile(profile.id, { enabled: c })}
              disabled={activeId === profile.id}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`profile-name-${profile.id}`}>Profile Name</Label>
          <Input
            id={`profile-name-${profile.id}`}
            value={profile.name}
            onChange={(e) => onUpdateProfile(profile.id, { name: e.target.value })}
            placeholder="e.g., Gemini Pro (Work)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`profile-provider-${profile.id}`}>Provider</Label>
          <Select
            value={profile.provider}
            onValueChange={(v) => onUpdateProfile(profile.id, { provider: v as AIModelProvider })}
          >
            <SelectTrigger id={`profile-provider-${profile.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="google">Google Gemini</SelectItem>
              <SelectItem value="openai">OpenAI Compatible</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
              <SelectItem value="anthropic">Anthropic Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`profile-apiKey-${profile.id}`}>API Key</Label>
          <a
            href={
              profile.provider === 'google'
                ? 'https://aistudio.google.com/app/apikey'
                : profile.provider === 'openrouter'
                  ? 'https://openrouter.ai/keys'
                  : profile.provider === 'anthropic'
                    ? 'https://console.anthropic.com/settings/keys'
                    : 'https://platform.openai.com/api-keys'
            }
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary hover:underline flex items-center gap-1"
          >
            Get Key <ExternalLink className="w-2 h-2" />
          </a>
        </div>
        <Input
          id={`profile-apiKey-${profile.id}`}
          type="password"
          value={profile.apiKey}
          onChange={(e) => onUpdateProfile(profile.id, { apiKey: e.target.value })}
          placeholder={profile.provider === 'google' ? 'AIzaSy...' : 'sk-...'}
        />
      </div>

      {(profile.provider === 'openai' ||
        profile.provider === 'openrouter' ||
        profile.provider === 'google') && (
        <div className="space-y-2">
          <Label htmlFor={`profile-baseUrl-${profile.id}`}>
            Base URL {profile.provider === 'openai' && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id={`profile-baseUrl-${profile.id}`}
            value={profile.baseUrl || ''}
            onChange={(e) => onUpdateProfile(profile.id, { baseUrl: e.target.value })}
            placeholder={
              profile.provider === 'openrouter'
                ? 'https://openrouter.ai/api/v1'
                : profile.provider === 'google'
                  ? 'https://generativelanguage.googleapis.com'
                  : 'https://api.openai.com/v1'
            }
          />
          {profile.baseUrl && (
            <p className="text-[10px] text-orange-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Security: Only use URLs you trust.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`profile-modelIds-${profile.id}`}>Model IDs (One per line, first is primary)</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[10px] gap-1 px-2"
            onClick={() => onFetchModels(profile)}
            disabled={isFetchingModels}
          >
            <RefreshCw className={cn('w-3 h-3', isFetchingModels && 'animate-spin')} />
            Fetch Models
          </Button>
        </div>

        {fetchedModels && fetchedModels.length > 0 && (
          <div className="bg-muted/30 border border-border rounded-md p-2 mb-2 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                Available Models
              </span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[10px]"
                onClick={() => onAddModels(profile.id, fetchedModels)}
              >
                Add All
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {fetchedModels.map((mid) => {
                const isAdded = profile.modelIds.includes(mid);
                return (
                  <Badge
                    key={mid}
                    variant={isAdded ? 'secondary' : 'outline'}
                    className={cn(
                      'text-[9px] py-0 cursor-pointer hover:bg-primary/20 transition-colors',
                      isAdded && 'opacity-60 cursor-default'
                    )}
                    onClick={() => !isAdded && onAddModels(profile.id, [mid])}
                  >
                    {mid}
                    {!isAdded && <Plus className="w-2 h-2 ml-1" />}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
        <Textarea
          id={`profile-modelIds-${profile.id}`}
          value={profile.modelIds.join('\n')}
          onChange={(e) => {
            const ids = e.target.value
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean);
            onUpdateProfile(profile.id, { modelIds: ids });
          }}
          placeholder={
            profile.provider === 'google'
              ? 'gemini-1.5-pro\ngemini-1.5-flash'
              : profile.provider === 'openrouter'
                ? 'google/gemini-pro-1.5\nanthropic/claude-3-sonnet'
                : 'gpt-4o\ngpt-4-turbo'
          }
          rows={3}
          className="font-mono text-xs"
        />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
          <div className="flex flex-col">
            <span className="text-xs font-medium">Test Configuration</span>
            <span className="text-[10px] text-muted-foreground">
              Verify this profile works without fallback.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTestConnection(profile)}
            disabled={isTesting}
          >
            {isTesting ? (
              <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
            ) : (
              <Play className="w-3 h-3 mr-2" />
            )}
            Run Test
          </Button>
        </div>

        {activeId !== profile.id && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
            <div className="flex flex-col">
              <span className="text-xs font-medium">Use as Fallback</span>
              <span className="text-[10px] text-muted-foreground">
                Add to fallback chain if active profile fails.
              </span>
            </div>
            <Switch
              checked={fallbackIds.includes(profile.id)}
              onCheckedChange={() => onToggleFallback(profile.id)}
              disabled={!profile.enabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};
