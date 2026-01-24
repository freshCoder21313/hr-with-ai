import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Basics } from '@/types/resume';

interface BasicsFormProps {
  data: Basics;
  onChange: (data: Basics) => void;
}

const BasicsForm: React.FC<BasicsFormProps> = ({ data, onChange }) => {
  const handleChange = (field: keyof Basics, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleLocationChange = (field: keyof NonNullable<Basics['location']>, value: string) => {
    const newLocation = { ...(data.location || {}), [field]: value };
    onChange({ ...data, location: newLocation });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basics & Contact</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={data.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Job Title</Label>
            <Input
              id="label"
              value={data.label || ''}
              onChange={(e) => handleChange('label', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={data.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Profile Image URL</Label>
          <Input
            id="image"
            value={data.image || ''}
            onChange={(e) => handleChange('image', e.target.value)}
            placeholder="https://example.com/photo.jpg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={data.summary || ''}
            onChange={(e) => handleChange('summary', e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.location?.city || ''}
              onChange={(e) => handleLocationChange('city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="countryCode">Country Code</Label>
            <Input
              id="countryCode"
              value={data.location?.countryCode || ''}
              onChange={(e) => handleLocationChange('countryCode', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicsForm;
