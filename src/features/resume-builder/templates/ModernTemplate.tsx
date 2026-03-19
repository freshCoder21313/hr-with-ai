import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github, Globe } from 'lucide-react';
import { SortableSection } from '@/features/resume-builder/components/SortableSection';
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
import { WorkSection } from '@/features/resume-builder/components/shared/WorkSection';
import { EducationSection } from '@/features/resume-builder/components/shared/EducationSection';
import { ProjectsSection } from '@/features/resume-builder/components/shared/ProjectsSection';
import { SkillsSection } from '@/features/resume-builder/components/shared/SkillsSection';
import { SummarySection } from '@/features/resume-builder/components/shared/SummarySection';
import { ResumeHeader } from '@/features/resume-builder/components/shared/ResumeHeader';

interface TemplateProps {
  themeColor?: string;
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

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
        return (
          <EducationSection
            key="education"
            education={education}
            onUpdate={(newEducation) => onUpdate?.({ ...data, education: newEducation })}
            layout="modern"
          />
        );
      case 'skills':
        return <SkillsSection key="skills" skills={skills} layout="modern" />;
      case 'summary':
        return (
          <SummarySection
            key="summary"
            summary={basics.summary || ''}
            onUpdate={(newSummary) =>
              onUpdate?.({ ...data, basics: { ...basics, summary: newSummary } })
            }
            layout="modern"
          />
        );
      case 'work':
      case 'experience':
        return (
          <WorkSection
            key="work"
            work={work}
            onUpdate={(newWork) => onUpdate?.({ ...data, work: newWork })}
            themeColor={themeColor}
            layout="modern"
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            key="projects"
            projects={projects}
            onUpdate={(newProjects) => onUpdate?.({ ...data, projects: newProjects })}
            themeColor={themeColor}
            layout="modern"
          />
        );
      case 'header':
        return (
          <ResumeHeader
            key="header"
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            layout="modern"
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
