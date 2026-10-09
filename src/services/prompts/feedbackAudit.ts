import { Interview, InterviewFeedback, resolveInterviewContentType } from '@/types';
import { EVALUATION_ROOT_PROMPT } from '@/services/ai/rootPrompt';

export const getFeedbackAuditPrompt = (
  interview: Interview,
  conversationHistory: string,
  codeContext: string,
  draftFeedback: InterviewFeedback
) => {
  const interviewType = resolveInterviewContentType(interview);
  return `
${EVALUATION_ROOT_PROMPT}

You are an expert Executive Interview Evaluation Auditor and Quality Reviewer.
Your role is to rigorously inspect, audit, and calibrate a DRAFT evaluation generated for a candidate to guarantee fairness, architectural objectivity, constructive tone, and absolute freedom from hallucinations or unfair penalties.

CONTEXT:
Role: ${interview.jobTitle} at ${interview.company}
Interview Format: ${interviewType}
Language: ${interview.language}

TRANSCRIPT:
${conversationHistory}

${codeContext}

INITIAL DRAFT EVALUATION (TO BE AUDITED):
${JSON.stringify(draftFeedback, null, 2)}

AUDIT & CALIBRATION CRITERIA (MANDATORY):
1. CANDIDATE PROJECT & ARCHITECTURAL AUTHORITY:
   - The candidate is the creator and authoritative source of truth for their own systems, tools, and past projects.
   - If the candidate defended or justified architectural choices (e.g., Offline-first sync, Conflict Resolution, OCC, Queueing, Caching, Event-driven architecture) against an interviewer's challenge or doubt, evaluate their answer on its actual technical soundness and composure.
   - If the initial draft docked points or criticized the candidate merely for not adopting the interviewer's biased premise or preference, REMOVE those unfair critiques and RECALIBRATE the scores upward.

2. MODE & ARTIFACT AWARENESS (ELIMINATE PHANTOM PENALTIES):
   - Interview Format: "${interviewType}".
   - Scrutinize the draft feedback's summary, weaknesses, and key question analysis for any claims such as: "did not write code", "empty code editor", "no code submission", "chưa viết code", "chưa triển khai mã nguồn".
   - UNLESS this interview was a dedicated "coding" session where the interviewer explicitly instructed the candidate to write code in the code editor during the transcript, ANY penalty or criticism regarding missing code is a PHANTOM PENALTY hallucination.
   - You MUST REMOVE all phantom code penalties from summary, weaknesses, and keyQuestionAnalysis, and adjust technicalScore and overall score accordingly.

3. SCORE & CRITIQUE HARMONY:
   - Ensure the numerical scores (score, technicalScore, communicationScore, resilienceScore, cultureFitScore) accurately and harmoniously reflect the written feedback.
   - If the candidate demonstrated solid technical acumen and communication, their scores must not be artificially depressed.
   - Preserve the scale used in the draft evaluation (e.g. 0.0 to 10.0 or 0 to 100).
   - Write ALL audited feedback (summary, strengths, weaknesses, analysis, improvements) strictly in: ${interview.language}.

4. CONSTRUCTIVE & PROFESSIONAL TONE:
   - Transform any condescending or harsh language into objective, actionable coaching.
   - Maintain valid constructive feedback and strengths. Retain or clean up Mermaid graph definitions.

OUTPUT FORMAT:
Return a valid JSON object (NO MARKDOWN, NO \`\`\`json wrappers) matching exactly this schema:
{
  "score": number,
  "technicalScore": number,
  "communicationScore": number,
  "summary": "String",
  "strengths": ["String", "String", "String"],
  "weaknesses": ["String", "String", "String"],
  "keyQuestionAnalysis": [
    {
      "question": "String",
      "analysis": "String",
      "improvement": "String"
    }
  ],
  "mermaidGraphCurrent": "String",
  "mermaidGraphPotential": "String",
  "resilienceScore": number,
  "cultureFitScore": number,
  "badges": ["String", "String"],
  "recommendedResources": [
    {
      "topic": "String",
      "description": "String",
      "searchQuery": "String"
    }
  ]
}
`;
};
