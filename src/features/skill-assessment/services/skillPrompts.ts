export const SKILL_EXTRACTOR_PROMPT = `Extract a list of technical and soft skills from the following text. Return ONLY a valid JSON array of strings.`;
export const SUB_SKILL_GENERATOR_PROMPT = `Given the skill "{skill}", generate 3-5 key sub-skills. Return ONLY a valid JSON array of strings.`;
export const QUIZ_GENERATOR_PROMPT = `Given the skill "{skill}" and sub-skills {subSkills}, generate {count} multiple-choice questions. Return ONLY valid JSON array of objects with keys: id (uuid), question, options (array of 4 strings), correct_answer, explanation, sub_skill.`;
