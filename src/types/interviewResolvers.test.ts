import { describe, it, expect } from 'vitest';
import { resolveInterviewContentType, resolveInterviewInteractionMode } from './index';

describe('interview resolvers', () => {
  it('prefers explicit type for content', () => {
    expect(resolveInterviewContentType({ type: 'coding', mode: 'voice' })).toBe('coding');
  });

  it('falls back to mode when type missing and mode is content-like', () => {
    expect(resolveInterviewContentType({ mode: 'system_design' })).toBe('system_design');
  });

  it('defaults content type to standard', () => {
    expect(resolveInterviewContentType({ mode: 'voice' })).toBe('standard');
  });

  it('resolves interaction modes', () => {
    expect(resolveInterviewInteractionMode({ mode: 'hybrid' })).toBe('hybrid');
    expect(resolveInterviewInteractionMode({ mode: 'coding' })).toBe('text');
    expect(resolveInterviewInteractionMode({})).toBe('text');
  });
});
