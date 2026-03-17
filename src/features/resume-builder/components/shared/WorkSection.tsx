import React from 'react';
import { ResumeData } from '@/types/resume';
import { Section } from './Section';
import { WorkItem } from './WorkItem';

interface WorkSectionProps {
  work: ResumeData['work'];
  onUpdate: (updatedWork: ResumeData['work']) => void;
  themeColor?: string;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
}

export const WorkSection: React.FC<WorkSectionProps> = ({ work, onUpdate, themeColor, layout }) => {
  if (!work || work.length === 0) return null;

  const handleUpdate = (index: number, updatedItem: ResumeData['work'][0]) => {
    const newWork = [...work];
    newWork[index] = updatedItem;
    onUpdate(newWork);
  };

  if (layout === 'modern') {
    return (
      <section className="mb-12">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
          <span className="w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }}></span>{' '}
          Experience
        </h2>
        <div className="space-y-8 relative pl-2">
          <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
          {work.map((item, index) => (
            <WorkItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
              themeColor={themeColor}
              layout={layout}
            />
          ))}
        </div>
      </section>
    );
  } else if (layout === 'creative') {
    return (
      <section className="mb-10">
        <h3
          className="text-lg font-bold uppercase mb-6 flex items-center gap-2"
          style={{ color: themeColor }}
        >
          Experience
        </h3>
        <div className="space-y-8 border-l-2 pl-6 ml-2" style={{ borderColor: themeColor + '40' }}>
          {work.map((item, index) => (
            <WorkItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
              themeColor={themeColor}
              layout={layout}
            />
          ))}
        </div>
      </section>
    );
  } else if (layout === 'classic') {
    return (
      <section style={{ marginBottom: 'var(--spacing-section)' }}>
        <h2
          className="uppercase border-b border-slate-300 mb-4 pb-1"
          style={{
            color: 'var(--color-heading)',
            fontSize: 'var(--size-heading)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 'var(--weight-heading)',
          }}
        >
          Experience
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-item)' }}>
          {work.map((item, index) => (
            <WorkItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
              themeColor={themeColor}
              layout={layout}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <Section title="Experience">
      <div className="space-y-8">
        {work.map((item, index) => (
          <WorkItem
            key={index}
            item={item}
            onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
            themeColor={themeColor}
            layout={layout}
          />
        ))}
      </div>
    </Section>
  );
};
