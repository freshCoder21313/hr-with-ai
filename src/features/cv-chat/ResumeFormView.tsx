import React from 'react';
import { ResumeData } from '@/types/resume';
import BasicsForm from '@/features/resume-builder/SectionForms/BasicsForm';
import WorkForm from '@/features/resume-builder/SectionForms/WorkForm';
import EducationForm from '@/features/resume-builder/SectionForms/EducationForm';
import SkillsForm from '@/features/resume-builder/SectionForms/SkillsForm';
import ProjectsForm from '@/features/resume-builder/SectionForms/ProjectsForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ResumeFormViewProps {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
}

const SectionWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div className="mb-6 border rounded-lg bg-white shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-slate-50 border-b cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-bold text-lg text-slate-800">{title}</h3>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
      </div>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};

export const ResumeFormView: React.FC<ResumeFormViewProps> = ({ data, onChange }) => {
  // Helpers to update specific sections without mutating the whole object deeply manually
  const updateSection = (section: keyof ResumeData, value: any) => {
    onChange({ ...data, [section]: value });
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 text-sm">
        <p className="font-medium">✨ Editor Mode Active</p>
        <p>
          You can edit fields below directly. The AI also updates these fields automatically based
          on your chat.
        </p>
      </div>

      <SectionWrapper title="Basics & Contact">
        <BasicsForm data={data.basics} onChange={(val) => updateSection('basics', val)} />
      </SectionWrapper>

      <SectionWrapper title="Work Experience">
        <WorkForm data={data.work} onChange={(val) => updateSection('work', val)} />
      </SectionWrapper>

      <SectionWrapper title="Projects">
        <ProjectsForm data={data.projects} onChange={(val) => updateSection('projects', val)} />
      </SectionWrapper>

      <SectionWrapper title="Skills">
        <SkillsForm data={data.skills} onChange={(val) => updateSection('skills', val)} />
      </SectionWrapper>

      <SectionWrapper title="Education">
        <EducationForm data={data.education} onChange={(val) => updateSection('education', val)} />
      </SectionWrapper>
    </div>
  );
};
