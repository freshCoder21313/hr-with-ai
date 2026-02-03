import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
}

const ClassicTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultOrder = ['summary', 'experience', 'projects', 'education', 'skills'];

  // For Classic, we merge sidebar and main if they exist (handling switch from Modern)
  // or just use main if it contains everything.
  // Best approach: Use a specific order if defined, otherwise defaults.
  // If we want to support the same config object:
  let sectionOrder = defaultOrder;
  if (meta?.sectionOrder) {
    // Flatten both lists for single column view
    sectionOrder = [...(meta.sectionOrder.main || []), ...(meta.sectionOrder.sidebar || [])];
    // Remove duplicates just in case
    sectionOrder = Array.from(new Set(sectionOrder));
  }

  const renderSection = (id: string) => {
    switch (id) {
      case 'summary':
        if (!basics.summary) return null;
        return (
          <section key="summary" className="mb-6">
            <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-3 pb-1">
              Professional Summary
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm text-justify">{basics.summary}</p>
          </section>
        );

      case 'work':
      case 'experience': // Handle both keys
        if (work.length === 0) return null;
        return (
          <section key="work" className="mb-6">
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

      case 'projects':
        if (projects.length === 0) return null;
        return (
          <section key="projects" className="mb-6">
            <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">
              Projects
            </h2>
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

      case 'education':
        if (education.length === 0) return null;
        return (
          <section key="education" className="mb-6">
            <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">
              Education
            </h2>
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

      case 'skills':
        if (skills.length === 0) return null;
        return (
          <section key="skills">
            <h2 className="text-lg font-bold uppercase border-b border-slate-300 mb-4 pb-1">
              Skills
            </h2>
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

      default:
        return null;
    }
  };

  return (
    <div className="font-serif text-slate-900 bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none print:p-0">
      {/* Header */}
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

      {/* Dynamic Sections */}
      {sectionOrder.map((id) => renderSection(id))}
    </div>
  );
};

export default ClassicTemplate;
