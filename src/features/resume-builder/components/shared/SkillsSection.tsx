import React from 'react';
import { ResumeData } from '@/types/resume';
import { Section } from './Section';
import { cn } from '@/lib/utils';

import { SidebarSection } from './SidebarSection';

interface SkillsSectionProps {
  skills: ResumeData['skills'];
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
  isSidebar?: boolean;
  themeColor?: string;
}

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  skills,
  layout,
  isSidebar,
  themeColor,
}) => {
  if (!skills || skills.length === 0) return null;

  if (layout === 'minimalist') {
    return (
      <Section title="Skills">
        <div className="space-y-4">
          {skills.map((skill, i) => (
            <div key={i} className="flex flex-col md:flex-row print:flex-row gap-4 skill-item">
              <div className="md:w-1/4 print:w-1/4 shrink-0 font-medium text-sm text-slate-900 pt-1">
                {skill.name}
              </div>
              <div className="md:w-3/4 print:w-3/4 text-sm text-slate-700 leading-relaxed pt-1">
                {skill.keywords?.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  if (layout === 'modern') {
    return (
      <SidebarSection title="Skills">
        <div className="space-y-3">
          {skills.map((skill, i) => (
            <div key={i} className="skill-item">
              <h4 className="font-semibold text-xs text-slate-200 mb-1">{skill.name}</h4>
              <div className="flex flex-wrap gap-1">
                {skill.keywords?.map((kw, k) => (
                  <span
                    key={k}
                    className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SidebarSection>
    );
  }

  if (layout === 'creative') {
    return (
      <section className="mb-8">
        <h3
          className={cn(
            'text-sm font-bold uppercase mb-4',
            isSidebar ? 'text-white' : 'text-slate-800'
          )}
          style={{ color: isSidebar ? 'white' : themeColor }}
        >
          Skills
        </h3>
        <div className="space-y-4">
          {skills.map((skill, i) => (
            <div key={i} className="skill-item">
              <div
                className={cn(
                  'text-xs font-semibold mb-1',
                  isSidebar ? 'text-slate-200' : 'text-slate-700'
                )}
              >
                {skill.name}
              </div>
              <div className="flex flex-wrap gap-1">
                {skill.keywords?.map((kw, k) => (
                  <span
                    key={k}
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded',
                      isSidebar ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
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
          Skills
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            rowGap: 'calc(var(--spacing-item) * 0.75)',
          }}
        >
          {skills.map((skill, i) => (
            <div key={i} className="flex flex-col sm:items-baseline">
              <span
                className="font-bold min-w-[120px]"
                style={{ fontSize: 'var(--size-body)', color: 'var(--color-body)' }}
              >
                {skill.name}:
              </span>
              <p
                style={{
                  fontSize: 'calc(var(--size-body) * 0.95)',
                  color: 'var(--color-body)',
                  lineHeight: 'var(--lh-body)',
                }}
              >
                {skill.keywords?.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </section>
    );
  }
};
