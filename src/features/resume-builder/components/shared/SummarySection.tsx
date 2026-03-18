import React from 'react';
import { ResumeData } from '@/types/resume';
import { Section } from './Section';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';

interface SummarySectionProps {
  summary: string;
  onUpdate: (updatedSummary: string) => void;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
  themeColor?: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  summary,
  onUpdate,
  layout,
  themeColor,
}) => {
  if (!summary) return null;

  if (layout === 'minimalist') {
    return (
      <Section title="Summary">
        <div className="text-sm text-slate-700 leading-loose">
          <InlineEdit
            as="div"
            multiline
            className="w-full"
            value={summary || ''}
            onSave={onUpdate}
          />
        </div>
      </Section>
    );
  } else if (layout === 'modern') {
    return (
      <div className="mb-10 text-slate-600 text-sm leading-relaxed max-w-prose">
        <InlineEdit as="div" multiline className="w-full" value={summary || ''} onSave={onUpdate} />
      </div>
    );
  } else if (layout === 'creative') {
    return (
      <div className="mb-8">
        <h3
          className="text-lg font-bold uppercase mb-3 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          About Me
        </h3>
        <div className="text-slate-700 leading-relaxed text-sm">
          <InlineEdit
            as="div"
            multiline
            className="w-full"
            value={summary || ''}
            onSave={onUpdate}
          />
        </div>
      </div>
    );
  } else if (layout === 'classic') {
    return (
      <section className="mb-6">
        <h2
          className="uppercase border-b border-slate-300 mb-3 pb-1"
          style={{
            color: 'var(--color-heading)',
            fontSize: 'var(--size-heading)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 'var(--weight-heading)',
          }}
        >
          Professional Summary
        </h2>
        <div
          className="text-slate-700 text-justify"
          style={{
            fontSize: 'var(--size-body)',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-body)',
            lineHeight: 'var(--lh-body)',
          }}
        >
          <InlineEdit
            as="div"
            multiline
            className="w-full"
            value={summary || ''}
            onSave={onUpdate}
          />
        </div>
      </section>
    );
  }
};
