import React from 'react';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';
import { LinkIcon } from 'lucide-react';

interface ProjectItemProps {
  item: ResumeData['projects'][0];
  onUpdate: (updatedItem: ResumeData['projects'][0]) => void;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
}

export const ProjectItem: React.FC<ProjectItemProps> = ({ item, onUpdate, layout }) => {
  if (layout === 'minimalist') {
    return (
      <div className="flex flex-col md:flex-row print:flex-row gap-4 project-item">
        <div className="md:w-1/4 print:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
          {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
        </div>
        <div className="md:w-3/4 print:w-3/4">
          <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
            {item.name}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <LinkIcon size={12} />
              </a>
            )}
          </h3>
          <InlineEdit
            as="p"
            multiline
            className="text-sm text-slate-700 leading-relaxed mt-2 mb-3 w-full"
            value={item.description || ''}
            onSave={(val) => onUpdate({ ...item, description: val })}
          />
          {item.highlights && (
            <ul className="list-disc ml-4 space-y-1.5 text-sm text-slate-700 mb-3">
              {item.highlights.map((h, k) => (
                <li key={k}>{h}</li>
              ))}
            </ul>
          )}
          {item.keywords && (
            <div className="flex flex-wrap gap-2">
              {item.keywords.map((kw, k) => (
                <span
                  key={k}
                  className="text-xs text-slate-500 border border-slate-200 px-2 py-1 rounded"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (layout === 'modern') {
    return (
      <div className="group project-item">
        <div className="flex justify-between items-baseline mb-2">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            {item.name}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-blue-600 transition-colors"
              >
                <LinkIcon size={14} />
              </a>
            )}
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <InlineEdit
          as="p"
          multiline
          className="text-sm text-slate-600 mb-3 leading-relaxed w-full"
          value={item.description || ''}
          onSave={(val) => onUpdate({ ...item, description: val })}
        />
        {item.highlights && (
          <div className="flex flex-wrap gap-2">
            {item.highlights.map((h, k) => (
              <span
                key={k}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 font-medium border border-slate-100"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  } else if (layout === 'creative') {
    return (
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 project-item">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-slate-800 text-sm">
            {item.name}
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer" className="ml-2 inline-block">
                <LinkIcon size={12} className="text-slate-400 hover:text-blue-500" />
              </a>
            )}
          </h4>
          <span className="text-xs text-slate-400">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <InlineEdit
          as="p"
          multiline
          className="text-xs text-slate-600 mb-2 w-full"
          value={item.description || ''}
          onSave={(val) => onUpdate({ ...item, description: val })}
        />
        {item.highlights && (
          <div className="flex flex-wrap gap-1">
            {item.highlights.map((h, k) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600"
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  } else if (layout === 'classic') {
    return (
      <div className="project-item">
        <div className="flex justify-between items-baseline mb-1">
          <h3
            className="font-bold"
            style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
          >
            {item.name}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-xs font-normal text-blue-600 hover:underline"
              >
                {item.url.replace(/^https?:\/\//, '')}
              </a>
            )}
          </h3>
          <span className="text-sm text-slate-500 italic">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <InlineEdit
          as="p"
          multiline
          className="mb-2 w-full"
          style={{
            fontSize: 'calc(var(--size-body) * 0.95)',
            color: 'var(--color-body)',
            lineHeight: 'var(--lh-body)',
          }}
          value={item.description || ''}
          onSave={(val) => onUpdate({ ...item, description: val })}
        />
        {item.highlights && item.highlights.length > 0 && (
          <ul className="list-disc ml-5 space-y-1">
            {item.highlights.map((highlight, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: 'calc(var(--size-body) * 0.95)',
                  color: 'var(--color-body)',
                  lineHeight: 'var(--lh-body)',
                }}
              >
                {highlight}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
};
