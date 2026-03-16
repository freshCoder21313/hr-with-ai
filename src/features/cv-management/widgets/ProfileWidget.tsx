import React, { useState, useEffect } from 'react';
import { useCVManagement } from '../hooks/useCVManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FilePenLine } from 'lucide-react';
import type { Basics, Work, Education, Skill } from '@/types/resume';

type ProfileTab = 'basics' | 'work' | 'education' | 'skills';

const EditableField = ({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (newValue: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSave = () => {
    setIsEditing(false);
    onSave(currentValue);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col">
        <label className="text-xs text-slate-500">{label}</label>
        <input
          type="text"
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="bg-transparent border-b border-blue-500 focus:outline-none dark:text-white"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group relative py-1" onDoubleClick={() => setIsEditing(true)}>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="text-slate-900 dark:text-white">{currentValue || '-'}</p>
      <FilePenLine className="w-3 h-3 absolute top-1 right-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const ProfileSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <Skeleton className="h-8 w-20 mr-4" />
        <Skeleton className="h-8 w-24 mr-4" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-4 pt-4">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </div>
    </CardContent>
  </Card>
);

const EmptyState = () => (
  <Card className="h-full flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <svg
        className="mx-auto h-12 w-12 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
        No Resume Selected
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Please upload or select a resume to see the profile details.
      </p>
    </div>
  </Card>
);

export const ProfileWidget: React.FC = () => {
  const { parsedData, selectionStatus, updateParsedData } = useCVManagement();
  const [activeTab, setActiveTab] = useState<ProfileTab>('basics');

  if (selectionStatus === 'loading') {
    return <ProfileSkeleton />;
  }

  if (!parsedData) {
    return <EmptyState />;
  }

  const handleSave = (field: keyof Basics, value: Basics[keyof Basics]) => {
    if (parsedData.basics) {
      const updatedBasics = { ...parsedData.basics, [field]: value };
      updateParsedData('basics', updatedBasics);
    }
  };

  const { basics, work, education, skills } = parsedData;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Parsed CV Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {(['basics', 'work', 'education', 'skills'] as ProfileTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize',
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-700'
                )}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-6">
          {activeTab === 'basics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <EditableField
                label="Full Name"
                value={basics?.name || ''}
                onSave={(val) => handleSave('name', val)}
              />
              <EditableField
                label="Email"
                value={basics?.email || ''}
                onSave={(val) => handleSave('email', val)}
              />
              <EditableField
                label="Phone"
                value={basics?.phone || ''}
                onSave={(val) => handleSave('phone', val)}
              />
              <EditableField
                label="Location"
                value={basics?.location?.city || ''}
                onSave={(val) => handleSave('location', { ...basics?.location, city: val })}
              />
              <div className="md:col-span-2">
                <EditableField
                  label="Summary"
                  value={basics?.summary || ''}
                  onSave={(val) => handleSave('summary', val)}
                />
              </div>
            </div>
          )}
          {activeTab === 'work' && (
            <div className="relative pl-6 before:absolute before:left-0 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200 dark:before:bg-slate-700">
              {work?.map((job: Work, index: number) => (
                <div key={index} className="relative pb-8">
                  <div className="absolute left-[-2.375rem] top-2 flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-blue-500 ring-8 ring-white dark:ring-slate-900"></div>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {job.name} -{' '}
                    <span className="font-normal text-slate-600 dark:text-slate-300">
                      {job.position}
                    </span>
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {job.startDate} – {job.endDate || 'Present'}
                  </p>
                  <p className="mt-2 text-sm">{job.summary}</p>
                </div>
              ))}
              {!work?.length && <p className="text-slate-500">No work experience found.</p>}
            </div>
          )}
          {activeTab === 'education' && (
            <div>
              {education?.map((edu: Education, index: number) => (
                <div
                  key={index}
                  className="pb-4 mb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                >
                  <p className="font-semibold">{edu.institution}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {edu.studyType} in {edu.area}
                  </p>
                  <p className="text-xs text-slate-400">
                    {edu.startDate} - {edu.endDate}
                  </p>
                </div>
              ))}
              {!education?.length && <p className="text-slate-500">No education history found.</p>}
            </div>
          )}
          {activeTab === 'skills' && (
            <div className="flex flex-wrap gap-2">
              {skills?.map((skill: Skill, index: number) => (
                <Badge key={index} variant="secondary">
                  {skill.name}
                </Badge>
              ))}
              {!skills?.length && <p className="text-slate-500">No skills found.</p>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
