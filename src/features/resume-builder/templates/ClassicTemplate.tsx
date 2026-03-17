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
import { WorkSection } from '../components/shared/WorkSection';
import { EducationSection } from '../components/shared/EducationSection';
import { ProjectsSection } from '../components/shared/ProjectsSection';
import { SkillsSection } from '../components/shared/SkillsSection';
import { SummarySection } from '../components/shared/SummarySection';
import { ResumeHeader } from '../components/shared/ResumeHeader';

interface TemplateProps {
  themeColor?: string;
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

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
            key="summary"
            summary={basics.summary || ''}
            onUpdate={(newSummary) =>
              onUpdate?.({ ...data, basics: { ...basics, summary: newSummary } })
            }
            layout="classic"
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
            layout="classic"
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            key="projects"
            projects={projects}
            onUpdate={(newProjects) => onUpdate?.({ ...data, projects: newProjects })}
            layout="classic"
          />
        );
      case 'education':
        return (
          <EducationSection
            key="education"
            education={education}
            onUpdate={(newEducation) => onUpdate?.({ ...data, education: newEducation })}
            layout="classic"
          />
        );
      case 'skills':
        return <SkillsSection key="skills" skills={skills} layout="classic" />;
      case 'header':
        return (
          <ResumeHeader
            key="header"
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            layout="classic"
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
