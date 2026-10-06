import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RESUME_BASICS_ERRORS, validateResumeBasics } from '@/lib/validation';
import { Basics } from '@/types/resume';

interface BasicsFormProps {
  data: Basics;
  onChange: (data: Basics) => void;
}

const BasicsForm: React.FC<BasicsFormProps> = ({ data, onChange }) => {
  const [showAdditional, setShowAdditional] = useState(() => {
    return Boolean(data.image || data.location?.city || data.location?.countryCode);
  });

  const handleChange = (field: keyof Basics, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleLocationChange = (field: keyof NonNullable<Basics['location']>, value: string) => {
    const newLocation = { ...(data.location || {}), [field]: value };
    onChange({ ...data, location: newLocation });
  };

  const basicsValidation = validateResumeBasics(data);
  const emailError = basicsValidation.errors.includes(RESUME_BASICS_ERRORS.invalidEmail)
    ? RESUME_BASICS_ERRORS.invalidEmail
    : undefined;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl font-bold">Basics & Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. Alex Morgan"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Job Title</Label>
            <Input
              id="label"
              value={data.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. alex@example.com"
              aria-invalid={emailError ? true : undefined}
              className={
                emailError ? 'border-destructive focus-visible:ring-destructive' : undefined
              }
            />
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +1 555-0199"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={data.summary || ''}
            onChange={(e) => handleChange('summary', e.target.value)}
            rows={4}
            placeholder="Brief overview of your professional background and key achievements..."
          />
        </div>

        {/* Progressive Disclosure: Location & Photo */}
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdditional(!showAdditional)}
            className="w-full border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 py-2 text-xs transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {showAdditional ? 'Hide Location & Photo' : '+ Add Location & Photo (Optional)'}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                showAdditional ? 'rotate-180' : ''
              )}
            />
          </Button>
        </div>

        {showAdditional && (
          <div className="space-y-4 pt-3 border-t border-border/60 animate-in fade-in-50 duration-200">
            <div className="space-y-2">
              <Label htmlFor="image">Profile Image URL</Label>
              <Input
                id="image"
                value={data.image || ''}
                onChange={(e) => handleChange('image', e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={data.location?.city || ''}
                  onChange={(e) => handleLocationChange('city', e.target.value)}
                  placeholder="e.g. San Francisco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="countryCode">Country Code</Label>
                <Input
                  id="countryCode"
                  value={data.location?.countryCode || ''}
                  onChange={(e) => handleLocationChange('countryCode', e.target.value)}
                  placeholder="e.g. US, VN"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicsForm;
