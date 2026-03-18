import React from 'react';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';
import { cn } from '@/lib/utils';

interface EducationItemProps {
  item: ResumeData['education'][0];
  onUpdate: (updatedItem: ResumeData['education'][0]) => void;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
  isSidebar?: boolean;
}

export const EducationItem: React.FC<EducationItemProps> = ({
  item,
  onUpdate,
  layout,
  isSidebar,
}) => {
  if (layout === 'minimalist') {
    return (
      <div className="flex flex-col md:flex-row print:flex-row gap-4 education-item">
        <div className="md:w-1/4 print:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
          {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
        </div>
        <div className="md:w-3/4 print:w-3/4">
          <InlineEdit
            as="h3"
            className="font-semibold text-slate-900 text-base inline-block"
            value={item.institution || ''}
            onSave={(val) => onUpdate({ ...item, institution: val })}
          />
          <div className="text-sm text-slate-700 mt-1">
            {item.studyType} in {item.area}
          </div>
          {item.score && <div className="text-sm text-slate-500 mt-1">Score: {item.score}</div>}
        </div>
      </div>
    );
  } else if (layout === 'modern') {
    return (
      <div className="education-item">
        <h4 className="font-bold text-sm text-white">{item.institution}</h4>
        <p className="text-xs text-slate-400">
          {item.studyType} in {item.area}
        </p>
        <p className="text-xs text-slate-500 italic mt-1">
          {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
        </p>
      </div>
    );
  } else if (layout === 'creative') {
    return (
      <div className="education-item">
        <div className={cn('font-bold text-sm', isSidebar ? 'text-white' : 'text-slate-800')}>
          <InlineEdit
            as="span"
            value={item.institution || ''}
            onSave={(val) => onUpdate({ ...item, institution: val })}
          />
        </div>
        <div className={cn('text-xs', isSidebar ? 'text-slate-300' : 'text-slate-600')}>
          {item.studyType} in {item.area}
        </div>
        <div
          className={cn('text-xs opacity-70 mt-1', isSidebar ? 'text-slate-400' : 'text-slate-500')}
        >
          {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
        </div>
      </div>
    );
  } else if (layout === 'classic') {
    return (
      <div className="education-item">
        <div className="flex justify-between items-baseline">
          <InlineEdit
            as="h3"
            className="font-bold inline-block"
            style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
            value={item.institution || ''}
            onSave={(val) => onUpdate({ ...item, institution: val })}
          />
          <span className="text-sm text-slate-500 italic">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <div className="flex justify-between">
          <p style={{ fontSize: 'var(--size-body)', color: 'var(--color-body)' }}>
            {item.studyType} in {item.area}
          </p>
          {item.score && <span className="text-sm text-slate-500">GPA: {item.score}</span>}
        </div>
      </div>
    );
  }
};
