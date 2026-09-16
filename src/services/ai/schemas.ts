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

export const profileSchema = z
  .object({
    network: z.string(),
    username: z.string(),
    url: z.string(),
  })
  .passthrough();

export const locationSchema = z
  .object({
    address: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    region: z.string().optional(),
  })
  .passthrough();

export const basicsSchema = z
  .object({
    name: z.string().min(1),
    label: z.string().optional(),
    image: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
    location: locationSchema.optional(),
    profiles: z.array(profileSchema).optional(),
  })
  .passthrough();

export const workSchema = z
  .object({
    name: z.string().min(1),
    position: z.string().min(1),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })
  .passthrough();

export const educationSchema = z
  .object({
    institution: z.string().min(1),
    url: z.string().optional(),
    area: z.string().min(1),
    studyType: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    score: z.string().optional(),
    courses: z.array(z.string()).optional(),
  })
  .passthrough();

export const skillSchema = z
  .object({
    name: z.string().min(1),
    level: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  })
  .passthrough();

export const projectSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    url: z.string().optional(),
    roles: z.array(z.string()).optional(),
  })
  .passthrough();

export const volunteerSchema = z
  .object({
    organization: z.string().optional(),
    position: z.string().optional(),
    url: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
  })
  .passthrough();

export const awardSchema = z
  .object({
    title: z.string().min(1),
    date: z.string().optional(),
    awarder: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

export const publicationSchema = z
  .object({
    name: z.string().min(1),
    publisher: z.string().optional(),
    releaseDate: z.string().optional(),
    url: z.string().optional(),
    summary: z.string().optional(),
  })
  .passthrough();

const sectionSchemaMap: Record<string, z.ZodTypeAny> = {
  basics: basicsSchema,
  work: z.array(workSchema),
  education: z.array(educationSchema),
  skills: z.array(skillSchema),
  projects: z.array(projectSchema),
  volunteer: z.array(volunteerSchema),
  awards: z.array(awardSchema),
  publications: z.array(publicationSchema),
  languages: z.array(z.object({ language: z.string(), fluency: z.string() }).passthrough()),
  interests: z.array(z.object({ name: z.string(), keywords: z.array(z.string()) }).passthrough()),
  references: z.array(z.object({ name: z.string(), reference: z.string() }).passthrough()),
  language: z.enum(['vi', 'en']),
  meta: z.record(z.string(), z.unknown()),
};

export const proposedChangeSchema = z
  .object({
    id: z.string().optional(),
    section: z.string(),
    action: z.enum(['update', 'add', 'delete', 'rewrite']),
    newData: z.unknown(),
    explanation: z.string().min(1),
  })
  .superRefine((val, ctx) => {
    const schema = sectionSchemaMap[val.section];
    if (!schema) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown section: ${val.section}`,
        path: ['section'],
      });
      return;
    }

    // delete action doesn't strictly need newData validation if it's just an ID or index,
    // but usually it carries the object being deleted or is null.
    // For simplicity and safety, we validate if it's an update/add/rewrite.
    if (val.action !== 'delete') {
      const result = schema.safeParse(val.newData);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: issue.message,
            path: ['newData', ...issue.path],
          });
        });
      }
    }
  });

export type ProposedChangeAIResponse = z.infer<typeof proposedChangeSchema>;

export const validateProposedChange = (change: unknown) => {
  return proposedChangeSchema.parse(change);
};

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
