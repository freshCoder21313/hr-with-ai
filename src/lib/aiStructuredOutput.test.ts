import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { cleanStructuredOutput, parseStructuredResponse } from './aiStructuredOutput';

const schema = z.object({ name: z.string(), score: z.number() });

describe('aiStructuredOutput', () => {
  it('cleans markdown JSON code fences', () => {
    expect(cleanStructuredOutput('```json\n{"name":"Ada"}\n```')).toBe('{"name":"Ada"}');
  });

  it('parses plain JSON', () => {
    expect(parseStructuredResponse('{"name":"Ada","score":100}', schema)).toEqual({
      name: 'Ada',
      score: 100,
    });
  });

  it('parses fenced markdown JSON', () => {
    expect(parseStructuredResponse('```json\n{"name":"Ada","score":100}\n```', schema)).toEqual({
      name: 'Ada',
      score: 100,
    });
  });

  it('extracts embedded JSON from surrounding text', () => {
    expect(parseStructuredResponse('Here is the JSON: {"name":"Ada","score":100}.', schema)).toEqual({
      name: 'Ada',
      score: 100,
    });
  });

  it('reports malformed JSON', () => {
    expect(() => parseStructuredResponse('{"name":"Ada"', schema)).toThrow(
      'Structured AI response was not valid JSON'
    );
  });

  it('reports schema mismatches', () => {
    expect(() => parseStructuredResponse('{"name":"Ada","score":"high"}', schema)).toThrow(
      'Structured AI response failed schema validation'
    );
  });
});
