import React from 'react';
import { ResumeData } from '@/types/resume';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const GOOGLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Merriweather',
  'Playfair Display',
  'Lora',
  'PT Serif',
  'JetBrains Mono',
  'Fira Code',
];

interface Props {
  data: ResumeData;
  onUpdate: (updater: (prev: ResumeData) => ResumeData) => void;
  onClose?: () => void;
}

const StyleEditorPanel: React.FC<Props> = ({ data, onUpdate, onClose }) => {
  const styles = data.meta?.customStyles || {};

  const handleStyleChange = (
    section: keyof typeof styles,
    property: 'fontSize' | 'color' | 'fontFamily' | 'lineHeight' | 'fontWeight' | 'sectionGap' | 'itemGap',
    value: string
  ) => {
    onUpdate((prev) => ({
      ...prev,
      meta: {
        ...prev.meta,
        customStyles: {
          ...prev.meta?.customStyles,
          [section]: {
            ...prev.meta?.customStyles?.[section],
            [property]: value,
          },
        },
      },
    }));
  };

  const parseFontSize = (val: string | undefined, defaultVal: number) => {
    if (!val) return defaultVal;
    const parsed = parseInt(val.replace('px', ''));
    return isNaN(parsed) ? defaultVal : parsed;
  };

  return (
    <Card className="fixed right-4 top-24 w-80 shadow-2xl z-50 overflow-y-auto max-h-[80vh] border border-border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-bold">Style Settings</CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        {/* Name Styles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm border-b pb-1">Name</h3>

          <div className="space-y-2">
            <Label className="text-xs">Font Family</Label>
            <Select
              value={styles.name?.fontFamily || ''}
              onValueChange={(val: string) => handleStyleChange('name', 'fontFamily', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default (Inherit)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Size ({parseFontSize(styles.name?.fontSize, 24)}px)</Label>
            </div>
            <Slider
              min={16}
              max={48}
              step={1}
              value={[parseFontSize(styles.name?.fontSize, 24)]}
              onValueChange={([val]: number[]) => handleStyleChange('name', 'fontSize', `${val}px`)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styles.name?.color || '#000000'}
                onChange={(e) => handleStyleChange('name', 'color', e.target.value)}
                className="h-8 w-14 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={styles.name?.color || '#000000'}
                onChange={(e) => handleStyleChange('name', 'color', e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Headings Styles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm border-b pb-1">Headings</h3>

          <div className="space-y-2">
            <Label className="text-xs">Font Family</Label>
            <Select
              value={styles.headings?.fontFamily || ''}
              onValueChange={(val: string) => handleStyleChange('headings', 'fontFamily', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default (Inherit)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">
                Size ({parseFontSize(styles.headings?.fontSize, 16)}px)
              </Label>
            </div>
            <Slider
              min={14}
              max={28}
              step={1}
              value={[parseFontSize(styles.headings?.fontSize, 16)]}
              onValueChange={([val]: number[]) =>
                handleStyleChange('headings', 'fontSize', `${val}px`)
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styles.headings?.color || '#000000'}
                onChange={(e) => handleStyleChange('headings', 'color', e.target.value)}
                className="h-8 w-14 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={styles.headings?.color || '#000000'}
                onChange={(e) => handleStyleChange('headings', 'color', e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Body Styles */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm border-b pb-1">Body Text</h3>

          <div className="space-y-2">
            <Label className="text-xs">Font Family</Label>
            <Select
              value={styles.body?.fontFamily || ''}
              onValueChange={(val: string) => handleStyleChange('body', 'fontFamily', val)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Default (Inherit)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Default</SelectItem>
                {GOOGLE_FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Size ({parseFontSize(styles.body?.fontSize, 12)}px)</Label>
            </div>
            <Slider
              min={10}
              max={18}
              step={1}
              value={[parseFontSize(styles.body?.fontSize, 12)]}
              onValueChange={([val]: number[]) => handleStyleChange('body', 'fontSize', `${val}px`)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styles.body?.color || '#000000'}
                onChange={(e) => handleStyleChange('body', 'color', e.target.value)}
                className="h-8 w-14 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={styles.body?.color || '#000000'}
                onChange={(e) => handleStyleChange('body', 'color', e.target.value)}
                className="h-8 flex-1 text-xs"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Line Height ({styles.body?.lineHeight || 1.5})</Label>
            </div>
            <Slider
              min={1}
              max={2.5}
              step={0.1}
              value={[parseFloat(styles.body?.lineHeight || '1.5')]}
              onValueChange={([val]: number[]) => handleStyleChange('body', 'lineHeight', `${val}`)}
            />
          </div>
        </div>

        {/* Adjust spacing */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm border-b pb-1">Spacing</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Section Gap ({styles.spacing?.sectionGap || '1.5rem'})</Label>
            </div>
            <Slider
              min={0.5}
              max={4}
              step={0.25}
              value={[parseFloat((styles.spacing?.sectionGap || '1.5rem').replace('rem', ''))]}
              onValueChange={([val]: number[]) => handleStyleChange('spacing', 'sectionGap', `${val}rem`)}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Item Gap ({styles.spacing?.itemGap || '0.75rem'})</Label>
            </div>
            <Slider
              min={0.25}
              max={2}
              step={0.25}
              value={[parseFloat((styles.spacing?.itemGap || '0.75rem').replace('rem', ''))]}
              onValueChange={([val]: number[]) => handleStyleChange('spacing', 'itemGap', `${val}rem`)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StyleEditorPanel;
