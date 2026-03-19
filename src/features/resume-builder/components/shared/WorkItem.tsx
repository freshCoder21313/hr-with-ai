import React from 'react';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';

interface WorkItemProps {
  item: ResumeData['work'][0];
  onUpdate: (updatedItem: ResumeData['work'][0]) => void;
  themeColor?: string;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
}

export const WorkItem: React.FC<WorkItemProps> = ({ item, onUpdate, themeColor, layout }) => {
  if (layout === 'minimalist') {
    return (
      <div className="flex flex-col md:flex-row print:flex-row gap-4 work-item">
        <div className="md:w-1/4 print:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
          {[item.startDate, item.endDate].filter(Boolean).join(' — ')}
        </div>
        <div className="md:w-3/4 print:w-3/4">
          <InlineEdit
            as="h3"
            className="font-semibold text-slate-900 text-base inline-block"
            value={item.position || ''}
            onSave={(val) => onUpdate({ ...item, position: val })}
          />
          <InlineEdit
            as="div"
            className="text-sm text-slate-600 mb-3 inline-block"
            style={{ color: themeColor }}
            value={item.name || ''}
            onSave={(val) => onUpdate({ ...item, name: val })}
          />
          <InlineEdit
            as="p"
            multiline
            className="text-sm text-slate-700 leading-relaxed mb-3 w-full"
            value={item.summary || ''}
            onSave={(val) => onUpdate({ ...item, summary: val })}
          />
          {item.highlights && (
            <ul className="list-disc ml-4 space-y-1.5 text-sm text-slate-700">
              {item.highlights.map((h, k) => (
                <li key={k}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  } else if (layout === 'modern') {
    return (
      <div className="relative pl-8 group work-item">
        <div className="absolute -left-[5px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-slate-200 group-hover:border-blue-400 transition-colors"></div>
        <div className="flex justify-between items-baseline mb-2">
          <InlineEdit
            as="h3"
            className="font-bold text-slate-800 text-lg leading-tight inline-block"
            value={item.position || ''}
            onSave={(val) => onUpdate({ ...item, position: val })}
          />
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <InlineEdit
          as="p"
          className="text-sm font-medium mb-3 inline-block"
          style={{ color: themeColor }}
          value={item.name || ''}
          onSave={(val) => onUpdate({ ...item, name: val })}
        />
        <InlineEdit
          as="p"
          multiline
          className="text-sm text-slate-600 mb-3 leading-relaxed w-full"
          value={item.summary || ''}
          onSave={(val) => onUpdate({ ...item, summary: val })}
        />
        {item.highlights && item.highlights.length > 0 && (
          <ul className="space-y-2">
            {item.highlights.map((highlight, idx) => (
              <li
                key={idx}
                className="text-sm text-slate-600 leading-relaxed flex items-start gap-2"
              >
                <span className="text-blue-400 mt-1.5 text-[10px]">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } else if (layout === 'creative') {
    return (
      <div className="relative work-item">
        <div
          className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full border-2 bg-white"
          style={{ borderColor: themeColor }}
        ></div>
        <div className="mb-2">
          <InlineEdit
            as="h4"
            className="font-bold text-slate-800 text-base inline-block"
            value={item.position || ''}
            onSave={(val) => onUpdate({ ...item, position: val })}
          />
          <InlineEdit
            as="div"
            className="text-sm font-semibold inline-block"
            style={{ color: themeColor }}
            value={item.name || ''}
            onSave={(val) => onUpdate({ ...item, name: val })}
          />
          <span className="text-xs text-slate-500 block mt-1">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <InlineEdit
          as="p"
          multiline
          className="text-sm text-slate-600 mb-2 w-full"
          value={item.summary || ''}
          onSave={(val) => onUpdate({ ...item, summary: val })}
        />
        {item.highlights && (
          <ul className="list-disc ml-4 space-y-1">
            {item.highlights.map((h, k) => (
              <li key={k} className="text-xs text-slate-600">
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  } else if (layout === 'classic') {
    return (
      <div className="work-item">
        <div className="flex justify-between items-baseline mb-1">
          <InlineEdit
            as="h3"
            className="font-bold inline-block"
            style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
            value={item.name || ''}
            onSave={(val) => onUpdate({ ...item, name: val })}
          />
          <span className="text-sm text-slate-500 italic">
            {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
          </span>
        </div>
        <div className="flex justify-between items-baseline mb-2">
          <InlineEdit
            as="p"
            className="font-semibold inline-block"
            style={{ fontSize: 'var(--size-body)', color: 'var(--color-body)' }}
            value={item.position || ''}
            onSave={(val) => onUpdate({ ...item, position: val })}
          />
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
          value={item.summary || ''}
          onSave={(val) => onUpdate({ ...item, summary: val })}
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

  // Default layout (can be classic or modern)
  return (
    <div className="work-item mb-6">
      <div className="flex justify-between items-baseline">
        <InlineEdit
          as="h3"
          className="font-bold text-base"
          value={item.position || ''}
          onSave={(val) => onUpdate({ ...item, position: val })}
        />
        <span className="text-sm text-slate-500">
          {[item.startDate, item.endDate].filter(Boolean).join(' - ')}
        </span>
      </div>
      <InlineEdit
        as="p"
        className="text-sm font-semibold"
        style={{ color: themeColor }}
        value={item.name || ''}
        onSave={(val) => onUpdate({ ...item, name: val })}
      />
      <InlineEdit
        as="p"
        multiline
        className="text-sm text-slate-700 mt-2"
        value={item.summary || ''}
        onSave={(val) => onUpdate({ ...item, summary: val })}
      />
      {item.highlights && item.highlights.length > 0 && (
        <ul className="list-disc ml-5 mt-2 space-y-1">
          {item.highlights.map((highlight, idx) => (
            <li key={idx} className="text-sm text-slate-600">
              {highlight}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
