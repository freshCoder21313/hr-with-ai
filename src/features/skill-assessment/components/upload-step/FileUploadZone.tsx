import React from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  isLoading: boolean;
  selectedResumeId?: number;
  error: string | null;
  showManual: boolean;
  manualSkills: string;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onUploadClick: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onManualSkillsChange: (val: string) => void;
  onManualSubmit: () => void;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  isLoading,
  selectedResumeId,
  error,
  showManual,
  manualSkills,
  fileInputRef,
  onUploadClick,
  onDragOver,
  onDrop,
  onFileUpload,
  onManualSkillsChange,
  onManualSubmit,
}) => {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-primary" />
          New Upload
        </CardTitle>
        <CardDescription>Upload a PDF, TXT, or DOCX file (Max 5MB)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:bg-muted/50 hover:border-primary/50'}`}
          onClick={onUploadClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <UploadCloud className="w-8 h-8 text-primary" />
          </div>
          <p className="text-base font-medium text-foreground mb-1 text-center">
            Click or drag file to this area
          </p>
          <p className="text-sm text-muted-foreground text-center">
            We&apos;ll use AI to extract your skills automatically
          </p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.txt,.docx"
            onChange={onFileUpload}
            disabled={isLoading}
          />
        </div>

        {isLoading && !selectedResumeId && (
          <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <p className="text-sm font-medium">Extracting skills...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {showManual && (
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-sm font-medium">
              Extraction failed. Please enter your skills manually (comma separated):
            </Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={manualSkills}
                onChange={(e) => onManualSkillsChange(e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js"
                onKeyDown={(e) => e.key === 'Enter' && onManualSubmit()}
                className="flex-1"
              />
              <Button onClick={onManualSubmit} className="w-full sm:w-auto">
                Continue
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
