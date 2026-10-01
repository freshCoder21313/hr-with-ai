import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVoiceInterviewStore } from '@/features/interview/stores/voiceInterviewStore';
import { textToSpeechService } from '@/services/voice/textToSpeechService';
import { loadUserSettings, saveUserSettings } from '@/services/core/settingsService';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { VoiceSettings } from '@/types';

const SILENCE_TIMEOUT_MIN = 1000;
const SILENCE_TIMEOUT_MAX = 10000;
const SILENCE_TIMEOUT_STEP = 500;

const DEFAULT_VOICE_VALUE = 'default';

interface VoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceSettingsDialog: React.FC<VoiceSettingsDialogProps> = ({ open, onOpenChange }) => {
  const voiceSettings = useVoiceInterviewStore((state) => state.voiceSettings);
  const setVoiceSettings = useVoiceInterviewStore((state) => state.setVoiceSettings);

  // Local working copy so a half-finished edit is not pushed to the interview
  // mid-conversation; committed on "Save". Reset when the dialog (re)opens using
  // the render-time "adjust state on prop change" pattern (no effect → no
  // cascading-render lint violation).
  const [draft, setDraft] = useState<VoiceSettings>(voiceSettings);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(voiceSettings);
  }

  // Chrome populates speechSynthesis voices asynchronously, so the list is read
  // on every open rather than once at module load.
  const voices = useMemo(() => (open ? textToSpeechService.getVoices() : []), [open]);

  const handleSave = async () => {
    // Session store first so the live interview reflects the change immediately.
    setVoiceSettings(draft);
    onOpenChange(false);
    // Persist as the user's default so future interviews inherit it.
    try {
      const stored = await loadUserSettings();
      await saveUserSettings({ ...stored, defaultVoiceSettings: draft });
    } catch (error) {
      logger.error('Failed to persist default voice settings:', error);
      toast.error('Voice settings applied for this session but could not be saved as default.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Settings</DialogTitle>
          <DialogDescription>
            Tune how the interviewer listens and speaks. Saved as your default for future
            interviews.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          <div className="flex flex-col gap-3" role="group" aria-label="Speech rate">
            <div className="flex items-center justify-between">
              <Label>Speech rate</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {draft.speechRate.toFixed(1)}x
              </span>
            </div>
            <Slider
              aria-label="Speech rate"
              min={0.5}
              max={2}
              step={0.1}
              value={[draft.speechRate]}
              onValueChange={([value]) => setDraft((prev) => ({ ...prev, speechRate: value }))}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Label htmlFor="voice-select">AI voice</Label>
            <Select
              value={draft.voiceId ?? DEFAULT_VOICE_VALUE}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  voiceId: value === DEFAULT_VOICE_VALUE ? undefined : value,
                }))
              }
            >
              <SelectTrigger id="voice-select" aria-label="AI voice">
                <SelectValue placeholder="System default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_VOICE_VALUE}>System default</SelectItem>
                {voices.map((voice) => (
                  <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} ({voice.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {voices.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No system voices reported by this browser yet.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="voice-push-to-talk">Push to talk</Label>
              <p className="text-xs text-muted-foreground">
                On: tap the mic for every answer. Off: the mic reopens after the AI finishes.
              </p>
            </div>
            <Switch
              id="voice-push-to-talk"
              checked={draft.pushToTalk}
              onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, pushToTalk: checked }))}
            />
          </div>

          <div className="flex flex-col gap-3" role="group" aria-label="Silence timeout">
            <div className="flex items-center justify-between">
              <Label>Silence timeout</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {(draft.silenceTimeout / 1000).toFixed(1)}s
              </span>
            </div>
            <Slider
              aria-label="Silence timeout"
              min={SILENCE_TIMEOUT_MIN}
              max={SILENCE_TIMEOUT_MAX}
              step={SILENCE_TIMEOUT_STEP}
              value={[draft.silenceTimeout]}
              onValueChange={([value]) => setDraft((prev) => ({ ...prev, silenceTimeout: value }))}
            />
            <p className="text-xs text-muted-foreground">
              How long the mic keeps listening after you stop talking before it closes the turn.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDraft(useVoiceInterviewStore.getState().voiceSettings)}
          >
            Revert
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
