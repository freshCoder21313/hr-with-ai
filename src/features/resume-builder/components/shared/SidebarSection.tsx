import React from 'react';

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ title, children }) => {
  return (
    <section className="mb-8">
      <h3 className="text-white font-bold uppercase tracking-wider border-b border-slate-700 pb-2 mb-4 text-sm">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
};
