/**
 * Cleans a JSON string by removing markdown code blocks.
 * @param jsonText The raw JSON string from the AI response.
 * @returns A clean JSON string.
 */
export const cleanJsonString = (jsonText: string): string => {
  if (!jsonText) return '';
  return jsonText.replace(/```json\n?|\n?```/g, '').trim();
};
