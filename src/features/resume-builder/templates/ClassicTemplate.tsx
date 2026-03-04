import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
}

const SummarySection = React.memo(function SummarySection({ summary }: { summary?: string }) {
  if (!summary) return null;
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-3 pb-1">
        Professional Summary
      </h2>
      <p className="text-slate-700 leading-relaxed text-sm text-justify">{summary}</p>
    </section>
  );
});

const WorkSection = React.memo(function WorkSection({ work }: { work: ResumeData['work'] }) {
  if (!work || work.length === 0) return null;
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">
        Experience
      </h2>
      <div className="space-y-5">
        {work.map((job, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-bold text-base">{job.name}</h3>
              <span className="text-sm text-slate-500 italic">
                {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <p className="font-semibold text-sm text-slate-700">{job.position}</p>
            </div>
            <p className="text-sm text-slate-600 mb-2">{job.summary}</p>
            {job.highlights && job.highlights.length > 0 && (
              <ul className="list-disc ml-5 space-y-1">
                {job.highlights.map((highlight, idx) => (
                  <li key={idx} className="text-sm text-slate-600">
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
}: {
  projects: ResumeData['projects'];
}) {
  if (!projects || projects.length === 0) return null;
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">Projects</h2>
      <div className="space-y-4">
        {projects.map((project, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-bold text-base">
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
            <p className="text-sm text-slate-600 mb-2">{project.description}</p>
            {project.highlights && project.highlights.length > 0 && (
              <ul className="list-disc ml-5 space-y-1">
                {project.highlights.map((highlight, idx) => (
                  <li key={idx} className="text-sm text-slate-600">
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
  education,
}: {
  education: ResumeData['education'];
}) {
  if (!education || education.length === 0) return null;
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">Education</h2>
      <div className="space-y-3">
        {education.map((edu, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline">
              <h3 className="font-bold text-base">{edu.institution}</h3>
              <span className="text-sm text-slate-500 italic">
                {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
              </span>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-slate-700">
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
    <section>
      <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">Skills</h2>
      <div className="grid grid-cols-1 gap-y-2 gap-x-8">
        {skills.map((skill, i) => (
          <div key={i} className="flex flex-col sm:items-baseline">
            <span className="font-bold text-sm min-w-[120px]">{skill.name}:</span>
            <p className="text-sm text-slate-600">{skill.keywords?.join(', ')}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

const HeaderSection = React.memo(function HeaderSection({
  basics,
}: {
  basics: ResumeData['basics'];
}) {
  return (
    <header className="border-b-2 border-slate-800 pb-4 mb-6">
      <h1 className="text-4xl font-bold uppercase tracking-wide mb-2">{basics.name}</h1>
      <p className="text-xl text-slate-600 mb-4">{basics.label}</p>

      <div className="flex flex-wrap gap-4 text-sm text-slate-600">
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

const ClassicTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultOrder = ['summary', 'experience', 'projects', 'education', 'skills'];

  let sectionOrder = defaultOrder;
  if (meta?.sectionOrder) {
    sectionOrder = [...(meta.sectionOrder.main || []), ...(meta.sectionOrder.sidebar || [])];
    sectionOrder = Array.from(new Set(sectionOrder));
  }

  const renderSection = (id: string) => {
    switch (id) {
      case 'summary':
        return <SummarySection key={id} summary={basics.summary} />;
      case 'work':
      case 'experience':
        return <WorkSection key={id} work={work} />;
      case 'projects':
        return <ProjectsSection key={id} projects={projects} />;
      case 'education':
        return <EducationSection key={id} education={education} />;
      case 'skills':
        return <SkillsSection key={id} skills={skills} />;
      default:
        return null;
    }
  };

  return (
    <div className="font-serif text-slate-900 bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-0">
      <HeaderSection basics={basics} />
      {sectionOrder.map((id) => renderSection(id))}
    </div>
  );
};

export default React.memo(ClassicTemplate);
