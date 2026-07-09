import { Interview } from '@/types';
import { ROOT_PROMPT } from '@/services/ai/rootPrompt';

export const getFeedbackPrompt = (
  interview: Interview,
  conversationHistory: string,
  codeContext: string
) => `
${ROOT_PROMPT}

Analyze this interview transcript and provide detailed, actionable feedback.

CONTEXT:
Role: ${interview.jobTitle} at ${interview.company}
Language: ${interview.language}

IMPORTANT: You MUST write ALL the feedback (summary, strengths, weaknesses, analysis, improvements, descriptions) in the following language: ${interview.language}.

TRANSCRIPT:
${conversationHistory}

${codeContext}

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly this schema:
{
  "score": number, // 0-10 (Float is okay, e.g. 7.5)
  "summary": "String. A professional executive summary of the performance (3-4 sentences).",
  "strengths": ["String", "String", "String"], // Top 3-5 strengths
  "weaknesses": ["String", "String", "String"], // Top 3-5 areas for improvement
  "keyQuestionAnalysis": [
    {
      "question": "The specific question asked by interviewer",
      "analysis": "Critique of the candidate's answer. Did they miss edge cases? Was it unstructured?",
      "improvement": "A better way to answer (STAR method, or technical optimization)."
    }
  ],
  "mermaidGraphCurrent": "String", // A Mermaid.js 'graph TD' definition visualizing the candidate's CURRENT thinking style/performance.
  "mermaidGraphPotential": "String", // A Mermaid.js 'graph TD' definition visualizing the IMPROVED potential performance if they follow your advice.
  "resilienceScore": number, // 0-10. Rate how well they handled pressure/gaslighting (if applicable).
  "cultureFitScore": number, // 0-10. Rate how well they fit the specific "Company Status" (e.g. Startup vs Big Corp).
  "badges": ["String", "String"], // Awards. E.g. "Survivor" (if Hardcore & finished), "Culture Fit King" (if high fit), "Tech Wizard" (if code is great).
  "recommendedResources": [
    {
      "topic": "Topic Name (e.g. React Concurrency)",
      "description": "Why they need this",
      "searchQuery": "Google search query string"
    }
  ]
}

MERMAID GRAPH GUIDELINES:
- Use 'graph TD'.
- Keep node labels short (3-5 words).
- 'mermaidGraphCurrent': Show the flow of their answers. E.g., Weak Structure -> Confused Reviewer -> Low Score.
- 'mermaidGraphPotential': Show the ideal flow. E.g., STAR Method -> Clear Impact -> High Score.
- Do not use special characters that break JSON.
`;
