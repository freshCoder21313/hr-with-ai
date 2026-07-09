import { z } from 'zod';

export const jobDescriptionSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  requirements: z.array(z.string()),
  responsibilities: z.array(z.string()),
  salaryRange: z.string().optional(),
});

export type JobDescriptionAIResponse = z.infer<typeof jobDescriptionSchema>;

export const resumeAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  summary: z.string(),
  missingKeywords: z.array(z.string()),
  improvements: z.array(z.string()),
});

export type ResumeAnalysisAIResponse = z.infer<typeof resumeAnalysisSchema>;

export const interviewFeedbackSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  keyQuestionAnalysis: z.array(
    z.object({
      question: z.string(),
      analysis: z.string(),
      improvement: z.string(),
    })
  ),
  mermaidGraphCurrent: z.string(),
  mermaidGraphPotential: z.string(),
  recommendedResources: z.array(
    z.object({
      topic: z.string(),
      description: z.string(),
      searchQuery: z.string(),
    })
  ),
});

export type InterviewFeedbackAIResponse = z.infer<typeof interviewFeedbackSchema>;

export const githubProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

export type GitHubProjectAIResponse = z.infer<typeof githubProjectSchema>;

export const githubInterviewQuestionSchema = z.object({
  question: z.string(),
  topics: z.array(z.string()),
  suggestedAnswer: z.string(),
});

export const githubInterviewQuestionsSchema = z.array(githubInterviewQuestionSchema);

export type GitHubInterviewQuestionAIResponse = z.infer<typeof githubInterviewQuestionSchema>;

export const resumeSectionAnalysisSchema = z.object({
  critique: z.string(),
  suggestions: z.array(z.string()),
  rewrittenExample: z.string(),
});

export type ResumeSectionAnalysisAIResponse = z.infer<typeof resumeSectionAnalysisSchema>;

export const interviewHintsSchema = z.object({
  level1: z.string(),
  level2: z.string(),
  level3: z.string(),
});

export type InterviewHintsAIResponse = z.infer<typeof interviewHintsSchema>;

export const jdExtractSchema = z.object({
  company: z.string(),
  jobTitle: z.string(),
  interviewerPersona: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'hardcore']).optional(),
  companyStatus: z.string().optional(),
  interviewContext: z.string().optional(),
});

export type JdExtractAIResponse = z.infer<typeof jdExtractSchema>;

export const jobRecommendationItemSchema = z.object({
  title: z.string(),
  company: z.string(),
  industry: z.string().optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  keyRequirements: z.array(z.string()).optional(),
  whyItFits: z.string().optional(),
  matchScore: z.number().optional(),
  jobDescription: z.string().optional(),
});

export const jobRecommendationsSchema = z.array(jobRecommendationItemSchema);

export type JobRecommendationItemAIResponse = z.infer<typeof jobRecommendationItemSchema>;

const resumeSectionArraySchema = z.array(z.record(z.string(), z.unknown()));

export const resumeDataSchema = z
  .object({
    basics: z.record(z.string(), z.unknown()).optional(),
    work: resumeSectionArraySchema.optional(),
    education: resumeSectionArraySchema.optional(),
    skills: resumeSectionArraySchema.optional(),
    projects: resumeSectionArraySchema.optional(),
    language: z.enum(['vi', 'en']).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const stringArraySchema = z.array(z.string());

export const quizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correct_answer: z.string(),
  explanation: z.string(),
  sub_skill: z.string(),
  hint: z.string().optional(),
});

export const quizQuestionsSchema = z.array(quizQuestionSchema);

export const interviewFeedbackSchemaExtended = interviewFeedbackSchema.extend({
  resilienceScore: z.number().min(0).max(10).optional(),
  cultureFitScore: z.number().min(0).max(10).optional(),
  badges: z.array(z.string()).optional(),
});
