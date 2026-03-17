import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  title: string;
  className?: string;
  children: React.ReactNode;
  titleClassName?: string;
}

export const Section: React.FC<SectionProps> = ({ title, className, children, titleClassName }) => {
  return (
    <section className={cn('mb-8', className)}>
      <h2 className={cn('text-sm font-bold uppercase tracking-widest mb-4', titleClassName)}>
        {title}
      </h2>
      {children}
    </section>
  );
};
