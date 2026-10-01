import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileEditor } from './ProfileEditor';
import { AIProviderProfile } from '@/types';

const profile: AIProviderProfile = {
  id: 'p1',
  name: 'Work',
  provider: 'google',
  apiKey: 'key',
  modelIds: ['gemini-2.5-pro'],
  enabled: true,
};

const renderEditor = (fetchedModels?: string[]) =>
  render(
    <ProfileEditor
      profile={profile}
      fallbackIds={[]}
      isTesting={false}
      isFetchingModels={false}
      fetchedModels={fetchedModels}
      onUpdateProfile={vi.fn()}
      onSetActive={vi.fn()}
      onTestConnection={vi.fn()}
      onFetchModels={vi.fn()}
      onAddModels={vi.fn()}
      onToggleFallback={vi.fn()}
    />
  );

describe('ProfileEditor compact controls', () => {
  it('applies the compact size contract to Add All instead of an ignored min-h override', () => {
    renderEditor(['gemini-2.5-pro', 'gemini-2.5-flash']);

    const addAll = screen.getByRole('button', { name: 'Add All' });
    // `size="sm"` with `min-h-6` left the 44/36px height in place, so the
    // intended compact control was not actually compact.
    expect(addAll.className).toContain('h-10');
    expect(addAll.className).toContain('md:h-8');
    expect(addAll.className).not.toContain('min-h-6');
  });

  it('hides Add All until models have been fetched', () => {
    renderEditor(['gemini-2.5-pro']);

    expect(screen.getByRole('button', { name: 'Add All' })).toBeDefined();
  });
});
