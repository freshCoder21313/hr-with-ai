import React from 'react';
import { ResumeData } from '@/types/resume';
import { Section } from './Section';
import { ProjectItem } from './ProjectItem';

interface ProjectsSectionProps {
  projects: ResumeData['projects'];
  onUpdate: (updatedProjects: ResumeData['projects']) => void;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
  themeColor?: string;
}

export const ProjectsSection: React.FC<ProjectsSectionProps> = ({
  projects,
  onUpdate,
  layout,
  themeColor,
}) => {
  if (!projects || projects.length === 0) return null;

  const handleUpdate = (index: number, updatedItem: ResumeData['projects'][0]) => {
    const newProjects = [...projects];
    newProjects[index] = updatedItem;
    onUpdate(newProjects);
  };

  if (layout === 'modern') {
    return (
      <section className="mb-12">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
          <span className="w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }}></span>{' '}
          Projects
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {projects.map((item, index) => (
            <ProjectItem
              key={index}
              item={item}
              onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
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
          Projects
        </h3>
        <div className="grid gap-6">
          {projects.map((item, index) => (
            <ProjectItem
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
          Projects
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-item)' }}>
          {projects.map((item, index) => (
            <ProjectItem
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
    <Section title="Projects">
      <div className="space-y-8">
        {projects.map((item, index) => (
          <ProjectItem
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
