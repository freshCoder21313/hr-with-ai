import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github, Globe } from 'lucide-react';
import { InlineEdit } from '../components/InlineEdit';
import { SortableSection } from '../components/SortableSection';
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

interface TemplateProps {
  themeColor?: string;
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

const EducationSection = React.memo(function EducationSection({
  education,
}: {
  education: ResumeData['education'];
}) {
  if (!education || education.length === 0) return null;
  return (
    <section className="mb-8 break-inside-avoid">
      <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">
        Education
      </h3>
      <div className="space-y-4">
        {education.map((edu, i) => (
          <div key={i}>
            <h4 className="font-bold text-sm text-white">{edu.institution}</h4>
            <p className="text-xs text-slate-400">
              {edu.studyType} in {edu.area}
            </p>
            <p className="text-xs text-slate-500 italic mt-1">
              {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
            </p>
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
    <section className="mb-8 break-inside-avoid">
      <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">
        Skills
      </h3>
      <div className="space-y-3">
        {skills.map((skill, i) => (
          <div key={i}>
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
    </section>
  );
});

const SummarySection = React.memo(function SummarySection({
  summary,
  onUpdate,
}: {
  summary?: string;
  onUpdate?: (summary: string) => void;
}) {
  if (!summary) return null;
  return (
    <div className="mb-10 text-slate-600 text-sm leading-relaxed max-w-prose">
      <InlineEdit
        as="div"
        multiline
        className="w-full"
        value={summary || ''}
        onSave={(val) => onUpdate?.(val)}
      />
    </div>
  );
});

const WorkSection = React.memo(function WorkSection({
  work,
  onUpdate,
  themeColor,
}: {
  work: ResumeData['work'];
  onUpdate?: (work: ResumeData['work']) => void;
  themeColor?: string;
}) {
  if (!work || work.length === 0) return null;
  return (
    <section className="mb-12 break-inside-avoid">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
        <span className="w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }}></span>{' '}
        Experience
      </h2>
      <div className="space-y-8 relative pl-2">
        <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
        {work.map((job, i) => (
          <div key={i} className="relative pl-8 group">
            <div className="absolute -left-[5px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-slate-200 group-hover:border-blue-400 transition-colors"></div>
            <div className="flex justify-between items-baseline mb-2">
              <InlineEdit
                as="h3"
                className="font-bold text-slate-800 text-lg leading-tight inline-block"
                value={job.position || ''}
                onSave={(val) => {
                  const newWork = [...work];
                  newWork[i] = { ...job, position: val };
                  onUpdate?.(newWork);
                }}
              />
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <InlineEdit
              as="p"
              className="text-sm font-medium mb-3 inline-block"
              style={{ color: themeColor }}
              value={job.name || ''}
              onSave={(val) => {
                const newWork = [...work];
                newWork[i] = { ...job, name: val };
                onUpdate?.(newWork);
              }}
            />
            <InlineEdit
              as="p"
              multiline
              className="text-sm text-slate-600 mb-3 leading-relaxed w-full"
              value={job.summary || ''}
              onSave={(val) => {
                const newWork = [...work];
                newWork[i] = { ...job, summary: val };
                onUpdate?.(newWork);
              }}
            />
            {job.highlights && job.highlights.length > 0 && (
              <ul className="space-y-2">
                {job.highlights.map((highlight, idx) => (
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
        ))}
      </div>
    </section>
  );
});

const ProjectsSection = React.memo(function ProjectsSection({
  projects,
  onUpdate,
  themeColor,
}: {
  projects: ResumeData['projects'];
  onUpdate?: (projects: ResumeData['projects']) => void;
  themeColor?: string;
}) {
  if (!projects || projects.length === 0) return null;
  return (
    <section className="mb-12 break-inside-avoid">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
        <span className="w-8 h-1 rounded-full" style={{ backgroundColor: themeColor }}></span>{' '}
        Projects
      </h2>
      <div className="grid grid-cols-1 gap-6">
        {projects.map((project, i) => (
          <div key={i} className="group">
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                {project.name}
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    <LinkIcon size={14} />
                  </a>
                )}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <InlineEdit
              as="p"
              multiline
              className="text-sm text-slate-600 mb-3 leading-relaxed w-full"
              value={project.description || ''}
              onSave={(val) => {
                const newProjects = [...projects];
                newProjects[i] = { ...project, description: val };
                onUpdate?.(newProjects);
              }}
            />
            {project.highlights && (
              <div className="flex flex-wrap gap-2">
                {project.highlights.map((h, k) => (
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
        ))}
      </div>
    </section>
  );
});

const SidebarContactInfo = React.memo(function SidebarContactInfo({
  basics,
}: {
  basics: ResumeData['basics'];
  onUpdate?: (basics: ResumeData['basics']) => void;
}) {
  return (
    <div className="mb-8 space-y-3 text-sm text-slate-300">
      {basics.email && (
        <div className="flex items-center gap-2">
          <Mail size={14} className="shrink-0" />
          <span className="break-all">{basics.email}</span>
        </div>
      )}
      {basics.phone && (
        <div className="flex items-center gap-2">
          <Phone size={14} className="shrink-0" /> {basics.phone}
        </div>
      )}
      {basics.location && (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="shrink-0" />
          {[basics.location.city, basics.location.countryCode].filter(Boolean).join(', ')}
        </div>
      )}
      {basics.url && (
        <div className="flex items-center gap-2">
          <Globe size={14} className="shrink-0" />
          <a href={basics.url} className="hover:text-white break-all">
            {basics.url.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}
      {basics.profiles?.map((profile, i) => (
        <div key={i} className="flex items-center gap-2">
          {profile.network.toLowerCase().includes('github') ? (
            <Github size={14} className="shrink-0" />
          ) : profile.network.toLowerCase().includes('linkedin') ? (
            <Linkedin size={14} className="shrink-0" />
          ) : (
            <LinkIcon size={14} className="shrink-0" />
          )}
          <a href={profile.url} className="hover:text-white break-all">
            {profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1] || 'Profile'}
          </a>
        </div>
      ))}
    </div>
  );
});

const MainHeader = React.memo(function MainHeader({
  basics,
  onUpdate,
}: {
  basics: ResumeData['basics'];
  onUpdate?: (basics: ResumeData['basics']) => void;
}) {
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
            onSave={(val) => onUpdate?.({ ...basics, name: val })}
          />
          <InlineEdit
            as="p"
            className="text-xl font-semibold tracking-wide uppercase text-sm mb-4 block w-full"
            value={basics.label || ''}
            onSave={(val) => onUpdate?.({ ...basics, label: val })}
          />
        </div>
      </div>
    </header>
  );
});

const ModernTemplate: React.FC<TemplateProps> = ({
  data,
  onUpdate,
  onOrderChange,
  themeColor = '#2563eb',
}) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultSidebar = ['education', 'skills', 'contact'];
  const defaultMain = ['header', 'summary', 'work', 'projects'];

  const sidebarOrder = meta?.sectionOrder?.sidebar || defaultSidebar;
  const mainOrder = meta?.sectionOrder?.main || defaultMain;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndSidebar = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sidebarOrder.indexOf(String(active.id));
      const newIndex = sidebarOrder.indexOf(String(over.id));
      const newOrder = arrayMove(sidebarOrder, oldIndex, newIndex);
      onOrderChange?.(newOrder, mainOrder);
    }
  };

  const handleDragEndMain = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = mainOrder.indexOf(String(active.id));
      const newIndex = mainOrder.indexOf(String(over.id));
      const newOrder = arrayMove(mainOrder, oldIndex, newIndex);
      onOrderChange?.(sidebarOrder, newOrder);
    }
  };

  const renderSection = (id: string) => {
    switch (id) {
      case 'education':
        return <EducationSection key={id} education={education} />;
      case 'skills':
        return <SkillsSection key={id} skills={skills} />;
      case 'summary':
        return (
          <SummarySection
            key={id}
            summary={basics.summary}
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
      case 'header':
        return (
          <MainHeader
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
    <div className="font-sans text-slate-800 bg-white max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:max-w-none print:mx-0 grid grid-cols-[32%_68%]">
      {/* Sidebar (Left Column) */}
      <aside className="bg-slate-900 text-white p-6 print:bg-slate-900 print:text-white min-h-full">
        <SidebarContactInfo basics={basics} />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndSidebar}
        >
          <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
            {sidebarOrder.map((id) => (
              <SortableSection key={id} id={id}>
                {renderSection(id)}
              </SortableSection>
            ))}
          </SortableContext>
        </DndContext>
      </aside>

      {/* Main Content (Right Column) */}
      <main className="p-10 bg-white">
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
      </main>
    </div>
  );
};

export default React.memo(ModernTemplate);
