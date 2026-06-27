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
