import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ExtractionMode = 'auto' | 'ai' | 'regex';

interface ExtractionModeToggleProps {
  value: ExtractionMode;
  onValueChange: (val: ExtractionMode) => void;
}

export const ExtractionModeToggle: React.FC<ExtractionModeToggleProps> = ({
  value,
  onValueChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-muted/30 p-3 rounded-lg inline-flex w-full sm:w-auto">
      <Label htmlFor="extraction-mode" className="whitespace-nowrap font-medium text-sm">
        Extraction Method:
      </Label>
      <div className="w-full sm:w-48">
        <Select
          value={value}
          onValueChange={onValueChange}
        >
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
    </div>
  );
};
