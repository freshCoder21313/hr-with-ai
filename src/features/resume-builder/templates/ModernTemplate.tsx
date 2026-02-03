import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github, Globe } from 'lucide-react';

interface TemplateProps {
  data: ResumeData;
}

const ModernTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { basics, work, education, skills, projects, meta } = data;

  // Default Order
  const defaultSidebar = ['education', 'skills', 'contact']; // Added contact for flexibility, though usually fixed
  const defaultMain = ['summary', 'work', 'projects'];

  const sidebarOrder = meta?.sectionOrder?.sidebar || defaultSidebar;
  const mainOrder = meta?.sectionOrder?.main || defaultMain;

  const renderSection = (id: string) => {
    switch (id) {
      // Sidebar Sections
      case 'education':
        if (education.length === 0) return null;
        return (
          <section key="education" className="mb-8">
            <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">
              Education
            </h3>
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i}>
                  <h4 className="font-bold text-sm text-white">{edu.institution}</h4>
                  <p className="text-xs text-slate-400">
                    {edu.studyType} in {edu.area}
                  </p>
                  <p className="text-xs text-slate-500 italic mt-1">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (skills.length === 0) return null;
        return (
          <section key="skills" className="mb-8">
            <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">
              Skills
            </h3>
            <div className="space-y-3">
              {skills.map((skill, i) => (
                <div key={i}>
                  <h4 className="font-semibold text-xs text-slate-200 mb-1">{skill.name}</h4>
                  <div className="flex flex-wrap gap-1">
                    {skill.keywords?.map((kw, k) => (
                      <span
                        key={k}
                        className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      // Main Sections
      case 'summary':
        if (!basics.summary) return null;
        // In the original template, summary was part of the header.
        // If we want it movable, we render it here.
        // However, if it's "header", maybe we keep it fixed?
        // Let's assume 'summary' means the text block usually below header.
        // For now, I will render it if it's in the list, but typically it is fixed in this template's header.
        // Wait, the original code had summary INSIDE the header div.
        // To make it movable, I should probably separate it.
        // But for Modern template, let's keep it simple:
        // We will render 'experience' (work) and 'projects' dynamically.
        // Summary is attached to header in this design. I will skip 'summary' in the dynamic list for this specific template to preserve design integrity per instructions "WOW the user".
        // Actually, users might want to move Summary below Experience.
        return (
          <div key="summary" className="mb-10 text-slate-600 text-sm leading-relaxed max-w-prose">
            {basics.summary}
          </div>
        );

      case 'work':
        if (work.length === 0) return null;
        return (
          <section key="work" className="mb-12">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-blue-600 rounded-full"></span> Experience
            </h2>
            <div className="space-y-8 relative pl-2">
              <div className="absolute left-[3px] top-2 bottom-2 w-[2px] bg-slate-100"></div>
              {work.map((job, i) => (
                <div key={i} className="relative pl-8 group">
                  <div className="absolute -left-[5px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-slate-200 group-hover:border-blue-400 transition-colors"></div>
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-bold text-slate-800 text-lg leading-tight">
                      {job.position}
                    </h3>
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                      {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-blue-600 mb-3">{job.name}</p>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">{job.summary}</p>
                  {job.highlights && job.highlights.length > 0 && (
                    <ul className="space-y-2">
                      {job.highlights.map((highlight, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-slate-600 leading-relaxed flex items-start gap-2"
                        >
                          <span className="text-blue-400 mt-1.5 text-[10px]">•</span>
                          <span>{highlight}</span>
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
          <section key="projects" className="mb-12">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-blue-600 rounded-full"></span> Projects
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {projects.map((project, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                      {project.name}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <LinkIcon size={14} />
                        </a>
                      )}
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                    {project.description}
                  </p>
                  {project.highlights && (
                    <div className="flex flex-wrap gap-2">
                      {project.highlights.map((h, k) => (
                        <span
                          key={k}
                          className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 font-medium border border-slate-100"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
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
    <div className="font-sans text-slate-800 bg-white max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none grid grid-cols-[32%_68%]">
      {/* Sidebar (Left Column) */}
      <aside className="bg-slate-900 text-white p-6 print:bg-slate-900 print:text-white h-full">
        {/* Contact Info (Fixed at top of sidebar usually) */}
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
              <a href={basics.url} className="hover:text-white break-all">
                {basics.url.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {basics.profiles?.map((profile, i) => (
            <div key={i} className="flex items-center gap-2">
              {profile.network.toLowerCase().includes('github') ? (
                <Github size={14} className="shrink-0" />
              ) : profile.network.toLowerCase().includes('linkedin') ? (
                <Linkedin size={14} className="shrink-0" />
              ) : (
                <LinkIcon size={14} className="shrink-0" />
              )}
              <a href={profile.url} className="hover:text-white break-all">
                {profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1] || 'Profile'}
              </a>
            </div>
          ))}
        </div>

        {/* Dynamic Sidebar Sections */}
        {sidebarOrder.map((id) => renderSection(id))}
      </aside>

      {/* Main Content (Right Column) */}
      <main className="p-10 bg-white">
        {/* Header (Fixed) */}
        <header className="mb-10 pb-8 border-b border-slate-200">
          <div className="flex items-start gap-8">
            {basics.image && (
              <div className="relative shrink-0">
                <img
                  src={basics.image}
                  alt={basics.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-lg"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-2">
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-3 break-words">
                {basics.name}
              </h1>
              <p className="text-xl text-blue-600 font-semibold tracking-wide uppercase text-sm mb-4">
                {basics.label}
              </p>
              {/* Summary Rendered Here if NOT in dynamic list (legacy fallback) OR if 'summary' is present in dynamic list?
                  To avoid duplicate, let's verify if 'summary' is in mainOrder. 
                  If it is, renderSection('summary') is called below.
                  If it is NOT, we might want to default it here? 
                  The defaultMain includes 'summary', so it will be rendered by the loop. 
              */}
            </div>
          </div>
        </header>

        {/* Dynamic Main Sections */}
        {mainOrder.map((id) => renderSection(id))}
      </main>
    </div>
  );
};

export default ModernTemplate;
