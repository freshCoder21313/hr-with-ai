import { SetupFormData } from '@/types';
import { isNonEmptyString, ValidationResult } from './common';

const HAS_LETTER_REGEX = /\p{L}/u;

export function validateInterviewSetup(data: Partial<SetupFormData>): ValidationResult {
  const errors: string[] = [];

  const jobTitle = data.jobTitle;
  if (!isNonEmptyString(jobTitle)) {
    errors.push('Job title is required');
  } else if (!HAS_LETTER_REGEX.test(jobTitle)) {
    errors.push('Job title must contain valid text characters');
  }

  const company = data.company;
  if (!isNonEmptyString(company)) {
    errors.push('Company is required');
  } else if (!HAS_LETTER_REGEX.test(company)) {
    errors.push('Company must contain valid text characters');
  }

  if (!isNonEmptyString(data.interviewerPersona)) errors.push('Interviewer persona is required');
  if (!isNonEmptyString(data.resumeText)) errors.push('Resume text is required');

  return { isValid: errors.length === 0, errors };
}
