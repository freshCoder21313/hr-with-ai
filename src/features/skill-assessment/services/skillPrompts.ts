export const SKILL_EXTRACTOR_PROMPT = `Extract the most important technical and professional skills from the following resume text. 
Rules:
1. Normalize the skill names (e.g., use "React" instead of "ReactJS" or "React.js").
2. Limit the list to the top 15-30 most relevant skills.
3. Exclude generic words like "Communication", "Teamwork" unless heavily emphasized.
4. Return ONLY a valid JSON array of strings. No markdown, no explanations.`;
export const SUB_SKILL_GENERATOR_PROMPT = `Given the skill "{skill}", generate 3-5 key sub-skills. Return ONLY a valid JSON array of strings.`;
export const QUIZ_GENERATOR_PROMPT = `Given the skill "{skill}" and sub-skills {subSkills}, {countInstruction} Return ONLY valid JSON array of objects with keys: id (uuid), question, options (array of 4 strings), correct_answer, explanation, sub_skill, hint (a short helpful tip without giving away the answer directly).`;
