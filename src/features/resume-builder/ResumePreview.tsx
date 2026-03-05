import React from 'react';
import { ResumeData } from '@/types/resume';
import ClassicTemplate from './templates/ClassicTemplate';
import ModernTemplate from './templates/ModernTemplate';
import CreativeTemplate from './templates/CreativeTemplate';
import MinimalistTemplate from './templates/MinimalistTemplate';
import AcademicTemplate from './templates/AcademicTemplate';

interface ResumePreviewProps {
  data: ResumeData;
  template?: 'classic' | 'modern' | 'creative' | 'minimalist' | 'academic';
  className?: string;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data, template = 'modern', className }) => {
  const themeColor = data.meta?.themeColor;
  const fontFamily = data.meta?.fontFamily || 'sans';

  const renderTemplate = () => {
    switch (template) {
      case 'classic':
        return <ClassicTemplate data={data} />;
      case 'creative':
        return <CreativeTemplate data={data} themeColor={themeColor} />;
      case 'minimalist':
        return <MinimalistTemplate data={data} themeColor={themeColor} />;
      case 'academic':
        return <AcademicTemplate data={data} themeColor={themeColor} />;
      case 'modern':
      default:
        return <ModernTemplate data={data} />;
    }
  };

  const fontClass =
    fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  return (
    <div
      className={`print:w-full print:h-full print:absolute print:top-0 print:left-0 print:z-50 print:bg-white ${fontClass} ${className || ''}`}
    >
      {renderTemplate()}
    </div>
  );
};

export default ResumePreview;
