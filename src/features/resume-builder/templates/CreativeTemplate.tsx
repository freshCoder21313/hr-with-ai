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
import { cn } from '@/lib/utils';
import { InlineEdit } from '../components/InlineEdit';
import { WorkSection } from '../components/shared/WorkSection';
import { EducationSection } from '../components/shared/EducationSection';
import { ProjectsSection } from '../components/shared/ProjectsSection';
import { SkillsSection } from '../components/shared/SkillsSection';
import { SummarySection } from '../components/shared/SummarySection';
import { ResumeHeader } from '../components/shared/ResumeHeader';

interface TemplateProps {
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  themeColor?: string;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

const CreativeTemplate: React.FC<TemplateProps> = ({
  data,
  themeColor = '#8b5cf6',
  onUpdate,
  onOrderChange,
}) => {
  const { basics, work, education, skills, projects, meta } = data;

  const sidebarOrder = meta?.sectionOrder?.sidebar || ['header', 'skills', 'education', 'contact'];
  const mainOrder = meta?.sectionOrder?.main || ['summary', 'work', 'projects'];

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

  const primaryColor = themeColor || '#8b5cf6';

  const renderSection = (id: string, isSidebar: boolean) => {
    switch (id) {
      case 'header':
        return (
          <ResumeHeader
            key="header"
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            themeColor={primaryColor}
            layout="creative"
          />
        );
      case 'summary':
        return (
          <SummarySection
            key="summary"
            summary={basics.summary || ''}
            onUpdate={(newSummary) =>
              onUpdate?.({ ...data, basics: { ...basics, summary: newSummary } })
            }
            layout="creative"
          />
        );
      case 'work':
      case 'experience':
        return (
          <WorkSection
            key="work"
            work={work}
            onUpdate={(newWork) => onUpdate?.({ ...data, work: newWork })}
            themeColor={primaryColor}
            layout="creative"
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            key="projects"
            projects={projects}
            onUpdate={(newProjects) => onUpdate?.({ ...data, projects: newProjects })}
            themeColor={primaryColor}
            layout="creative"
          />
        );
      case 'education':
        return (
          <EducationSection
            key="education"
            education={education}
            onUpdate={(newEducation) => onUpdate?.({ ...data, education: newEducation })}
            layout="creative"
          />
        );
      case 'skills':
        return <SkillsSection key="skills" skills={skills} layout="creative" />;
      case 'contact':
        // This is handled by the header in this template
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-slate-800 bg-white max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:max-w-none print:mx-0 grid grid-cols-[35%_65%]">
      <aside
        className="text-white p-8 min-h-full flex flex-col"
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className="flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndSidebar}
          >
            <SortableContext items={sidebarOrder} strategy={verticalListSortingStrategy}>
              {sidebarOrder.map((id) => (
                <SortableSection key={id} id={id}>
                  {renderSection(id, true)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </aside>

      <main className="p-10 bg-white h-full relative">
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: primaryColor }}
        ></div>

        <div className="mt-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndMain}
          >
            <SortableContext items={mainOrder} strategy={verticalListSortingStrategy}>
              {mainOrder.map((id) => (
                <SortableSection key={id} id={id}>
                  {renderSection(id, false)}
                </SortableSection>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </main>
    </div>
  );
};

export default React.memo(CreativeTemplate);
