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
import { SortableSection } from '@/features/resume-builder/components/SortableSection';
import { ResumeData } from '@/types/resume';
import { InlineEdit } from '@/features/resume-builder/components/InlineEdit';
import { MapPin, Mail, Phone, Link as LinkIcon } from 'lucide-react';

interface TemplateProps {
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  themeColor?: string;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

const AcademicHeader = React.memo(function AcademicHeader({
  basics,
  onUpdate,
  themeColor,
}: {
  basics: ResumeData['basics'];
  onUpdate?: (basics: ResumeData['basics']) => void;
  themeColor: string;
}) {
  return (
    <header
      className="text-center mb-8 pb-6 border-b-2 border-slate-300"
      style={{ borderColor: themeColor }}
    >
      <InlineEdit
        as="h1"
        className="text-3xl font-bold uppercase tracking-wider mb-2 block w-full"
        style={{ color: themeColor }}
        value={basics.name || ''}
        onSave={(val) => onUpdate?.({ ...basics, name: val })}
      />
      <InlineEdit
        as="p"
        className="text-lg text-slate-600 italic mb-4 block w-full"
        value={basics.label || ''}
        onSave={(val) => onUpdate?.({ ...basics, label: val })}
      />

      <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600">
        {basics.email && (
          <span className="flex items-center gap-1">
            <Mail size={12} /> {basics.email}
          </span>
        )}
        {basics.phone && (
          <span className="flex items-center gap-1">
            <Phone size={12} /> {basics.phone}
          </span>
        )}
        {basics.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {[basics.location.city, basics.location.countryCode].filter(Boolean).join(', ')}
          </span>
        )}
        {basics.url && (
          <span className="flex items-center gap-1">
            <LinkIcon size={12} /> {basics.url.replace(/^https?:\/\//, '')}
          </span>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 mt-2">
        {basics.profiles?.map((profile, i) => (
          <span key={i} className="flex items-center gap-1">
            {profile.network}: {profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1]}
          </span>
        ))}
      </div>
    </header>
  );
});

const AcademicTemplate: React.FC<TemplateProps> = ({
  data,
  themeColor = '#1e3a8a',
  onUpdate,
  onOrderChange,
}) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultOrder = ['header', 'summary', 'education', 'work', 'projects', 'skills'];

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
          <AcademicHeader
            key={id}
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            themeColor={themeColor}
          />
        );
      case 'summary':
        if (!basics.summary) return null;
        return (
          <section key="summary" className="mb-6">
            <h2
              className="text-lg font-bold uppercase border-b-2 border-slate-300 mb-3 pb-1 tracking-wide"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              Professional Summary
            </h2>
            <div className="text-sm text-slate-800 leading-relaxed text-justify indent-8">
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

      case 'education':
        if (education.length === 0) return null;
        return (
          <section key="education" className="mb-6">
            <h2
              className="text-lg font-bold uppercase border-b-2 border-slate-300 mb-4 pb-1 tracking-wide"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              Education
            </h2>
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="flex justify-between items-start education-item">
                  <div>
                    <InlineEdit
                      as="h3"
                      className="font-bold text-slate-900 text-base inline-block"
                      value={edu.institution || ''}
                      onSave={(val) => {
                        const newEdu = [...education];
                        newEdu[i] = { ...edu, institution: val };
                        onUpdate?.({ ...data, education: newEdu });
                      }}
                    />
                    <div className="text-sm text-slate-700 italic">
                      {edu.studyType} in {edu.area}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>{[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}</div>
                    {edu.score && <div className="text-xs">GPA: {edu.score}</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'work':
      case 'experience':
        if (work.length === 0) return null;
        return (
          <section key="work" className="mb-6">
            <h2
              className="text-lg font-bold uppercase border-b-2 border-slate-300 mb-4 pb-1 tracking-wide"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              Experience
            </h2>
            <div className="space-y-6">
              {work.map((job, i) => (
                <div key={i} className="work-item">
                  <div className="flex justify-between items-baseline mb-1">
                    <InlineEdit
                      as="h3"
                      className="font-bold text-base text-slate-900 inline-block"
                      value={job.name || ''}
                      onSave={(val) => {
                        const newWork = [...work];
                        newWork[i] = { ...job, name: val };
                        onUpdate?.({ ...data, work: newWork });
                      }}
                    />
                    <span className="text-sm text-slate-600 italic">
                      {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <InlineEdit
                    as="div"
                    className="font-semibold text-sm text-slate-800 mb-2 inline-block"
                    value={job.position || ''}
                    onSave={(val) => {
                      const newWork = [...work];
                      newWork[i] = { ...job, position: val };
                      onUpdate?.({ ...data, work: newWork });
                    }}
                  />
                  <InlineEdit
                    as="p"
                    multiline
                    className="text-sm text-slate-700 mb-2 leading-relaxed w-full"
                    value={job.summary || ''}
                    onSave={(val) => {
                      const newWork = [...work];
                      newWork[i] = { ...job, summary: val };
                      onUpdate?.({ ...data, work: newWork });
                    }}
                  />
                  {job.highlights && (
                    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
                      {job.highlights.map((h, k) => (
                        <li key={k}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'projects':
        if (projects.length === 0) return null;
        return (
          <section key="projects" className="mb-6">
            <h2
              className="text-lg font-bold uppercase border-b-2 border-slate-300 mb-4 pb-1 tracking-wide"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              Projects & Research
            </h2>
            <div className="space-y-5">
              {projects.map((project, i) => (
                <div key={i} className="project-item">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-base text-slate-900">
                      {project.name}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-xs font-normal text-blue-700 hover:underline"
                        >
                          [Link]
                        </a>
                      )}
                    </h3>
                    <span className="text-sm text-slate-600 italic">
                      {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <InlineEdit
                    as="p"
                    multiline
                    className="text-sm text-slate-700 mb-2 leading-relaxed w-full"
                    value={project.description || ''}
                    onSave={(val) => {
                      const newProjects = [...projects];
                      newProjects[i] = { ...project, description: val };
                      onUpdate?.({ ...data, projects: newProjects });
                    }}
                  />
                  {project.highlights && (
                    <ul className="list-disc ml-5 space-y-1 text-sm text-slate-700">
                      {project.highlights.map((h, k) => (
                        <li key={k}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (skills.length === 0) return null;
        return (
          <section key="skills" className="mb-6">
            <h2
              className="text-lg font-bold uppercase border-b-2 border-slate-300 mb-4 pb-1 tracking-wide"
              style={{ borderColor: themeColor, color: themeColor }}
            >
              Technical Skills
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-x-8 gap-y-2">
              {skills.map((skill, i) => (
                <div
                  key={i}
                  className="flex justify-between border-b border-slate-100 pb-1 skill-item"
                >
                  <span className="font-bold text-sm text-slate-900">{skill.name}</span>
                  <span className="text-sm text-slate-600 italic text-right">
                    {skill.keywords?.join(', ')}
                  </span>
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
    <div className="font-serif bg-white p-10 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-8 print:max-w-none print:mx-0 text-slate-900">
      {/* Main Content */}
      <div className="space-y-6">
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

export default React.memo(AcademicTemplate);
