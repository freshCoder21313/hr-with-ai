import { ROOT_PROMPT } from '@/services/ai/rootPrompt';

export const getParseResumePrompt = (rawText: string) => `
${ROOT_PROMPT}

You are an expert Data Parser. Convert the following Resume Text into a structured JSON object following the JSON Resume Schema.
IMPORTANT: Clean up and format the text content to be professional. Remove excessive newlines, fix capitalization, and merge broken sentences.

RESUME TEXT:
${rawText}

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly this structure:
{
  "basics": {
    "name": "String",
    "email": "String",
    "phone": "String",
    "label": "String (Job Title)",
    "summary": "String (Profile/About - Cleaned and well-formatted)",
    "location": { "city": "String", "countryCode": "String" },
    "profiles": [{ "network": "String (LinkedIn/GitHub)", "url": "String", "username": "String" }]
  },
  "work": [{
    "name": "String (Company)",
    "position": "String",
    "startDate": "String (YYYY-MM-DD or YYYY-MM)",
    "endDate": "String (YYYY-MM-DD or YYYY-MM or Present)",
    "summary": "String (Cleaned up description)",
    "highlights": ["String (Well-formatted bullet point)", "String"]
  }],
  "education": [{
    "institution": "String",
    "area": "String (Major)",
    "studyType": "String (Degree)",
    "startDate": "String",
    "endDate": "String"
  }],
  "skills": [{
    "name": "String (Category, e.g. Frontend)",
    "keywords": ["String", "String"]
  }],
  "projects": [{
    "name": "String",
    "description": "String (Cleaned up description)",
    "highlights": ["String"],
    "keywords": ["String"],
    "url": "String"
  }]
}

If a field is missing in the text, omit it or use empty strings. Do not invent data.
Ensure all text values are properly spaced and formatted (e.g., "word1 word2" not "word1  word2" or "w o r d").
`;

export const getResumeAnalysisPrompt = (resumeText: string, jobDescription: string) => `
${ROOT_PROMPT}

You are an expert Talent Acquisition Specialist and Technical Recruiter.
Analyze the following Candidate Resume against the Job Description (JD) and provide a "Pre-Interview Match Analysis".

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

YOUR TASK:
1. Calculate a **Match Score** (0-100) based on how well the resume fits the JD.
2. Identify **Missing Keywords** or skills that are critical in the JD but missing in the Resume.
3. Provide **Specific Improvements** to make the resume a better fit for this role.

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly this schema:
{
  "matchScore": number, // 0-100
  "summary": "String. A brutally honest but constructive 2-3 sentence summary of the fit.",
  "missingKeywords": ["String", "String", "String"], // Top 5 missing critical skills/terms
  "improvements": ["String", "String", "String"] // Top 3 specific actionable advice to edit the resume
}
`;

export const getAnalyzeSectionPrompt = (sectionName: string, sectionData: unknown) => `
${ROOT_PROMPT}

You are an expert Resume Writer and Career Coach.
Analyze the following "${sectionName}" section from a candidate's resume and suggest improvements.

CURRENT CONTENT (JSON):
${JSON.stringify(sectionData, null, 2)}

YOUR TASK:
1. Identify weak verbs, vague statements, or formatting issues.
2. Provide a specific, actionable critique.
3. Rewrite 1-2 bullet points to show "Impact" (e.g. using numbers, results).

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers):
{
  "critique": "String (2-3 sentences)",
  "suggestions": ["String", "String"],
  "rewrittenExample": "String (A strong example of how this could look)"
}
`;

export const getTailoredResumePrompt = (sourceResume: unknown, jobDescription: string) => `
${ROOT_PROMPT}

You are an expert Resume Strategist and Career Coach.
Your task is to REWRITE and TAILOR the following Candidate Resume to specifically target the provided Job Description (JD).

SOURCE RESUME (JSON):
${JSON.stringify(sourceResume, null, 2)}

TARGET JOB DESCRIPTION:
${jobDescription}

YOUR MISSION:
1. **Analyze**: Identify the key skills, keywords, and qualifications required in the JD.
2. **Reframe Summary**: Rewrite the "basics.summary" to bridge the candidate's past experience with the new role. Highlight relevant transferable skills.
3. **Tailor Experience**:
   - Keep the same companies and dates (do not invent employment history).
   - Rewrite "summary" and "highlights" for each job to emphasize relevance to the new JD.
   - Use keywords from the JD naturally.
   - If a past role is irrelevant, minimize it (fewer bullets), but do not delete it if it leaves a gap.
4. **Select Projects**:
   - Select at least 3-5 of the most relevant projects from the source resume.
   - If fewer than 3 projects exist, keep all of them.
   - Rewrite descriptions to focus on the tech stack mentioned in the JD.
5. **Optimize Skills**: Reorder or group skills to prioritize what the JD asks for.

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly the Resume JSON structure:
{
  "basics": { ... },
  "work": [ ... ],
  "education": [ ... ],
  "skills": [ ... ],
  "projects": [ ... ]
}
`;
