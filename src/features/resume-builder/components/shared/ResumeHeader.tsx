import React from 'react';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github } from 'lucide-react';

interface ResumeHeaderProps {
  basics: ResumeData['basics'];
  onUpdate: (updatedBasics: ResumeData['basics']) => void;
  themeColor?: string;
  layout: 'classic' | 'modern' | 'minimalist' | 'creative';
}

export const ResumeHeader: React.FC<ResumeHeaderProps> = ({
  basics,
  onUpdate,
  themeColor,
  layout,
}) => {
  if (layout === 'minimalist') {
    return (
      <header className="mb-16">
        <InlineEdit
          as="h1"
          className="text-4xl font-light tracking-tight text-slate-900 mb-3 block w-full"
          value={basics.name || ''}
          onSave={(val) => onUpdate({ ...basics, name: val })}
        />
        <InlineEdit
          as="p"
          className="text-lg text-slate-500 mb-6 block w-full"
          style={{ color: themeColor }}
          value={basics.label || ''}
          onSave={(val) => onUpdate({ ...basics, label: val })}
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          {basics.email && (
            <a
              href={`mailto:${basics.email}`}
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
            >
              <Mail size={14} /> {basics.email}
            </a>
          )}
          {basics.phone && (
            <span className="flex items-center gap-1.5">
              <Phone size={14} /> {basics.phone}
            </span>
          )}
          {basics.location && (
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {[basics.location.city, basics.location.countryCode].filter(Boolean).join(', ')}
            </span>
          )}
          {basics.url && (
            <a
              href={basics.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
            >
              <LinkIcon size={14} /> {basics.url.replace(/^https?:\/\//, '')}
            </a>
          )}
          {basics.profiles?.map((profile, i) => (
            <a
              key={i}
              href={profile.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
            >
              {profile.network.toLowerCase().includes('github') ? (
                <Github size={14} />
              ) : profile.network.toLowerCase().includes('linkedin') ? (
                <Linkedin size={14} />
              ) : (
                <LinkIcon size={14} />
              )}
              {profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1] || profile.network}
            </a>
          ))}
        </div>
      </header>
    );
  } else if (layout === 'modern') {
    return (
      <header className="mb-10 pb-8 border-b border-slate-200">
        <div className="flex items-start gap-8">
          {basics.image && (
            <div className="relative shrink-0">
              <img
                src={basics.image}
                alt={basics.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-lg"
              />
            </div>
          )}
          <div className="flex-1 min-w-0 pt-2">
            <InlineEdit
              as="h1"
              className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-3 break-words block w-full"
              value={basics.name || ''}
              onSave={(val) => onUpdate({ ...basics, name: val })}
            />
            <InlineEdit
              as="p"
              className="text-xl font-semibold tracking-wide uppercase text-sm mb-4 block w-full"
              value={basics.label || ''}
              onSave={(val) => onUpdate({ ...basics, label: val })}
            />
          </div>
        </div>
      </header>
    );
  } else if (layout === 'creative') {
    return (
      <div className="mb-10 text-center">
        {basics.image && (
          <div className="mb-4 inline-block relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl mx-auto">
              <img src={basics.image} alt={basics.name} className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <InlineEdit
          as="h1"
          className="text-2xl font-bold tracking-wide mb-2 text-white block w-full"
          value={basics.name || ''}
          onSave={(val) => onUpdate({ ...basics, name: val })}
        />
        <InlineEdit
          as="p"
          className="text-sm font-medium tracking-wider uppercase opacity-80 block w-full"
          style={{ color: themeColor }}
          value={basics.label || ''}
          onSave={(val) => onUpdate({ ...basics, label: val })}
        />
      </div>
    );
  } else if (layout === 'classic') {
    return (
      <header
        className="border-b-2 border-slate-800 pb-4"
        style={{ marginBottom: 'var(--spacing-section)' }}
      >
        <InlineEdit
          as="h1"
          className="uppercase tracking-wide mb-2 block w-full"
          style={{
            color: 'var(--color-name)',
            fontSize: 'var(--size-name)',
            fontFamily: 'var(--font-name)',
            fontWeight: 'var(--weight-name)',
          }}
          value={basics.name || ''}
          onSave={(val) => onUpdate({ ...basics, name: val })}
        />
        <InlineEdit
          as="p"
          className="mb-4 block w-full font-medium"
          style={{ color: 'var(--color-heading)', fontSize: 'calc(var(--size-name) * 0.5)' }}
          value={basics.label || ''}
          onSave={(val) => onUpdate({ ...basics, label: val })}
        />

        <div
          className="flex flex-wrap gap-4"
          style={{ fontSize: 'calc(var(--size-body) * 0.95)', color: 'var(--color-body)' }}
        >
          {basics.email && (
            <div className="flex items-center gap-1">
              <Mail size={14} /> {basics.email}
            </div>
          )}
          {basics.phone && (
            <div className="flex items-center gap-1">
              <Phone size={14} /> {basics.phone}
            </div>
          )}
          {basics.location && (
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              {[basics.location.city, basics.location.countryCode].filter(Boolean).join(', ')}
            </div>
          )}
          {basics.url && (
            <div className="flex items-center gap-1">
              <LinkIcon size={14} /> {basics.url.replace(/^https?:\/\//, '')}
            </div>
          )}
          {basics.profiles?.map((profile, i) => (
            <div key={i} className="flex items-center gap-1">
              {profile.network.toLowerCase().includes('github') ? (
                <Github size={14} />
              ) : profile.network.toLowerCase().includes('linkedin') ? (
                <Linkedin size={14} />
              ) : (
                <LinkIcon size={14} />
              )}
              {profile.url.replace(/^https?:\/\/(www\.)?/, '')}
            </div>
          ))}
        </div>
      </header>
    );
  }
};
