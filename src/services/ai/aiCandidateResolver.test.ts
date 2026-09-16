import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCandidates } from './aiCandidateResolver';
import { loadUserSettings } from '@/services/core/settingsService';

vi.mock('@/services/core/settingsService', () => ({
  loadUserSettings: vi.fn(),
}));

describe('AI Candidate Resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bypasses resolution for explicit source', async () => {
    const config = { provider: 'google', apiKey: 'test', source: 'explicit' } as any;
    const candidates = await resolveCandidates(config);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].provider).toBe('google');
  });

  it('resolves active profile and fallbacks in order', async () => {
    const mockSettings = {
      aiProfiles: [
        {
          id: 'p1',
          name: 'Profile 1',
          provider: 'google',
          apiKey: 'k1',
          modelIds: ['m1'],
          enabled: true,
        },
        {
          id: 'p2',
          name: 'Profile 2',
          provider: 'openai',
          apiKey: 'k2',
          modelIds: ['m2'],
          enabled: true,
        },
        {
          id: 'p3',
          name: 'Profile 3',
          provider: 'anthropic',
          apiKey: 'k3',
          modelIds: ['m3'],
          enabled: false,
        }, // Disabled
      ],
      activeAIProfileId: 'p1',
      aiFallbackProfileIds: ['p2', 'p3'],
    };
    (loadUserSettings as any).mockResolvedValue(mockSettings);

    const config = { source: 'active-profile' } as any;
    const candidates = await resolveCandidates(config);

    expect(candidates).toHaveLength(2); // p1 and p2 (p3 is disabled)
    expect(candidates[0].profileId).toBe('p1');
    expect(candidates[0].modelId).toBe('m1');
    expect(candidates[1].profileId).toBe('p2');
    expect(candidates[1].modelId).toBe('m2');
  });

  it('does NOT deduplicate candidates across different profiles', async () => {
    const mockSettings = {
      aiProfiles: [
        { id: 'p1', name: 'P1', provider: 'google', apiKey: 'k1', modelIds: ['m1'], enabled: true },
        { id: 'p2', name: 'P2', provider: 'google', apiKey: 'k2', modelIds: ['m1'], enabled: true }, // Same provider/model, different profile
      ],
      activeAIProfileId: 'p1',
      aiFallbackProfileIds: ['p2'],
    };
    (loadUserSettings as any).mockResolvedValue(mockSettings);

    const candidates = await resolveCandidates({ source: 'active-profile' } as any);
    expect(candidates).toHaveLength(2); // Should NOT dedupe because they are different profiles
  });

  it('deduplicates multiple models within the SAME profile', async () => {
    const mockSettings = {
      aiProfiles: [
        {
          id: 'p1',
          name: 'P1',
          provider: 'google',
          apiKey: 'k1',
          modelIds: ['m1', 'm1'],
          enabled: true,
        },
      ],
      activeAIProfileId: 'p1',
    };
    (loadUserSettings as any).mockResolvedValue(mockSettings);

    const candidates = await resolveCandidates({ source: 'active-profile' } as any);
    expect(candidates).toHaveLength(1);
  });

  it('throws a configuration error when no candidates are resolved', async () => {
    const mockSettings = {
      aiProfiles: [
        {
          id: 'p1',
          name: 'P1',
          provider: 'google',
          apiKey: 'k1',
          modelIds: ['m1'],
          enabled: false,
        }, // Disabled
      ],
      activeAIProfileId: 'p1',
    };
    (loadUserSettings as any).mockResolvedValue(mockSettings);

    await expect(resolveCandidates({ source: 'active-profile' } as any)).rejects.toThrow(
      'No enabled AI profiles found'
    );
  });

  it('handles multiple models in a single profile', async () => {
    const mockSettings = {
      aiProfiles: [
        {
          id: 'p1',
          name: 'P1',
          provider: 'google',
          apiKey: 'k1',
          modelIds: ['m1', 'm2'],
          enabled: true,
        },
      ],
      activeAIProfileId: 'p1',
    };
    (loadUserSettings as any).mockResolvedValue(mockSettings);

    const candidates = await resolveCandidates({ source: 'active-profile' } as any);
    expect(candidates).toHaveLength(2);
    expect(candidates[0].modelId).toBe('m1');
    expect(candidates[1].modelId).toBe('m2');
  });
});
