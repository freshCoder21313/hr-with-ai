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
  themeColor?: string;
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

const SummarySection = React.memo(function SummarySection({
  themeColor,
  summary,
  onUpdate,
}: {
  summary?: string;
  onUpdate?: (summary: string) => void;
  themeColor?: string;
}) {
  if (!summary) return null;
  return (
    <section className="mb-6">
      <h2
        className="uppercase border-b border-slate-300 mb-3 pb-1"
        style={{
          color: 'var(--color-heading)',
          fontSize: 'var(--size-heading)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 'var(--weight-heading)',
        }}
      >
        Professional Summary
      </h2>
      <div
        className="text-slate-700 text-justify"
        style={{
          fontSize: 'var(--size-body)',
          fontFamily: 'var(--font-body)',
          color: 'var(--color-body)',
          lineHeight: 'var(--lh-body)',
        }}
      >
        <InlineEdit
          as="div"
          multiline
          className="w-full"
          value={summary || ''}
          onSave={(val) => onUpdate?.(val)}
        />
      </div>
    </section>
  );
});

const WorkSection = React.memo(function WorkSection({
  work,
  onUpdate,
}: {
  work: ResumeData['work'];
  onUpdate?: (work: ResumeData['work']) => void;
}) {
  if (!work || work.length === 0) return null;
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
        {work.map((job, i) => (
          <div key={i} className="work-item">
            <div className="flex justify-between items-baseline mb-1">
              <InlineEdit
                as="h3"
                className="font-bold inline-block"
                style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
                value={job.name || ''}
                onSave={(val) => {
                  const newWork = [...work];
                  newWork[i] = { ...job, name: val };
                  onUpdate?.(newWork);
                }}
              />
              <span className="text-sm text-slate-500 italic">
                {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <InlineEdit
                as="p"
                className="font-semibold inline-block"
                style={{ fontSize: 'var(--size-body)', color: 'var(--color-body)' }}
                value={job.position || ''}
                onSave={(val) => {
                  const newWork = [...work];
                  newWork[i] = { ...job, position: val };
                  onUpdate?.(newWork);
                }}
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
              value={job.summary || ''}
              onSave={(val) => {
                const newWork = [...work];
                newWork[i] = { ...job, summary: val };
                onUpdate?.(newWork);
              }}
            />
            {job.highlights && job.highlights.length > 0 && (
              <ul className="list-disc ml-5 space-y-1">
                {job.highlights.map((highlight, idx) => (
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
        ))}
      </div>
    </section>
  );
});

const ProjectsSection = React.memo(function ProjectsSection({
  projects,
  onUpdate,
}: {
  projects: ResumeData['projects'];
  onUpdate?: (projects: ResumeData['projects']) => void;
}) {
  if (!projects || projects.length === 0) return null;
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
        {projects.map((project, i) => (
          <div key={i} className="project-item">
            <div className="flex justify-between items-baseline mb-1">
              <h3
                className="font-bold"
                style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
              >
                {project.name}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-normal text-blue-600 hover:underline"
                  >
                    {project.url.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </h3>
              <span className="text-sm text-slate-500 italic">
                {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
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
              value={project.description || ''}
              onSave={(val) => {
                const newProjects = [...projects];
                newProjects[i] = { ...project, description: val };
                onUpdate?.(newProjects);
              }}
            />
            {project.highlights && project.highlights.length > 0 && (
              <ul className="list-disc ml-5 space-y-1">
                {project.highlights.map((highlight, idx) => (
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
        ))}
      </div>
    </section>
  );
});

const EducationSection = React.memo(function EducationSection({
  themeColor,
  education,
  onUpdate,
}: {
  education: ResumeData['education'];
  onUpdate?: (education: ResumeData['education']) => void;
  themeColor?: string;
}) {
  if (!education || education.length === 0) return null;
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
        {education.map((edu, i) => (
          <div key={i} className="education-item">
            <div className="flex justify-between items-baseline">
              <InlineEdit
                as="h3"
                className="font-bold inline-block"
                style={{ fontSize: 'calc(var(--size-body) * 1.15)', color: 'var(--color-body)' }}
                value={edu.institution || ''}
                onSave={(val) => {
                  const newEdu = [...education];
                  newEdu[i] = { ...edu, institution: val };
                  onUpdate?.(newEdu);
                }}
              />
              <span className="text-sm text-slate-500 italic">
                {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <div className="flex justify-between">
              <p style={{ fontSize: 'var(--size-body)', color: 'var(--color-body)' }}>
                {edu.studyType} in {edu.area}
              </p>
              {edu.score && <span className="text-sm text-slate-500">GPA: {edu.score}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

const SkillsSection = React.memo(function SkillsSection({
  skills,
}: {
  skills: ResumeData['skills'];
}) {
  if (!skills || skills.length === 0) return null;
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
});

const HeaderSection = React.memo(function HeaderSection({
  themeColor,
  basics,
  onUpdate,
}: {
  basics: ResumeData['basics'];
  onUpdate?: (basics: ResumeData['basics']) => void;
  themeColor?: string;
}) {
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
        onSave={(val) => onUpdate?.({ ...basics, name: val })}
      />
      <InlineEdit
        as="p"
        className="mb-4 block w-full font-medium"
        style={{ color: 'var(--color-heading)', fontSize: 'calc(var(--size-name) * 0.5)' }}
        value={basics.label || ''}
        onSave={(val) => onUpdate?.({ ...basics, label: val })}
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
});

const ClassicTemplate: React.FC<TemplateProps> = ({
  data,
  onUpdate,
  onOrderChange,
  themeColor = '#1e293b',
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
      case 'summary':
        return (
          <SummarySection
            key={id}
            summary={basics.summary}
            themeColor={themeColor}
            onUpdate={(summary) => onUpdate?.({ ...data, basics: { ...basics, summary } })}
          />
        );
      case 'work':
      case 'experience':
        return (
          <WorkSection
            key={id}
            work={work}
            onUpdate={(workData) => onUpdate?.({ ...data, work: workData })}
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            key={id}
            projects={projects}
            onUpdate={(projectsData) => onUpdate?.({ ...data, projects: projectsData })}
          />
        );
      case 'education':
        return (
          <EducationSection
            key={id}
            education={education}
            themeColor={themeColor}
            onUpdate={(educationData) => onUpdate?.({ ...data, education: educationData })}
          />
        );
      case 'skills':
        return <SkillsSection key={id} skills={skills} />;
      case 'header':
        return (
          <HeaderSection
            key={id}
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-10 print:max-w-none print:mx-0 transition-all duration-300"
      style={{ color: 'var(--color-text-global)' }}
    >
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
  );
};

export default React.memo(ClassicTemplate);
