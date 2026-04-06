import { describe, it, expect } from 'vitest';
import { cleanJsonString } from './aiUtils';

describe('cleanJsonString', () => {
  it('should remove markdown code blocks from a JSON string', () => {
    const jsonText = '```json\n{"foo": "bar"}\n```';
    expect(cleanJsonString(jsonText)).toBe('{"foo": "bar"}');
  });

  it('should remove markdown code blocks without newline', () => {
    const jsonText = '```json{"foo": "bar"}```';
    expect(cleanJsonString(jsonText)).toBe('{"foo": "bar"}');
  });

  it('should handle string with no code blocks', () => {
    const jsonText = '{"foo": "bar"}';
    expect(cleanJsonString(jsonText)).toBe('{"foo": "bar"}');
  });

  it('should handle empty string', () => {
    const jsonText = '';
    expect(cleanJsonString(jsonText)).toBe('');
  });

  it('should handle string with only whitespace', () => {
    const jsonText = '   ';
    expect(cleanJsonString(jsonText)).toBe('');
  });
});
