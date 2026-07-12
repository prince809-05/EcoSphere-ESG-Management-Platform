import { generateAIContent } from './index';

interface ESGProps {
  env: number;
  social: number;
  gov: number;
  overall: number;
}

let cachedInsights: string[] | null = null;
let cacheExpiry: number = 0;

export async function getDashboardInsights(scores: ESGProps): Promise<string[]> {
  const now = Date.now();
  
  if (cachedInsights && now < cacheExpiry) {
    return cachedInsights;
  }

  const prompt = `You are EcoSphere AI, an ESG auditing system. Analyze the following company-wide average ESG scores:
- Environmental Score: ${scores.env.toFixed(2)} / 100
- Social Score: ${scores.social.toFixed(2)} / 100
- Governance Score: ${scores.gov.toFixed(2)} / 100
- Overall ESG Score: ${scores.overall.toFixed(2)} / 100

Provide exactly 3 concise, high-impact bullet-point recommendations for the company dashboard. 
Format each recommendation on a new line starting with a dash ("-"). 
Do not include any introductory or concluding text. Focus purely on actionable operational changes.`;

  try {
    const rawResult = await generateAIContent(prompt);
    
    // Parse into bullet points
    const bullets = rawResult
      .split('\n')
      .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 3);

    // Fallback if formatting was ignored
    const finalBullets = bullets.length >= 2 ? bullets.slice(0, 3) : [
      `Environmental score is ${scores.env.toFixed(1)}/100 — focus on reducing Scope 2 electricity emissions and auditing fleet fuel consumption across departments.`,
      `Social score is ${scores.social.toFixed(1)}/100 — increase employee participation in the 6 active CSR activities and gamification challenges to earn XP rewards.`,
      `Governance score is ${scores.gov.toFixed(1)}/100 — review all open compliance issues and ensure employees have acknowledged active ESG policies.`
    ];

    cachedInsights = finalBullets;
    cacheExpiry = now + 5 * 60 * 1000; // 5 minutes cache

    return finalBullets;
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    return [
      `Environmental score is ${scores.env.toFixed(1)}/100 — focus on reducing Scope 2 electricity emissions and fleet fuel consumption.`,
      `Social score is ${scores.social.toFixed(1)}/100 — promote active CSR activity participation and gamification challenge completions.`,
      `Governance score is ${scores.gov.toFixed(1)}/100 — resolve open compliance issues and ensure all policies are acknowledged.`
    ];
  }
}
