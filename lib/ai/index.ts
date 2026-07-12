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
  
  if (prompt.includes('Provide exactly 3 concise')) {
    return `- Optimize carbon emissions in Manufacturing to raise the current Environmental Score.
- Increase employee participation in CSR activities to boost the Social Score.
- Review compliance issues and close open audits to improve the Governance Score.`;
  }
  
  // Extract scores from the injected context prompt using regex
  const envMatch = prompt.match(/- Environmental:\s*([0-9.]+)/i);
  const socialMatch = prompt.match(/- Social:\s*([0-9.]+)/i);
  const govMatch = prompt.match(/- Governance:\s*([0-9.]+)/i);
  const overallMatch = prompt.match(/- Overall:\s*([0-9.]+)/i);
  
  const envScore = envMatch ? envMatch[1] : 'N/A';
  const socialScore = socialMatch ? socialMatch[1] : 'N/A';
  const govScore = govMatch ? govMatch[1] : 'N/A';
  const overallScore = overallMatch ? overallMatch[1] : 'N/A';

  if (lowercase.includes('hello') || lowercase.includes('hi ') || lowercase.includes('hey')) {
    return `Hello! I am EcoSphere AI, your ESG assistant. I am currently running in offline mock demonstration mode. How can I help you today with your department's ESG scores, carbon logs, or compliance policies?`;
  }
  
  if (lowercase.includes('environmental score') || lowercase.includes('e score') || lowercase.includes('carbon footprint')) {
    return `Based on your current department's data, your **Environmental Score** is **${envScore} / 100**. 
To improve this score:
- **Optimize Fleet Routes (Scope 1)**: Consolidate delivery schedules.
- **Facility Energy Audits (Scope 2)**: Transition to smart LED lighting yielding up to 12% electricity savings.`;
  }

  if (lowercase.includes('social score') || lowercase.includes('s score') || lowercase.includes('community')) {
    return `Based on your current department's data, your **Social Score** is **${socialScore} / 100**.
To improve this score:
- Ensure active participation in local CSR initiatives (like the Annual Forestation Drive).
- Encourage employees to join Gamification challenges.
- Log your volunteering hours in the Social tab.`;
  }

  if (lowercase.includes('governance score') || lowercase.includes('g score') || lowercase.includes('policy') || lowercase.includes('audit')) {
    return `Based on your current department's data, your **Governance Score** is **${govScore} / 100**.
To improve governance compliance:
- Ensure all department employees read and acknowledge the active compliance policies.
- Resolve any outstanding audit findings before their deadline.`;
  }

  if (lowercase.includes('overall') || lowercase.includes('momentum') || lowercase.includes('total')) {
    return `Your department's **Overall Momentum / Total ESG Score** is currently at **${overallScore} / 100**.
Keep up the great work! To increase your momentum:
- Keep emissions below target limits.
- Clear out any pending compliance issues.
- Participate in green commuting challenges!`;
  }

  if (lowercase.includes('challenge') || lowercase.includes('point') || lowercase.includes('reward') || lowercase.includes('badge')) {
    return `To boost gamification and team engagement:
- Encourage employees to join active sustainability challenges.
- Approve completed challenges and CSR participations promptly to distribute XP and points.
- Refresh the rewards catalog periodically to maintain active employee participation.`;
  }
  
  return `Thank you for asking. Under offline demonstration parameters, here is a summary of your scores:
- Environmental: ${envScore}
- Social: ${socialScore}
- Governance: ${govScore}
- Overall: ${overallScore}

I recommend focusing on acknowledging compliance policies and logging carbon transactions to boost your scores further!`;
}
