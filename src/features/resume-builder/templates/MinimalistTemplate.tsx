import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableSection } from '../components/SortableSection';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '../components/InlineEdit';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github } from 'lucide-react';

interface TemplateProps {
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  themeColor?: string;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

const MinimalistHeader = React.memo(function MinimalistHeader({
  basics,
  onUpdate,
  themeColor,
}: {
  basics: ResumeData['basics'];
  onUpdate?: (basics: ResumeData['basics']) => void;
  themeColor: string;
}) {
  return (
    <header className="mb-16">
      <InlineEdit
        as="h1"
        className="text-4xl font-light tracking-tight text-slate-900 mb-3 block w-full" value={basics.name || ''}
        onSave={(val) => onUpdate?.({ ...basics, name: val })}
      />
      <InlineEdit
        as="p"
        className="text-lg text-slate-500 mb-6 block w-full" style={{ color: themeColor }} value={basics.label || ''}
        onSave={(val) => onUpdate?.({ ...basics, label: val })}
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
});

const MinimalistTemplate: React.FC<TemplateProps> = ({
  data,
  themeColor = '#1e293b',
  onUpdate,
  onOrderChange,
}) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultOrder = ['header', 'summary', 'experience', 'projects', 'education', 'skills'];

  let mainOrder = defaultOrder;
  if (meta?.sectionOrder) {
    mainOrder = [...(meta.sectionOrder.main || []), ...(meta.sectionOrder.sidebar || [])];
    mainOrder = Array.from(new Set(mainOrder));
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndMain = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = mainOrder.indexOf(String(active.id));
      const newIndex = mainOrder.indexOf(String(over.id));
      const newOrder = arrayMove(mainOrder, oldIndex, newIndex);
      onOrderChange?.([], newOrder);
    }
  };

  const renderSection = (id: string) => {
    switch (id) {
      case 'header':
        return (
          <MinimalistHeader
            key={id}
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            themeColor={themeColor}
          />
        );
      case 'summary':
        if (!basics.summary) return null;
        return (
          <section key="summary" className="mb-10 break-inside-avoid">
            <h2 className="text-xs tracking-widest uppercase font-bold text-slate-400 mb-4">
              Summary
            </h2>
            <div className="text-sm text-slate-700 leading-loose">
              <InlineEdit
                as="div"
                multiline
                className="w-full"
                value={basics.summary || ''}
                onSave={(val) => onUpdate?.({ ...data, basics: { ...basics, summary: val } })}
              />
            </div>
          </section>
        );

      case 'work':
      case 'experience':
        if (work.length === 0) return null;
        return (
          <section key="work" className="mb-10 break-inside-avoid">
            <h2 className="text-xs tracking-widest uppercase font-bold text-slate-400 mb-6">
              Experience
            </h2>
            <div className="space-y-8">
              {work.map((job, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
                    {[job.startDate, job.endDate].filter(Boolean).join(' — ')}
                  </div>
                  <div className="md:w-3/4">
                    <InlineEdit
                      as="h3"
                      className="font-semibold text-slate-900 text-base inline-block"
                      value={job.position || ''}
                      onSave={(val) => {
                        const newWork = [...work];
                        newWork[i] = { ...job, position: val };
                        onUpdate?.({ ...data, work: newWork });
                      }}
                    />
                    <InlineEdit
                      as="div"
                      className="text-sm text-slate-600 mb-3 inline-block"
                      style={{ color: themeColor }}
                      value={job.name || ''}
                      onSave={(val) => {
                        const newWork = [...work];
                        newWork[i] = { ...job, name: val };
                        onUpdate?.({ ...data, work: newWork });
                      }}
                    />
                    <InlineEdit
                      as="p"
                      multiline
                      className="text-sm text-slate-700 leading-relaxed mb-3 w-full"
                      value={job.summary || ''}
                      onSave={(val) => {
                        const newWork = [...work];
                        newWork[i] = { ...job, summary: val };
                        onUpdate?.({ ...data, work: newWork });
                      }}
                    />
                    {job.highlights && (
                      <ul className="list-disc ml-4 space-y-1.5 text-sm text-slate-700">
                        {job.highlights.map((h, k) => (
                          <li key={k}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (projects.length === 0) return null;
        return (
          <section key="projects" className="mb-10 break-inside-avoid">
            <h2 className="text-xs tracking-widest uppercase font-bold text-slate-400 mb-6">
              Projects
            </h2>
            <div className="space-y-8">
              {projects.map((project, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
                    {[project.startDate, project.endDate].filter(Boolean).join(' — ')}
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
                      {project.name}
                      {project.url && (
                        <a
                          href={project.url}
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
                      value={project.description || ''}
                      onSave={(val) => {
                        const newProjects = [...projects];
                        newProjects[i] = { ...project, description: val };
                        onUpdate?.({ ...data, projects: newProjects });
                      }}
                    />
                    {project.highlights && (
                      <ul className="list-disc ml-4 space-y-1.5 text-sm text-slate-700 mb-3">
                        {project.highlights.map((h, k) => (
                          <li key={k}>{h}</li>
                        ))}
                      </ul>
                    )}
                    {project.keywords && (
                      <div className="flex flex-wrap gap-2">
                        {project.keywords.map((kw, k) => (
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
              ))}
            </div>
          </section>
        );

      case 'education':
        if (education.length === 0) return null;
        return (
          <section key="education" className="mb-10 break-inside-avoid">
            <h2 className="text-xs tracking-widest uppercase font-bold text-slate-400 mb-6">
              Education
            </h2>
            <div className="space-y-6">
              {education.map((edu, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/4 shrink-0 text-sm text-slate-500 pt-1">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' — ')}
                  </div>
                  <div className="md:w-3/4">
                    <InlineEdit
                      as="h3"
                      className="font-semibold text-slate-900 text-base inline-block"
                      value={edu.institution || ''}
                      onSave={(val) => {
                        const newEdu = [...education];
                        newEdu[i] = { ...edu, institution: val };
                        onUpdate?.({ ...data, education: newEdu });
                      }}
                    />
                    <div className="text-sm text-slate-700 mt-1">
                      {edu.studyType} in {edu.area}
                    </div>
                    {edu.score && (
                      <div className="text-sm text-slate-500 mt-1">Score: {edu.score}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (skills.length === 0) return null;
        return (
          <section key="skills" className="mb-10 break-inside-avoid">
            <h2 className="text-xs tracking-widest uppercase font-bold text-slate-400 mb-6">
              Skills
            </h2>
            <div className="space-y-4">
              {skills.map((skill, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-4">
                  <div className="md:w-1/4 shrink-0 font-medium text-sm text-slate-900 pt-1">
                    {skill.name}
                  </div>
                  <div className="md:w-3/4 text-sm text-slate-700 leading-relaxed pt-1">
                    {skill.keywords?.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-12 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-8">
      {/* Main Content */}
      <div className="space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndMain}
        >
          <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
            {mainOrder.map((id) => (
              <SortableSection key={id} id={id}>
                {renderSection(id)}
              </SortableSection>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};

export default React.memo(MinimalistTemplate);
