import { Interview } from '@/types';
import { EVALUATION_ROOT_PROMPT } from '@/services/ai/rootPrompt';

export const getFeedbackPrompt = (
  interview: Interview,
  conversationHistory: string,
  codeContext: string
) => `
${EVALUATION_ROOT_PROMPT}

Analyze this interview transcript and candidate work to provide comprehensive, actionable feedback.

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
  "score": number, // Overall rating from 0.0 to 10.0 (Float is okay, e.g. 7.5 or 8.0)
  "technicalScore": number, // 0.0 to 10.0. Rate technical problem-solving, architectural depth, code quality, and edge-case handling.
  "communicationScore": number, // 0.0 to 10.0. Rate structured articulation, conciseness, and clarity of explanations.
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
  "mermaidGraphCurrent": "String", // A Mermaid.js 'graph TD' definition visualizing the candidate's actual progression of thinking and responses in this interview.
  "mermaidGraphPotential": "String", // A Mermaid.js 'graph TD' definition visualizing the recommended structured thinking flow if they apply your feedback.
  "resilienceScore": number, // 0-10. Rate how well they handled pressure, trade-offs, or unexpected scenario challenges.
  "cultureFitScore": number, // 0-10. Rate how well they fit the target Company Status and environment.
  "badges": ["String", "String"], // Specific achievement titles reflecting their standout abilities in this session.
  "recommendedResources": [
    {
      "topic": "Topic Name",
      "description": "Why they need this",
      "searchQuery": "Google search query string"
    }
  ]
}

MERMAID GRAPH GUIDELINES:
- Use 'graph TD'.
- Keep node labels concise (3-6 words).
- ALWAYS enclose node labels in double quotes (e.g. A["Problem Statement"] --> B["Design Bottleneck"]) to prevent parsing errors with special characters.
- Do not repeat a fixed generic template. Illustrate the actual logic flow demonstrated during this specific interview.
- 'mermaidGraphCurrent': Reflect how they structured their responses during this interview.
- 'mermaidGraphPotential': Illustrate the recommended optimal flow (e.g., clarify requirements -> articulate trade-offs -> propose scalable architecture).
- Do not use raw unquoted parentheses or colons inside node IDs or labels.
`;
