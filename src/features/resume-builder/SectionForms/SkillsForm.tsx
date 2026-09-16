import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skill } from '@/types/resume';
import { X } from 'lucide-react';
import { isNonEmptyString } from '@/lib/validation';
import { GenericSectionForm } from './GenericSectionForm';
import { GridField } from './entry-list.shared';

interface SkillsFormProps {
  data: Skill[];
  onChange: (data: Skill[]) => void;
}

const defaultEntry: Skill = { name: '', keywords: [] };

const SkillsForm: React.FC<SkillsFormProps> = ({ data, onChange }) => {
  return (
    <GenericSectionForm<Skill>
      data={data}
      onChange={onChange}
      title="Skills"
      addLabel="Add Category"
      emptyMessage='No skills added yet. Click "Add Category" to start.'
      defaultEntry={defaultEntry}
      getTitle={(entry) => entry.name || '(New Category)'}
      renderFields={(category, handleChange) => {
        const handleAddKeyword = (keyword: string) => {
          if (!isNonEmptyString(keyword)) return;
          const currentKeywords = category.keywords || [];
          handleChange('keywords', [...currentKeywords, keyword]);
        };

        const handleRemoveKeyword = (keywordIndex: number) => {
          const currentKeywords = [...(category.keywords || [])];
          currentKeywords.splice(keywordIndex, 1);
          handleChange('keywords', currentKeywords);
        };

        return (
          <div className="space-y-4">
            <GridField label="Category Name">
              <Input
                value={category.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Languages, Frameworks"
                className="font-medium"
              />
            </GridField>

            <div className="space-y-2">
              <Label>Keywords</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {category.keywords?.map((kw, kIndex) => (
                  <span
                    key={kIndex}
                    className="bg-muted text-foreground px-2 py-1 rounded text-sm flex items-center gap-1 border border-border"
                  >
                    {kw}
                    <button
                      onClick={() => handleRemoveKeyword(kIndex)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                placeholder="Type skill and press Enter..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKeyword(e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        );
      }}
    />
  );
};

export default SkillsForm;
