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
      console.warn('Groq fallback also failed, using offline ESG simulation engine...', groqError.message || groqError);
      return generateMockESGResponse(prompt);
    }
  }
}

function generateMockESGResponse(prompt: string): string {
  const lowercase = prompt.toLowerCase();
  
  if (lowercase.includes('hello') || lowercase.includes('hi ') || lowercase.includes('hey')) {
    return `Hello! I am EcoSphere AI, your ESG assistant. I am currently running in offline mock demonstration mode. How can I help you today with your department's ESG scores, carbon logs, or compliance policies?`;
  }
  
  if (lowercase.includes('carbon') || lowercase.includes('emission') || lowercase.includes('co2') || lowercase.includes('suggest') || lowercase.includes('reduc')) {
    return `Here are some actionable recommendations to reduce emissions based on your department's parameters:
- **Optimize Fleet Routes (Scope 1)**: Consolidate delivery schedules to reduce fuel use.
- **Facility Energy Audits (Scope 2)**: Transition to smart LED lighting in production bays, yielding up to 12% electricity savings.
- **Procurement Review (Scope 3)**: Prioritize vendors with public carbon reduction commitments.`;
  }
  
  if (lowercase.includes('policy') || lowercase.includes('governance') || lowercase.includes('compliance') || lowercase.includes('audit')) {
    return `To improve governance compliance:
- Ensure all department employees read and acknowledge the active compliance policies.
- Complete scheduled audit rounds and resolve outstanding compliance issues before their deadline.
- Document resolution steps to provide clear verification evidence.`;
  }

  if (lowercase.includes('challenge') || lowercase.includes('point') || lowercase.includes('reward') || lowercase.includes('badge')) {
    return `To boost gamification and team engagement:
- Encourage employees to join active sustainability challenges.
- Approve completed challenges and CSR participations promptly to distribute XP and points.
- Refresh the rewards catalog periodically to maintain active employee participation.`;
  }
  
  return `Thank you for asking. Under offline demonstration parameters, I recommend:
1. **Acknowledge compliance policies** to improve your Governance score.
2. **Volunteering in CSR initiatives** to raise your Social score.
3. **Log carbon transactions accurately** to track environmental progress.`;
}
