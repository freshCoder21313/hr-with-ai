import React from 'react';
import { Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingButton } from '@/components/ui/loading-button';
import { isNonEmptyString } from '@/lib/validation';

interface JDInputProps {
  value: string;
  isExtracting: boolean;
  onAutoFill: () => void;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const JDInput: React.FC<JDInputProps> = ({
  value,
  isExtracting,
  onAutoFill,
  onChange,
}) => {
  return (
    <div className="space-y-2 md:space-y-3">
      <div className="flex justify-between items-center">
        <Label htmlFor="jobDescription">Job Description</Label>
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onAutoFill}
          disabled={isExtracting || !isNonEmptyString(value)}
          isLoading={isExtracting}
          loadingText="Auto-fill from JD"
          className="text-primary border-primary/20 hover:bg-primary/10 dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10"
          leftIcon={<Sparkles className="w-4 h-4" />}
        >
          Auto-fill from JD
        </LoadingButton>
      </div>
      <Textarea
        id="jobDescription"
        name="jobDescription"
        value={value}
        onChange={onChange}
        rows={5}
        placeholder="Paste the JD here..."
        className="font-mono text-sm"
      />
    </div>
  );
};
