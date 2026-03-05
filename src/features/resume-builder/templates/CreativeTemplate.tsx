import React from 'react';
import { ResumeData } from '@/types/resume';
import { MapPin, Mail, Phone, Link as LinkIcon, Linkedin, Github, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateProps {
  data: ResumeData;
  themeColor?: string;
}

const CreativeTemplate: React.FC<TemplateProps> = ({ data, themeColor = '#8b5cf6' }) => {
  const { basics, work, education, skills, projects, meta } = data;

  const defaultOrder = ['summary', 'experience', 'projects', 'education', 'skills'];

  // Merge main/sidebar for single column flow or keep distinct if desired.
  // Creative template might be a single column with a strong header, or 2 columns.
  // Let's go with a 2-column layout where the sidebar is on the RIGHT this time, or maybe a very artistic header.
  // Let's try a Left Sidebar with a curve or unique shape.
  // For simplicity and "Creative" feel, let's do a dark sidebar with the user photo overlapping.

  const sidebarOrder = meta?.sectionOrder?.sidebar || ['skills', 'education', 'contact'];
  const mainOrder = meta?.sectionOrder?.main || ['summary', 'work', 'projects'];

  // Dynamic Styles based on themeColor
  const primaryColor = themeColor || '#8b5cf6'; // Default Purple

  const renderSection = (id: string, isSidebar: boolean) => {
    switch (id) {
      case 'summary':
        if (!basics.summary) return null;
        return (
          <div key="summary" className="mb-8">
            <h3
              className="text-lg font-bold uppercase mb-3 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              About Me
            </h3>
            <p className="text-slate-700 leading-relaxed text-sm">{basics.summary}</p>
          </div>
        );

      case 'work':
      case 'experience':
        if (work.length === 0) return null;
        return (
          <section key="work" className="mb-10 break-inside-avoid">
            <h3
              className="text-lg font-bold uppercase mb-6 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              Experience
            </h3>
            <div
              className="space-y-8 border-l-2 pl-6 ml-2"
              style={{ borderColor: primaryColor + '40' }}
            >
              {work.map((job, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full border-2 bg-white"
                    style={{ borderColor: primaryColor }}
                  ></div>
                  <div className="mb-2">
                    <h4 className="font-bold text-slate-800 text-base">{job.position}</h4>
                    <div className="text-sm font-semibold" style={{ color: primaryColor }}>
                      {job.name}
                    </div>
                    <span className="text-xs text-slate-500 block mt-1">
                      {[job.startDate, job.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{job.summary}</p>
                  {job.highlights && (
                    <ul className="list-disc ml-4 space-y-1">
                      {job.highlights.map((h, k) => (
                        <li key={k} className="text-xs text-slate-600">
                          {h}
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
          <section key="projects" className="mb-10 break-inside-avoid">
            <h3
              className="text-lg font-bold uppercase mb-6 flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              Projects
            </h3>
            <div className="grid gap-6">
              {projects.map((project, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800 text-sm">
                      {project.name}
                      {project.url && (
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-block"
                        >
                          <LinkIcon size={12} className="text-slate-400 hover:text-blue-500" />
                        </a>
                      )}
                    </h4>
                    <span className="text-xs text-slate-400">
                      {[project.startDate, project.endDate].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{project.description}</p>
                  {project.highlights && (
                    <div className="flex flex-wrap gap-1">
                      {project.highlights.map((h, k) => (
                        <span
                          key={k}
                          className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600"
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

      case 'education':
        if (education.length === 0) return null;
        return (
          <section key="education" className="mb-8 break-inside-avoid">
            <h3
              className={cn(
                'text-sm font-bold uppercase mb-4',
                isSidebar ? 'text-white' : 'text-slate-800'
              )}
              style={{ color: isSidebar ? 'white' : primaryColor }}
            >
              Education
            </h3>
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i}>
                  <div
                    className={cn('font-bold text-sm', isSidebar ? 'text-white' : 'text-slate-800')}
                  >
                    {edu.institution}
                  </div>
                  <div className={cn('text-xs', isSidebar ? 'text-slate-300' : 'text-slate-600')}>
                    {edu.studyType} in {edu.area}
                  </div>
                  <div
                    className={cn(
                      'text-xs opacity-70 mt-1',
                      isSidebar ? 'text-slate-400' : 'text-slate-500'
                    )}
                  >
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' - ')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'skills':
        if (skills.length === 0) return null;
        return (
          <section key="skills" className="mb-8 break-inside-avoid">
            <h3
              className={cn(
                'text-sm font-bold uppercase mb-4',
                isSidebar ? 'text-white' : 'text-slate-800'
              )}
              style={{ color: isSidebar ? 'white' : primaryColor }}
            >
              Skills
            </h3>
            <div className="space-y-4">
              {skills.map((skill, i) => (
                <div key={i}>
                  <div
                    className={cn(
                      'text-xs font-semibold mb-1',
                      isSidebar ? 'text-slate-200' : 'text-slate-700'
                    )}
                  >
                    {skill.name}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {skill.keywords?.map((kw, k) => (
                      <span
                        key={k}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          isSidebar ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'
                        )}
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

      case 'contact':
        // Contact is usually fixed, but if it's in the order list, we render it.
        // For this template, let's say contact is always in sidebar top.
        // We'll skip rendering it here if it's implicitly handled,
        // OR we can make it dynamic. Let's make it dynamic for sidebar.
        if (!isSidebar) return null; // Only render contact in sidebar for this template
        return (
          <div key="contact" className="mb-8 text-sm text-slate-300 space-y-3">
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
                <a
                  href={basics.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white break-all"
                >
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
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white break-all"
                >
                  {profile.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[1] || 'Profile'}
                </a>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="font-sans text-slate-800 bg-white max-w-[210mm] mx-auto min-h-[297mm] shadow-sm print:shadow-none grid grid-cols-[35%_65%] h-full">
      {/* Sidebar (Left) */}
      <aside className="text-white p-8 h-full flex flex-col" style={{ backgroundColor: '#1e293b' }}>
        {' '}
        {/* Slate-800 */}
        {/* Profile Image & Name (Fixed Top) */}
        <div className="mb-10 text-center">
          {basics.image && (
            <div className="mb-4 inline-block relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl mx-auto">
                <img src={basics.image} alt={basics.name} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-wide mb-2 text-white">{basics.name}</h1>
          <p
            className="text-sm font-medium tracking-wider uppercase opacity-80"
            style={{ color: primaryColor }}
          >
            {basics.label}
          </p>
        </div>
        {/* Dynamic Sidebar Sections */}
        <div className="flex-1">{sidebarOrder.map((id) => renderSection(id, true))}</div>
      </aside>

      {/* Main Content (Right) */}
      <main className="p-10 bg-white h-full relative">
        {/* Decorative Top Bar */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: primaryColor }}
        ></div>

        <div className="mt-4">{mainOrder.map((id) => renderSection(id, false))}</div>
      </main>
    </div>
  );
};

export default React.memo(CreativeTemplate);
