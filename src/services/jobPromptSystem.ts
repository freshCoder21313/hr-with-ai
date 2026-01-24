import { ResumeData } from '@/types/resume';

// Prompt for generating job recommendations from resume data
export const generateJobRecommendationsPrompt = (resumeData: ResumeData, language: string) => `
Analyze the following resume and generate ${language === 'vi-VN' ? '3-5' : '3-5'} relevant job opportunities.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

Requirements:
1. Generate realistic job titles based on skills and experience
2. Include realistic company names (use well-known Vietnamese and international tech companies when possible)
3. For each job, provide:
   - Title
   - Company
   - Industry
   - Location (e.g., Hanoi, Ho Chi Minh City, Remote)
   - Salary Range (e.g., $3000-5000/month)
   - Key Requirements (3-5 bullet points)
   - Why this job fits the candidate (based on their experience)
   - Match Score (0-100 based on fit)
   - Detailed Job Description (2-3 paragraphs)

Format: JSON array of objects with the following structure:
[
  {
    "title": "Senior Frontend Engineer",
    "company": "TechCorp",
    "industry": "Technology",
    "location": "Hanoi, Vietnam",
    "salaryRange": "$3,000 - $5,000/month",
    "keyRequirements": ["React", "TypeScript", "Node.js", "CSS"],
    "whyItFits": "Your experience with React and TypeScript matches our frontend stack perfectly.",
    "matchScore": 85,
    "jobDescription": "We are looking for a senior frontend engineer..."
  }
]
`;

// Prompt for generating tailored resume for specific job
export const generateTailoredResumePrompt = (
  originalResumeData: ResumeData,
  jobDescription: string
) => `
Generate a tailored version of this resume specifically for the following job:

Job Description:
${jobDescription}

Original Resume Data:
${JSON.stringify(originalResumeData, null, 2)}

Requirements:
1. Modify the resume to highlight relevant skills and experience
2. Adjust the professional summary if needed
3. Reorder bullet points to prioritize relevant achievements
4. Add keywords from the job description
5. Maintain the original structure and format
6. Return JSON Resume format

Format: JSON Resume object matching the input structure
`;
