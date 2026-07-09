import { ROOT_PROMPT } from '@/services/ai/rootPrompt';

export const getExtractJDInfoPrompt = (jobDescription: string) => `
${ROOT_PROMPT}

Analyze the following Job Description (JD) and extract 6 pieces of information:
1. Target Company (The company hiring)
2. Job Title (The position name)
3. Interviewer Persona (A brief description of a suitable interviewer's style based on the JD. e.g., "A technical lead focused on performance", "A product manager interested in user-centric design").
4. Difficulty Level (Infer from seniority/requirements: 'easy', 'medium', 'hard', or 'hardcore').
5. Company Status (Infer from JD tone: 'Hiring urgently', 'Startup mode', 'Big Corp process', etc.).
6. Interview Context (Infer from JD: 'Video Call', 'On-site', 'System Design Round', etc.).

JOB DESCRIPTION:
${jobDescription}

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly this schema:
{
  "company": "String",
  "jobTitle": "String",
  "interviewerPersona": "String",
  "difficulty": "String", // one of: easy, medium, hard, hardcore
  "companyStatus": "String",
  "interviewContext": "String"
}

If you cannot find the company name, use "Tech Company".
If you cannot find the job title, use "Software Engineer".
For difficulty, default to 'medium' if unsure. 'hardcore' is for Senior/Staff/Principal roles or FAANG.
For the persona, create a professional and relevant one based on the seniority and requirements in the JD.
`;
