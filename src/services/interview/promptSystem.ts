/**
 * @deprecated Prefer `@/services/prompts` (domain-split modules).
 * Re-export kept for existing service imports.
 */
export {
  getSystemPrompt,
  getStartPrompt,
  getHintPrompt,
  getFeedbackPrompt,
  getParseResumePrompt,
  getResumeAnalysisPrompt,
  getAnalyzeSectionPrompt,
  getTailoredResumePrompt,
  getExtractJDInfoPrompt,
  getCompanyIntelPrompt,
} from '@/services/prompts';
