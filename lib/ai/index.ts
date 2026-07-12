import { generateContentGemini } from './gemini';
import { generateContentGroq } from './groq';

export async function generateAIContent(prompt: string): Promise<string> {
  try {
    return await generateContentGemini(prompt);
  } catch (geminiError: any) {
    console.warn('Gemini API call failed, trying Groq fallback...', geminiError.message || geminiError);
    try {
      return await generateContentGroq(prompt);
    } catch (groqError: any) {
      console.error('Groq fallback also failed:', groqError.message || groqError);
      return 'AI service temporarily unavailable. Please try again later.';
    }
  }
}
