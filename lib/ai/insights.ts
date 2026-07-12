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
    const finalBullets = bullets.length === 3 ? bullets : [
      `Optimize carbon emissions in Manufacturing to raise the current Environmental Score of ${scores.env.toFixed(1)}.`,
      `Increase employee participation in CSR activities to boost the Social Score of ${scores.social.toFixed(1)}.`,
      `Review compliance issues and close open audits to improve the Governance Score of ${scores.gov.toFixed(1)}.`
    ];

    cachedInsights = finalBullets;
    cacheExpiry = now + 5 * 60 * 1000; // 5 minutes cache

    return finalBullets;
  } catch (error) {
    console.error('Failed to generate AI insights:', error);
    return [
      'Focus on reducing carbon transactions in high-emission departments.',
      'Promote sustainable challenges like Green Commuting to reward employees.',
      'Assign clear compliance ownership to prevent overdue audits.'
    ];
  }
}
