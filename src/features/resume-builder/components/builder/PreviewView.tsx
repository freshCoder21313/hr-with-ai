import React from 'react';
import {
  List,
  LayoutTemplate,
  Palette,
  Type as TypeIcon,
  Languages,
  Printer,
  Wand2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ResumePreview from '../../ResumePreview';
import { ResumeData, TemplateType } from '@/types/resume';

interface PreviewViewProps {
  data: ResumeData;
  template: TemplateType;
  viewLanguage: 'vi' | 'en';
  isTranslating: boolean;
  onUpdate: (data: ResumeData) => void;
  onSetTemplate: (template: TemplateType) => void;
  onThemeColorChange: (color: string) => void;
  onFontChange: (font: 'sans' | 'serif' | 'mono') => void;
  onTranslate: () => void;
  onPrint: () => void;
  onShowReorder: () => void;
}

const COLORS = [
  '#2563eb', '#1e40af', '#0f172a', '#059669',
  '#16a34a', '#d97706', '#ea580c', '#dc2626',
  '#e11d48', '#c026d3', '#9333ea', '#7c3aed',
  '#4f46e5', '#0891b2', '#0d9488', '#0284c7',
];

const PreviewViewBase: React.FC<PreviewViewProps> = ({
  data,
  template,
  viewLanguage,
  isTranslating,
  onUpdate,
  onSetTemplate,
  onThemeColorChange,
  onFontChange,
  onTranslate,
  onPrint,
  onShowReorder,
}) => {
  return (
    <div className="flex-1 relative overflow-hidden flex bg-muted/30">
      {/* Left Toolbar */}
      <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onShowReorder}
              className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
            >
              <List className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Arrange Sections</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
                >
                  <LayoutTemplate className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Switch Template</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start">
            {(['modern', 'classic', 'creative', 'minimalist', 'academic'] as const).map(
              (t) => (
                <DropdownMenuItem key={t} onClick={() => onSetTemplate(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </DropdownMenuItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                >
                  <Palette className="w-5 h-5 z-10" />
                  <div
                    className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ backgroundColor: data.meta?.themeColor || '#2563eb' }}
                  />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Change Theme Color</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start" className="w-48 p-2">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-full border border-border shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  style={{ backgroundColor: color }}
                  onClick={() => onThemeColorChange(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="col-span-4 mt-2 text-xs text-muted-foreground text-center">
              Color applied to all templates
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all"
                >
                  <TypeIcon className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Change Font</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem onClick={() => onFontChange('sans')}>
              Sans-serif
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFontChange('serif')}>
              Serif
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFontChange('mono')}>
              Monospace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center">
        <div className="scale-[0.8] md:scale-90 origin-top shadow-2xl h-fit w-full max-w-[210mm]">
          <ResumePreview
            data={data}
            template={template}
            onUpdate={onUpdate}
          />
        </div>
      </div>

      {/* Right Toolbar */}
      <div className="hidden md:flex flex-col gap-2 p-4 w-16 items-center shrink-0 z-10 justify-center">
        {(template === 'creative' ||
          template === 'minimalist' ||
          template === 'academic') && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="relative flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-background shadow-sm flex items-center justify-center cursor-pointer overflow-hidden border border-input hover:shadow-md transition-all">
                  <input
                    type="color"
                    value={data.meta?.themeColor || '#8b5cf6'}
                    onChange={(e) => onThemeColorChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer h-full w-full"
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-black/10"
                    style={{ backgroundColor: data.meta?.themeColor || '#8b5cf6' }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Theme Color</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full bg-background shadow-sm hover:shadow-md transition-all relative"
            >
              <Languages className="w-5 h-5" />
              <span className="absolute -bottom-1 -right-1 text-[8px] font-bold bg-primary text-primary-foreground px-1 rounded-sm uppercase">
                {viewLanguage}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold">
                Current: {viewLanguage === 'en' ? 'English' : 'Vietnamese'}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs h-7"
                onClick={onTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <Wand2 className="w-3 h-3 mr-1" />
                )}
                Translate
              </Button>
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={onPrint}
              className="h-10 w-10 rounded-full bg-background text-primary border-primary/20 hover:bg-primary/5 shadow-sm hover:shadow-md transition-all"
            >
              <Printer className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Export PDF</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

export const PreviewView = React.memo(PreviewViewBase);
