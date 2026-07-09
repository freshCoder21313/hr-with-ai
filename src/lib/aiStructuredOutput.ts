import { z } from 'zod';
import { isNonEmptyString } from '@/lib/validation';

const codeBlockPattern = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;

export const cleanStructuredOutput = (text: string): string => {
  const trimmed = text.trim();
  const codeBlockMatch = trimmed.match(codeBlockPattern);
  return (codeBlockMatch?.[1] ?? trimmed).trim();
};

const extractJsonPayload = (text: string): string => {
  const cleaned = cleanStructuredOutput(text);

  const firstObjectIndex = cleaned.indexOf('{');
  const firstArrayIndex = cleaned.indexOf('[');
  const startsWithArray =
    firstArrayIndex !== -1 && (firstObjectIndex === -1 || firstArrayIndex < firstObjectIndex);

  if (startsWithArray) {
    const lastArrayIndex = cleaned.lastIndexOf(']');
    if (lastArrayIndex > firstArrayIndex) {
      return cleaned.slice(firstArrayIndex, lastArrayIndex + 1);
    }
  }

  if (firstObjectIndex !== -1) {
    const lastObjectIndex = cleaned.lastIndexOf('}');
    if (lastObjectIndex > firstObjectIndex) {
      return cleaned.slice(firstObjectIndex, lastObjectIndex + 1);
    }
  }

  return cleaned;
};

export const parseStructuredResponse = <T>(text: string, schema: z.ZodType<T>): T => {
  if (!isNonEmptyString(text)) {
    throw new Error('Structured AI response was empty');
  }

  const payload = extractJsonPayload(text);
  let parsed: unknown;

  try {
    parsed = JSON.parse(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error';
    throw new Error(`Structured AI response was not valid JSON: ${message}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Structured AI response failed schema validation: ${result.error.message}`);
  }

  return result.data;
};

export const jsonOnlyInstruction =
  'Respond ONLY with valid JSON matching the requested schema. Do not include Markdown fences, prose, or explanations.';
