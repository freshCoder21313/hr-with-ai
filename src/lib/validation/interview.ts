import { SetupFormData } from '@/types';
import { isNonEmptyString, ValidationResult } from './common';

export function validateInterviewSetup(data: Partial<SetupFormData>): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(data.jobTitle)) errors.push('Job title is required');
  if (!isNonEmptyString(data.company)) errors.push('Company is required');
  if (!isNonEmptyString(data.interviewerPersona)) errors.push('Interviewer persona is required');
  if (!isNonEmptyString(data.resumeText)) errors.push('Resume text is required');

  return { isValid: errors.length === 0, errors };
}