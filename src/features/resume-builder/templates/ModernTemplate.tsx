import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github, Globe } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
}

const ModernTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { basics, work, education, skills, projects } = data;

  return (
    <div className="font-sans text-slate-800 bg-white max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none grid grid-cols-[32%_68%]">
      
      {/* Sidebar (Left Column) */}
      <aside className="bg-slate-900 text-white p-6 print:bg-slate-900 print:text-white h-full">
        {/* Contact Info */}
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
              <a href={basics.url} className="hover:text-white break-all">{basics.url.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
          {basics.profiles?.map((profile, i) => (
            <div key={i} className="flex items-center gap-2">
              {profile.network.toLowerCase().includes('github') ? <Github size={14} className="shrink-0" /> : 
               profile.network.toLowerCase().includes('linkedin') ? <Linkedin size={14} className="shrink-0" /> : <LinkIcon size={14} className="shrink-0" />}
              <a href={profile.url} className="hover:text-white break-all">{profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1] || 'Profile'}</a>
            </div>
          ))}
        </div>

        {/* Education */}
        {education.length > 0 && (
          <section className="mb-8">
            <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">Education</h3>
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i}>
                  <h4 className="font-bold text-sm text-white">{edu.institution}</h4>
                  <p className="text-xs text-slate-400">{edu.studyType} in {edu.area}</p>
                  <p className="text-xs text-slate-500 italic mt-1">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">Skills</h3>
            <div className="space-y-4">
              {skills.map((skill, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-xs text-slate-200 mb-1">{skill.name}</h4>
                  <div className="flex flex-wrap gap-1">
                    {skill.keywords?.map((kw, k) => (
                        <span key={k} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                            {kw}
                        </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>

      {/* Main Content (Right Column) */}
      <main className="p-8">
        {/* Header */}
        <header className="mb-8 border-b-2 border-slate-100 pb-6">
          <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tight leading-tight mb-2">{basics.name}</h1>
          <p className="text-xl text-blue-600 font-medium">{basics.label}</p>
          {basics.summary && (
            <p className="text-slate-600 mt-4 text-sm leading-relaxed">
                {basics.summary}
            </p>
          )}
        </header>

        {/* Experience */}
        {work.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-sm"></span> Experience
            </h2>
            <div className="space-y-6">
              {work.map((job, i) => (
                <div key={i} className="relative pl-4 border-l border-slate-200">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-200 border-2 border-white"></div>
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-slate-800">{job.position}</h3>
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">{job.name}</p>
                  <p className="text-sm text-slate-600 mb-2">{job.summary}</p>
                  {job.highlights && job.highlights.length > 0 && (
                    <ul className="list-disc ml-4 space-y-1">
                      {job.highlights.map((highlight, idx) => (
                        <li key={idx} className="text-sm text-slate-600 leading-relaxed">{highlight}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-blue-600 rounded-sm"></span> Projects
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {projects.map((project, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm">
                        {project.name}
                        {project.url && (
                            <a href={project.url} target="_blank" rel="noreferrer" className="ml-2 text-blue-500 hover:underline font-normal text-xs">
                                ↗
                            </a>
                        )}
                    </h3>
                    <span className="text-xs text-slate-400">
                        {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{project.description}</p>
                  {project.highlights && (
                      <div className="flex flex-wrap gap-2 mt-2">
                          {project.highlights.map((h, k) => (
                              <span key={k} className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500">{h}</span>
                          ))}
                      </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ModernTemplate;
