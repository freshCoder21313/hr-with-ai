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
import { WorkSection } from '@/features/resume-builder/components/shared/WorkSection';
import { EducationSection } from '@/features/resume-builder/components/shared/EducationSection';
import { ProjectsSection } from '@/features/resume-builder/components/shared/ProjectsSection';
import { ResumeHeader } from '@/features/resume-builder/components/shared/ResumeHeader';
import { SummarySection } from '@/features/resume-builder/components/shared/SummarySection';
import { SkillsSection } from '@/features/resume-builder/components/shared/SkillsSection';

interface TemplateProps {
  onUpdate?: (newData: import('@/types/resume').ResumeData) => void;
  data: ResumeData;
  themeColor?: string;
  onOrderChange?: (newSidebar: string[], newMain: string[]) => void;
}

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
          <ResumeHeader
            key="header"
            basics={basics}
            onUpdate={(newBasics) => onUpdate?.({ ...data, basics: newBasics })}
            themeColor={themeColor}
            layout="minimalist"
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
            layout="minimalist"
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
            layout="minimalist"
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            key="projects"
            projects={projects}
            onUpdate={(newProjects) => onUpdate?.({ ...data, projects: newProjects })}
            layout="minimalist"
          />
        );
      case 'education':
        return (
          <EducationSection
            key="education"
            education={education}
            onUpdate={(newEducation) => onUpdate?.({ ...data, education: newEducation })}
            layout="minimalist"
          />
        );
      case 'skills':
        return <SkillsSection key="skills" skills={skills} layout="minimalist" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-12 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-8 print:max-w-none print:mx-0">
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
