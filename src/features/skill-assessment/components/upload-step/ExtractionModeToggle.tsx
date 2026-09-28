import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExtractionMode } from '@/features/skill-assessment/types';

interface ExtractionModeToggleProps {
  value: ExtractionMode;
  onValueChange: (val: ExtractionMode) => void;
}

const MODE_DESCRIPTIONS: Record<ExtractionMode, string> = {
  auto: 'Combines both: asks the AI, and falls back to the local parser if the AI call fails or no key is configured.',
  ai: 'Sends the full resume text to your configured AI provider to extract skills. Requires an API key.',
  regex: 'Reads the file only on this device — it scans the skills / technologies / tools / expertise sections. Private, but it often finds nothing when your CV has no such section, and you can enter skills by hand instead.',
};

export const ExtractionModeToggle: React.FC<ExtractionModeToggleProps> = ({
  value,
  onValueChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-3 bg-muted/30 p-3 rounded-lg inline-flex w-full sm:w-auto">
      <Label htmlFor="extraction-mode" className="whitespace-nowrap font-medium text-sm">
        Extraction Method:
      </Label>
      <div className="w-full sm:w-48">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger id="extraction-mode" className="bg-background">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto (AI + Regex)</SelectItem>
            <SelectItem value="ai">AI Only</SelectItem>
            <SelectItem value="regex">Regex Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p aria-live="polite" className="text-xs text-muted-foreground sm:max-w-xs">
        {MODE_DESCRIPTIONS[value]}
      </p>
    </div>
  );
};
