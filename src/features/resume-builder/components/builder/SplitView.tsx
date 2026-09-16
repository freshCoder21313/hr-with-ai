import React from 'react';
import ResumePreview from '../../ResumePreview';
import { Resume, ResumeData, TemplateType } from '@/types';

interface SplitViewProps {
  resume: Resume;
  data: ResumeData;
  template: TemplateType;
  onUpdate: (data: ResumeData) => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  resume,
  data,
  template,
  onUpdate,
}) => {
  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="w-1/2 border-r border-border flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground flex justify-between items-center">
          <span>Original Source (Raw Text)</span>
          <span className="text-xs">Read-only</span>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs md:text-sm text-foreground/80 leading-relaxed">
            {resume.rawText || 'No source text available.'}
          </pre>
        </div>
      </div>
      <div className="w-1/2 flex flex-col bg-muted/30">
        <div className="p-4 border-b border-border bg-muted/20 font-medium text-sm text-muted-foreground text-center">
          <span>Tailored Result (Preview)</span>
        </div>
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="scale-[0.65] origin-top shadow-xl w-full max-w-[210mm]">
            <ResumePreview
              data={data}
              template={template}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
