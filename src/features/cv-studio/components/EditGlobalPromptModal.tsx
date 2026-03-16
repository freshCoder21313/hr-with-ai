import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EditGlobalPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSave: (newPrompt: string) => void;
}

export const EditGlobalPromptModal: React.FC<EditGlobalPromptModalProps> = ({
  isOpen,
  onClose,
  currentPrompt,
  onSave,
}) => {
  const [prompt, setPrompt] = useState(currentPrompt);

  const handleSave = () => {
    onSave(prompt);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Global Prompt</DialogTitle>
          <DialogDescription>
            This prompt provides general instructions to the AI for all jobs processed in a batch.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="global-prompt">Global AI Prompt</Label>
            <Textarea
              id="global-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[250px] font-mono text-sm"
              placeholder="Enter your global prompt here..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
