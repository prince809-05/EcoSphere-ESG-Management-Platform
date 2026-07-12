import { generateContentGemini } from './gemini';
import { generateContentGroq } from './groq';

export async function generateAIContent(prompt: string): Promise<string> {
  try {
    return await generateContentGemini(prompt);
  } catch (geminiError: unknown) {
    const geminiMessage = geminiError instanceof Error ? geminiError.message : geminiError;
    console.warn('Gemini API call failed, trying Groq fallback...', geminiMessage);
    try {
      return await generateContentGroq(prompt);
    } catch (groqError: unknown) {
      const groqMessage = groqError instanceof Error ? groqError.message : groqError;
      console.warn('Groq fallback also failed, using offline ESG simulation engine...', groqMessage);
      return generateMockESGResponse(prompt);
    }
  }
}

function generateMockESGResponse(prompt: string): string {
  const questionMatch = prompt.match(/User Question:\s*([\s\S]*?)\n\nAssistant Response:/i);
  const question = questionMatch ? questionMatch[1].trim() : prompt;
  const lowercase = question.toLowerCase();

  if (prompt.includes('Provide exactly 3 concise')) {
    const envM = prompt.match(/Environmental Score:\s*([0-9.]+)/i);
    const socM = prompt.match(/Social Score:\s*([0-9.]+)/i);
    const govM = prompt.match(/Governance Score:\s*([0-9.]+)/i);
    const env = envM ? parseFloat(envM[1]).toFixed(1) : '75.0';
    const soc = socM ? parseFloat(socM[1]).toFixed(1) : '80.0';
    const gov = govM ? parseFloat(govM[1]).toFixed(1) : '82.0';
    return `- Environmental score is ${env}/100 - focus on reducing Scope 2 electricity emissions and transitioning fleet vehicles to EV alternatives.
- Social score is ${soc}/100 - increase employee participation in active CSR activities and encourage challenge completions to unlock badges.
- Governance score is ${gov}/100 - review unresolved compliance issues and ensure all active policies are acknowledged by department employees.`;
  }

  const envScore = getDecimal(prompt, /- Environmental:\s*([0-9.]+)/i);
  const socialScore = getDecimal(prompt, /- Social:\s*([0-9.]+)/i);
  const govScore = getDecimal(prompt, /- Governance:\s*([0-9.]+)/i);
  const overallScore = getDecimal(prompt, /- Overall:\s*([0-9.]+)/i);
  const deptName = getText(prompt, /Current Department:\s*([^\n(]+)/i, 'your department');
  const focus = getText(prompt, /Question Focus:\s*([^\n]+)/i, 'General ESG');
  const activeCSR = getText(prompt, /Active CSR activities available:\s*([0-9]+)/i, '0');
  const pendingCSR = getText(prompt, /Pending CSR reviews for my role:\s*([0-9]+)/i, '0');
  const activeChallenges = getText(prompt, /Active challenges available:\s*([0-9]+)/i, '0');
  const activePolicies = getText(prompt, /Active policies:\s*([0-9]+)/i, '0');
  const unackPolicies = getText(prompt, /Policies I have not acknowledged:\s*([0-9]+)/i, '0');
  const myIssues = getText(prompt, /Compliance issues owned by me:\s*([0-9]+)/i, '0');
  const complianceCounts = getText(prompt, /Compliance issue status counts:\s*(\{[^\n]*\})/i, '{}');
  const auditCounts = getText(prompt, /Audit status counts:\s*(\{[^\n]*\})/i, '{}');

  if (lowercase.includes('hello') || lowercase.startsWith('hi') || lowercase.includes('hey')) {
    return `Hello! I'm EcoSphere AI, your ESG copilot. I can see live data for **${deptName}**${overallScore ? ` (Overall Score: ${overallScore}/100)` : ''}. Ask me about carbon emissions, CSR participation, governance compliance, policies, audits, or ESG scores.`;
  }

  if (isSocialQuestion(lowercase)) {
    return socialScore
      ? `**Social Score - ${deptName}: ${socialScore} / 100**

Live social context:
- Active CSR activities: **${activeCSR}**
- Active challenges: **${activeChallenges}**
- Pending CSR reviews for your role: **${pendingCSR}**

Best next actions:
- Join or promote the nearest-deadline CSR activities from the Social tab.
- Encourage employees to complete active challenges for XP and engagement.
- If you are a reviewer, clear pending CSR submissions so approved work counts toward social performance.`
      : `I don't have live social score data right now. Please check the Social dashboard tab.`;
  }

  if (isGovernanceQuestion(lowercase)) {
    return govScore
      ? `**Governance Score - ${deptName}: ${govScore} / 100**

Live governance context:
- Active policies: **${activePolicies}**
- Policies you have not acknowledged: **${unackPolicies}**
- Compliance issues owned by you: **${myIssues}**
- Compliance issue counts: \`${complianceCounts}\`
- Audit status counts: \`${auditCounts}\`

Best next actions:
- Acknowledge any pending policies first.
- Resolve open or overdue compliance issues before their due dates, starting with high-severity items.
- Review recent audit findings and assign clear owners for every action item.`
      : `I don't have live governance score data right now. Please check the Governance dashboard tab.`;
  }

  if (isEnvironmentalQuestion(lowercase)) {
    return envScore
      ? `**Environmental Score - ${deptName}: ${envScore} / 100**

To improve:
- Audit Scope 2 electricity consumption and transition high-use areas to renewable energy.
- Review the latest carbon transactions and target the largest emission factors first.
- Keep environmental goals updated so progress is visible on the dashboard.`
      : `I don't have live environmental score data at the moment. Please check the Environmental dashboard tab.`;
  }

  if (lowercase.includes('overall') || lowercase.includes('momentum') || lowercase.includes('total score') || lowercase.includes('esg score')) {
    return overallScore
      ? `**Overall ESG Score / Momentum - ${deptName}: ${overallScore} / 100**

Breakdown:
- Environmental: ${envScore ?? 'N/A'}/100
- Social: ${socialScore ?? 'N/A'}/100
- Governance: ${govScore ?? 'N/A'}/100

Fastest balanced boost: reduce high-emission transaction categories, increase CSR participation, and clear open compliance issues.`
      : `I don't have live score data right now. Please check the main dashboard for your current momentum scores.`;
  }

  if (lowercase.includes('carbon') || lowercase.includes('emission') || lowercase.includes('co2') || lowercase.includes('reduce')) {
    return `Data-driven carbon reduction steps:
- **Scope 1**: Transition ageing diesel fleet vehicles to hybrid or EV alternatives.
- **Scope 2**: Audit electricity usage and target LED replacements in all work areas.
- **Scope 3**: Review procurement suppliers for their carbon reduction commitments.`;
  }

  if (lowercase.includes('challenge') || lowercase.includes('badge') || lowercase.includes('reward') || lowercase.includes('xp') || lowercase.includes('leaderboard')) {
    return `Gamification tips:
- Join active sustainability challenges in the Gamification tab to earn XP and badges.
- Easy challenges like "Monitor & Unplug" can be completed quickly.
- Approve challenge submissions promptly so employees receive their XP rewards.`;
  }

  if (lowercase.includes('summary') || lowercase.includes('all score') || lowercase.includes('report')) {
    return `**${deptName} ESG Summary**
- Environmental: **${envScore ?? 'N/A'}** / 100
- Social: **${socialScore ?? 'N/A'}** / 100
- Governance: **${govScore ?? 'N/A'}** / 100
- Overall: **${overallScore ?? 'N/A'}** / 100
- Current focus detected: **${focus}**`;
  }

  return `Here's a quick snapshot of **${deptName}**:
- Environmental: **${envScore ?? 'N/A'}**/100
- Social: **${socialScore ?? 'N/A'}**/100
- Governance: **${govScore ?? 'N/A'}**/100
- Overall: **${overallScore ?? 'N/A'}**/100

Try asking: *"How do I improve social participation?"*, *"What governance issues need attention?"*, or *"What is my environmental score?"*`;
}

function getDecimal(prompt: string, pattern: RegExp) {
  const match = prompt.match(pattern);
  return match ? parseFloat(match[1]).toFixed(1) : null;
}

function getText(prompt: string, pattern: RegExp, fallback: string) {
  const match = prompt.match(pattern);
  return match ? match[1].trim() : fallback;
}

function isSocialQuestion(lowercase: string) {
  return ['social', 'csr', 'volunteer', 'participation', 'employee engagement'].some((term) =>
    lowercase.includes(term)
  );
}

function isGovernanceQuestion(lowercase: string) {
  return ['governance', 'policy', 'compliance', 'audit', 'g score'].some((term) =>
    lowercase.includes(term)
  );
}

function isEnvironmentalQuestion(lowercase: string) {
  return ['environmental', 'carbon', 'emission', 'co2', 'scope 1', 'scope 2', 'scope 3'].some((term) =>
    lowercase.includes(term)
  );
}
