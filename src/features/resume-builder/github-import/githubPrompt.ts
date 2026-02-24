import { GitHubRepo } from '@/lib/github';

export const getRepoToProjectPrompt = (
  repo: GitHubRepo,
  readme: string,
  fileTree: string
): string => {
  // Truncate README if it's too long to avoid token limits (conservatively 20k chars)
  const truncatedReadme = readme.slice(0, 15000);
  const truncatedTree = fileTree.slice(0, 5000);

  return `
You are an expert technical writer specializing in developer resumes.
Your task is to analyze a GitHub repository and transform it into a "Project" entry for a professional CV/Resume.

**Input Repository Metadata:**
- Name: ${repo.name}
- URL: ${repo.html_url}
- Description: ${repo.description || 'No description provided'}
- Primary Language: ${repo.language || 'N/A'}
- Topics/Tags: ${repo.topics?.join(', ') || 'None'}
- Stars: ${repo.stargazers_count}

**Input README Content (Truncated):**
"""
${truncatedReadme}
"""

**Input File Structure (Truncated):**
"""
${truncatedTree}
"""

**Instructions:**
1. **Analyze** the README, file structure, and metadata to understand the project's purpose, technologies used, and key features.
2. **Transform** this into a structured JSON object matching the schema below.
3. **Description:** Write a concise, punchy description (1-2 sentences) focusing on *what* it solves and *how*. Use action verbs.
4. **Highlights:** Extract 3-5 key features, technical challenges overcome, or impressive stats (e.g., "500+ stars"). Format these as bullet points.
5. **Keywords:** List the tech stack (languages, frameworks, tools) used.
6. **Date:** Use the \`updated_at\` from metadata for the \`endDate\`. Leave \`startDate\` empty if unknown, or infer from context if clearly stated (rare).
7. **Role:** If it's a personal project, use "Creator" or "Maintainer".

**Output Schema (JSON Only):**
\`\`\`json
{
  "name": "Project Name",
  "description": "Concise description...",
  "highlights": ["Feature 1", "Technical achievement", "Impact"],
  "keywords": ["React", "TypeScript", "etc"],
  "url": "https://github.com/...",
  "roles": ["Creator"],
  "endDate": "YYYY-MM-DD"
}
\`\`\`

**Constraint:**
- Return ONLY the valid JSON block.
- If the README is empty or uninformative, do your best with the Description and Metadata.
`;
};

export const getGitHubInterviewPrompt = (
  repo: GitHubRepo,
  readme: string,
  fileTree: string
): string => `
You are an expert Technical Interviewer.
The candidate has imported a GitHub repository: ${repo.name} (${repo.html_url}).

YOUR GOAL:
Analyze the project and generate 3 "Tough Technical Questions" that a Senior Engineer would ask about this specific project.
Focus on:
1. Architectural decisions (Why this framework/structure?).
2. Edge cases or performance bottlenecks in this specific tech stack.
3. How they would scale or refactor a specific part of the code they wrote.

INPUT DATA:
- Description: ${repo.description}
- README: ${readme.slice(0, 5000)}
- File Structure: ${fileTree.slice(0, 3000)}

OUTPUT FORMAT:
Return a valid JSON array of objects:
[
  {
    "question": "The question...",
    "topics": ["React", "Performance"],
    "suggestedAnswer": "Brief summary of what a good answer looks like."
  }
]
`;
