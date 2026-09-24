import React from 'react';
import { Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { LoadingButton } from '@/components/ui/loading-button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BasicsForm from '../../SectionForms/BasicsForm';
import WorkForm from '../../SectionForms/WorkForm';
import EducationForm from '../../SectionForms/EducationForm';
import SkillsForm from '../../SectionForms/SkillsForm';
import ProjectsForm from '../../SectionForms/ProjectsForm';
import QuickActionFab from '../QuickActionFab';
import { Resume, ResumeData } from '@/types';

interface EditorViewProps {
  resume: Resume;
  data: ResumeData;
  activeTab: string;
  isProcessing: boolean;
  onActiveTabChange: (tab: string) => void;
  onUpdateSection: <K extends keyof ResumeData>(section: K, value: ResumeData[K]) => void;
  onSmartFormat: () => void;
  onAddSection: (section: 'work' | 'education' | 'skills' | 'projects') => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  resume,
  data,
  activeTab,
  isProcessing,
  onActiveTabChange,
  onUpdateSection,
  onSmartFormat,
  onAddSection,
}) => {
  return (
    <>
      <div className="w-64 bg-card border-r border-border flex-shrink-0 overflow-y-auto hidden md:block">
        <Tabs
          value={activeTab}
          onValueChange={onActiveTabChange}
          className="w-full"
        >
          <TabsList className="flex flex-col h-auto bg-transparent p-2 gap-1 w-full justify-start">
            <TabsTrigger value="basics" className="w-full justify-start px-4 py-2">
              Basics & Contact
            </TabsTrigger>
            <TabsTrigger value="work" className="w-full justify-start px-4 py-2">
              Work Experience
            </TabsTrigger>
            <TabsTrigger value="education" className="w-full justify-start px-4 py-2">
              Education
            </TabsTrigger>
            <TabsTrigger value="skills" className="w-full justify-start px-4 py-2">
              Skills
            </TabsTrigger>
            <TabsTrigger value="projects" className="w-full justify-start px-4 py-2">
              Projects
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background editor-scroll-area">
        <div className="max-w-3xl mx-auto">
          {!resume.formatted && !data.basics.name && (
            <Card className="mb-8 p-6 bg-accent/10 border-accent/30 border text-accent-foreground tour-magic-format">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
                <Wand2 className="w-5 h-5" /> AI Magic Available
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                This resume seems to be raw text. Use &quot;Smart Format&quot; to
                automatically structure it into fields using AI.
              </p>
              <LoadingButton
                onClick={onSmartFormat}
                disabled={isProcessing}
                isLoading={isProcessing}
                loadingText="Formatting..."
                size="sm"
                variant="secondary"
              >
                Format Now
              </LoadingButton>
            </Card>
          )}

          {activeTab === 'basics' && (
            <BasicsForm
              data={data.basics}
              onChange={(val) => onUpdateSection('basics', val)}
            />
          )}
          {activeTab === 'work' && (
            <WorkForm
              data={data.work || []}
              onChange={(val) => onUpdateSection('work', val)}
            />
          )}
          {activeTab === 'education' && (
            <EducationForm
              data={data.education || []}
              onChange={(val) => onUpdateSection('education', val)}
            />
          )}
          {activeTab === 'skills' && (
            <SkillsForm
              data={data.skills || []}
              onChange={(val) => onUpdateSection('skills', val)}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsForm
              data={data.projects || []}
              onChange={(val) => onUpdateSection('projects', val)}
            />
          )}
        </div>
      </div>

      <div className="tour-fab">
        <QuickActionFab
          onAddSection={onAddSection}
          onScrollToTop={() =>
            document
              .querySelector('.editor-scroll-area')
              ?.scrollTo({ top: 0, behavior: 'smooth' })
          }
          onScrollToBottom={() =>
            document
              .querySelector('.editor-scroll-area')
              ?.scrollTo({ top: 9999, behavior: 'smooth' })
          }
        />
      </div>
    </>
  );
};
