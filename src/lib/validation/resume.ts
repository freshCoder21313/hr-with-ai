import { Basics } from '@/types/resume';
import { isNonEmptyString, isValidEmail, ValidationResult } from './common';

export const RESUME_BASICS_ERRORS = {
  nameRequired: 'Full name is required',
  invalidEmail: 'Please enter a valid email address',
} as const;

export function validateResumeBasics(basics: Partial<Basics>): ValidationResult {
  const errors: string[] = [];

  if (!isNonEmptyString(basics.name)) errors.push(RESUME_BASICS_ERRORS.nameRequired);

  const email = basics.email ?? '';
  if (isNonEmptyString(email) && !isValidEmail(email)) {
    errors.push(RESUME_BASICS_ERRORS.invalidEmail);
  }

  return { isValid: errors.length === 0, errors };
}
