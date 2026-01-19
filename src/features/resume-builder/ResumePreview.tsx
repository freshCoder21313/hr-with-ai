import React from 'react';
import { ResumeData } from '@/types/resume';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';

interface ResumePreviewProps {
  data: ResumeData;
  template?: 'classic' | 'modern';
  className?: string;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data, template = 'modern', className }) => {
  return (
    <div className={`print:w-full print:h-full print:absolute print:top-0 print:left-0 print:z-50 print:bg-white ${className}`}>
      {template === 'classic' ? (
        <ClassicTemplate data={data} />
      ) : (
        <ModernTemplate data={data} />
      )}
    </div>
  );
};

export default ResumePreview;
