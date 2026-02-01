import React from 'react';
import { ResumeData } from '@/types/resume';
import BasicsForm from '@/features/resume-builder/SectionForms/BasicsForm';
import WorkForm from '@/features/resume-builder/SectionForms/WorkForm';
import EducationForm from '@/features/resume-builder/SectionForms/EducationForm';
import SkillsForm from '@/features/resume-builder/SectionForms/SkillsForm';
import ProjectsForm from '@/features/resume-builder/SectionForms/ProjectsForm';
import { CollapsibleSection } from '@/components/ui/collapsible-section';

interface ResumeFormViewProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

export const ResumeFormView: React.FC<ResumeFormViewProps> = ({ data, onChange }) => {
  // Helpers to update specific sections without mutating the whole object deeply manually
  const updateSection = (section: keyof ResumeData, value: any) => {
    onChange({ ...data, [section]: value });
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 text-sm">
        <p className="font-medium">✨ Editor Mode Active</p>
        <p>
          You can edit fields below directly. The AI also updates these fields automatically based
          on your chat.
        </p>
      </div>

      <CollapsibleSection title="Basics & Contact" className="mb-6">
        <BasicsForm data={data.basics} onChange={(val) => updateSection('basics', val)} />
      </CollapsibleSection>

      <CollapsibleSection title="Work Experience" className="mb-6">
        <WorkForm data={data.work} onChange={(val) => updateSection('work', val)} />
      </CollapsibleSection>

      <CollapsibleSection title="Projects" className="mb-6">
        <ProjectsForm data={data.projects} onChange={(val) => updateSection('projects', val)} />
      </CollapsibleSection>

      <CollapsibleSection title="Skills" className="mb-6">
        <SkillsForm data={data.skills} onChange={(val) => updateSection('skills', val)} />
      </CollapsibleSection>

      <CollapsibleSection title="Education" className="mb-6">
        <EducationForm data={data.education} onChange={(val) => updateSection('education', val)} />
      </CollapsibleSection>
    </div>
  );
};
