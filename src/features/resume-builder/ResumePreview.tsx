import React, { useMemo } from 'react';
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
  onUpdate?: (newData: ResumeData) => void;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({
  data,
  template = 'modern',
  className,
  onUpdate,
}) => {
  const themeColor = data.meta?.themeColor;
  const fontFamily = data.meta?.fontFamily || 'sans';

  const handleOrderChange = (newSidebar: string[], newMain: string[]) => {
    if (onUpdate) {
      onUpdate({
        ...data,
        meta: {
          ...data.meta,
          sectionOrder: {
            ...data.meta?.sectionOrder,
            sidebar: newSidebar,
            main: newMain,
          },
        },
      });
    }
  };

  const renderTemplate = () => {
    const customStyles = data.meta?.customStyles;
    const templateProps = { data, onUpdate, themeColor, customStyles };

    switch (template) {
      case 'classic':
        return <ClassicTemplate {...templateProps} />;
      case 'creative':
        return <CreativeTemplate {...templateProps} />;
      case 'minimalist':
        return <MinimalistTemplate {...templateProps} />;
      case 'academic':
        return <AcademicTemplate {...templateProps} />;
      case 'modern':
      default:
        return <ModernTemplate {...templateProps} onOrderChange={handleOrderChange} />;
    }
  };

  const fontClass =
    fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  // Generate Google Fonts URL and CSS Variables
  const { googleFontsUrl, cssVariables } = useMemo(() => {
    const defaultColor = '#000000';
    const styles = data.meta?.customStyles || {};

    // 1. Gather Font Families
    const fontsToLoad = new Set<string>();

    // Add base fontFamily (sans, serif, mono) are usually system fonts,
    // but if the user explicitly set a Google Font in customStyles, we load it.
    if (styles.name?.fontFamily) fontsToLoad.add(styles.name.fontFamily);
    if (styles.headings?.fontFamily) fontsToLoad.add(styles.headings.fontFamily);
    if (styles.body?.fontFamily) fontsToLoad.add(styles.body.fontFamily);

    let fontsUrl = '';
    if (fontsToLoad.size > 0) {
      const familyParams = Array.from(fontsToLoad)
        .map((font) => `family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700`)
        .join('&');
      fontsUrl = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    }

    // 2. Generate CSS Variables
    const vars: Record<string, string> = {
      '--color-primary': themeColor || '#3b82f6',
      '--color-text-global': styles.globalText?.color || defaultColor,

      '--font-name': styles.name?.fontFamily
        ? `"${styles.name.fontFamily}", sans-serif`
        : 'inherit',
      '--color-name': styles.name?.color || defaultColor,
      '--size-name': styles.name?.fontSize || '24px',
      '--weight-name': styles.name?.fontWeight || 'bold',

      '--font-heading': styles.headings?.fontFamily
        ? `"${styles.headings.fontFamily}", sans-serif`
        : 'inherit',
      '--color-heading': styles.headings?.color || defaultColor,
      '--size-heading': styles.headings?.fontSize || '16px',
      '--weight-heading': styles.headings?.fontWeight || 'bold',

      '--font-body': styles.body?.fontFamily
        ? `"${styles.body.fontFamily}", sans-serif`
        : 'inherit',
      '--color-body': styles.body?.color || defaultColor,
      '--size-body': styles.body?.fontSize || '12px',
      '--lh-body': styles.body?.lineHeight || '1.5',

      '--spacing-section': styles.spacing?.sectionGap || '1.5rem',
      '--spacing-item': styles.spacing?.itemGap || '0.75rem',
    };

    const cssString = Object.entries(vars)
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n');

    return { googleFontsUrl: fontsUrl, cssVariables: cssString };
  }, [data.meta?.customStyles, themeColor]);

  return (
    <>
      {googleFontsUrl && <link href={googleFontsUrl} rel="stylesheet" />}
      <style>{`
        .resume-preview-container {
          ${cssVariables}
        }
      `}</style>
      <div
        className={`resume-preview-container print:w-full print:h-full print:absolute print:top-0 print:left-0 print:z-50 print:bg-white ${fontClass} ${className || ''}`}
      >
        {renderTemplate()}
      </div>
    </>
  );
};

export default ResumePreview;
