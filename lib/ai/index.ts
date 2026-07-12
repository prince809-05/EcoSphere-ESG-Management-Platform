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

  // Handle dashboard insights prompt
  if (prompt.includes('Provide exactly 3 concise')) {
    const envM = prompt.match(/Environmental Score:\s*([0-9.]+)/i);
    const socM = prompt.match(/Social Score:\s*([0-9.]+)/i);
    const govM = prompt.match(/Governance Score:\s*([0-9.]+)/i);
    const env = envM ? parseFloat(envM[1]).toFixed(1) : '75.0';
    const soc = socM ? parseFloat(socM[1]).toFixed(1) : '80.0';
    const gov = govM ? parseFloat(govM[1]).toFixed(1) : '82.0';
    return `- Environmental score is ${env}/100 — focus on reducing Scope 2 electricity emissions and transitioning fleet vehicles to EV alternatives.
- Social score is ${soc}/100 — increase employee participation in active CSR activities and encourage challenge completions to unlock badges.
- Governance score is ${gov}/100 — review unresolved compliance issues and ensure all active policies are acknowledged by department employees.`;
  }

  // Extract scores injected from the system prompt context
  const envMatch = prompt.match(/- Environmental:\s*([0-9.]+)/i);
  const socialMatch = prompt.match(/- Social:\s*([0-9.]+)/i);
  const govMatch = prompt.match(/- Governance:\s*([0-9.]+)/i);
  const overallMatch = prompt.match(/- Overall:\s*([0-9.]+)/i);
  const deptMatch = prompt.match(/Current Department:\s*([^\n(]+)/i);

  const envScore = envMatch ? parseFloat(envMatch[1]).toFixed(1) : null;
  const socialScore = socialMatch ? parseFloat(socialMatch[1]).toFixed(1) : null;
  const govScore = govMatch ? parseFloat(govMatch[1]).toFixed(1) : null;
  const overallScore = overallMatch ? parseFloat(overallMatch[1]).toFixed(1) : null;
  const deptName = deptMatch ? deptMatch[1].trim() : 'your department';

  if (lowercase.includes('hello') || lowercase.startsWith('hi') || lowercase.includes('hey')) {
    return `Hello! I'm EcoSphere AI — your ESG copilot. I can see live data for **${deptName}**${overallScore ? ` (Overall Score: ${overallScore}/100)` : ''}. Ask me about carbon emissions, ESG scores, policy compliance, or sustainability strategies!`;
  }

  if (lowercase.includes('environmental score') || (lowercase.includes('environmental') && lowercase.includes('score'))) {
    return envScore
      ? `📊 **Environmental Score — ${deptName}: ${envScore} / 100**\n\nTo improve:\n- Audit Scope 2 electricity consumption and transition to renewable energy sources.\n- Optimize fleet routing to cut diesel usage.\n- Ensure all carbon transactions are logged using verified emission factors.`
      : `I don't have live environmental score data at the moment. Please check the Environmental dashboard tab.`;
  }

  if (lowercase.includes('social score') || (lowercase.includes('social') && lowercase.includes('score'))) {
    return socialScore
      ? `📊 **Social Score — ${deptName}: ${socialScore} / 100**\n\nTo improve:\n- Participate in open CSR activities (Forestation Drive, E-Waste Collection).\n- Encourage team members to join Gamification challenges.\n- Track volunteering hours in the Social tab.`
      : `I don't have live social score data right now. Please check the Social dashboard tab.`;
  }

  if (lowercase.includes('governance score') || lowercase.includes('g score') || (lowercase.includes('governance') && lowercase.includes('score'))) {
    return govScore
      ? `📊 **Governance Score — ${deptName}: ${govScore} / 100**\n\nTo improve:\n- Resolve all open compliance issues before their due dates.\n- Ensure employees acknowledge active policies.\n- Complete pending audit action items.`
      : `I don't have live governance score data right now. Please check the Governance dashboard tab.`;
  }

  if (lowercase.includes('overall') || lowercase.includes('momentum') || lowercase.includes('total score') || lowercase.includes('esg score')) {
    return overallScore
      ? `📊 **Overall ESG Score / Momentum — ${deptName}: ${overallScore} / 100**\n\nBreakdown:\n- Environmental: ${envScore ?? 'N/A'}/100\n- Social: ${socialScore ?? 'N/A'}/100\n- Governance: ${govScore ?? 'N/A'}/100\n\nFastest boost: clear open compliance issues and increase CSR activity participation!`
      : `I don't have live score data right now. Please check the main dashboard for your current momentum scores.`;
  }

  if (lowercase.includes('carbon') || lowercase.includes('emission') || lowercase.includes('co2') || lowercase.includes('reduce')) {
    return `Data-driven carbon reduction steps:\n- **Scope 1**: Transition ageing diesel fleet vehicles to hybrid or EV alternatives.\n- **Scope 2**: Audit electricity usage and target LED replacements in all work areas.\n- **Scope 3**: Review procurement suppliers for their carbon reduction commitments.`;
  }

  if (lowercase.includes('policy') || lowercase.includes('compliance') || lowercase.includes('audit')) {
    return `Governance tips for ${deptName}:\n- Ensure all employees acknowledge the active ESG policies in the Governance tab.\n- Review overdue compliance issues and resolve them before due dates.\n- Ensure audit findings are documented and action items are assigned.`;
  }

  if (lowercase.includes('challenge') || lowercase.includes('badge') || lowercase.includes('reward') || lowercase.includes('xp') || lowercase.includes('leaderboard')) {
    return `Gamification tips:\n- Join active sustainability challenges in the Gamification tab to earn XP and badges.\n- EASY challenges like "Monitor & Unplug" can be completed quickly.\n- Approve challenge submissions promptly so employees receive their XP rewards.`;
  }

  if (lowercase.includes('summary') || lowercase.includes('all score') || lowercase.includes('report')) {
    return `📋 **${deptName} ESG Summary:**\n- 🌿 Environmental: **${envScore ?? 'N/A'}** / 100\n- 🤝 Social: **${socialScore ?? 'N/A'}** / 100\n- ⚖️ Governance: **${govScore ?? 'N/A'}** / 100\n- 🏆 Overall: **${overallScore ?? 'N/A'}** / 100`;
  }

  return `Here's a quick snapshot of **${deptName}**:\n- Environmental: **${envScore ?? 'N/A'}**/100\n- Social: **${socialScore ?? 'N/A'}**/100\n- Governance: **${govScore ?? 'N/A'}**/100\n- Overall: **${overallScore ?? 'N/A'}**/100\n\nTry asking: *"What is my environmental score?"*, *"What is my momentum score?"*, or *"How do I improve governance?"*`;
}
