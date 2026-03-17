import React from 'react';
import { ResumeData } from '@/types/resume';
import { Section } from './Section';
import { EducationItem } from './EducationItem';

import { cn } from '@/lib/utils';
import { SidebarSection } from './SidebarSection';

interface EducationSectionProps {
  education: ResumeData['education'];
  onUpdate: (updatedEducation: ResumeData['education']) => void;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
  isSidebar?: boolean;
  themeColor?: string;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  education,
  onUpdate,
  layout,
  isSidebar,
  themeColor,
}) => {
  if (!education || education.length === 0) return null;

  const handleUpdate = (index: number, updatedItem: ResumeData['education'][0]) => {
    const newEducation = [...education];
    newEducation[index] = updatedItem;
    onUpdate(newEducation);
  };

  if (layout === 'modern') {
    return (
      <SidebarSection title="Education">
        {education.map((item, index) => (
          <EducationItem
            key={index}
            item={item}
            onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
            layout={layout}
          />
        ))}
      </SidebarSection>
    );
  } else if (layout === 'creative') {
    return (
      <section className="mb-8">
        <h3
          className={cn(
            'text-sm font-bold uppercase mb-4',
            isSidebar ? 'text-white' : 'text-slate-800'
          )}
          style={{ color: isSidebar ? 'white' : themeColor }}
        >
          Education
        </h3>
        <div className="space-y-4">
          {education.map((item, index) => (
            <EducationItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
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
          Education
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-item)' }}>
          {education.map((item, index) => (
            <EducationItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
              layout={layout}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <Section title="Education">
      <div className="space-y-6">
        {education.map((item, index) => (
          <EducationItem
            key={index}
            item={item}
            onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
            layout={layout}
          />
        ))}
      </div>
    </Section>
  );
};
