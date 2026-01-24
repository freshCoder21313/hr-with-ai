import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skill } from '@/types/resume';
import { Plus, Trash2, X } from 'lucide-react';

interface SkillsFormProps {
  data: Skill[];
  onChange: (data: Skill[]) => void;
}

const SkillsForm: React.FC<SkillsFormProps> = ({ data, onChange }) => {
  const handleAddCategory = () => {
    onChange([...data, { name: 'New Skill Category', keywords: [] }]);
  };

  const handleRemoveCategory = (index: number) => {
    if (confirm('Remove this skill category?')) {
      const newData = [...data];
      newData.splice(index, 1);
      onChange(newData);
    }
  };

  const handleNameChange = (index: number, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], name: value };
    onChange(newData);
  };

  const handleAddKeyword = (index: number, keyword: string) => {
    if (!keyword.trim()) return;
    const newData = [...data];
    const currentKeywords = newData[index].keywords || [];
    newData[index] = { ...newData[index], keywords: [...currentKeywords, keyword] };
    onChange(newData);
  };

  const handleRemoveKeyword = (catIndex: number, keywordIndex: number) => {
    const newData = [...data];
    const currentKeywords = [...(newData[catIndex].keywords || [])];
    currentKeywords.splice(keywordIndex, 1);
    newData[catIndex] = { ...newData[catIndex], keywords: currentKeywords };
    onChange(newData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">Skills</h2>
        <Button onClick={handleAddCategory} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((category, index) => (
          <Card key={index} className="relative group">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveCategory(index)}
                className="h-8 w-8 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input
                    value={category.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    placeholder="e.g. Languages, Frameworks"
                    className="font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Keywords</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {category.keywords?.map((kw, kIndex) => (
                      <span
                        key={kIndex}
                        className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm flex items-center gap-1 border border-slate-200"
                      >
                        {kw}
                        <button
                          onClick={() => handleRemoveKeyword(index, kIndex)}
                          className="text-slate-400 hover:text-red-500"
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
                        handleAddKeyword(index, e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-slate-400">
          No skills added yet.
        </div>
      )}
    </div>
  );
};

export default SkillsForm;
