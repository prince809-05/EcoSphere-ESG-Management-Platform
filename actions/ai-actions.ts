'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateAIContent } from '@/lib/ai';
import { ApiResponse } from '@/types/api';

export async function generateSimulationRoadmapAction(): Promise<ApiResponse<string>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    }

    // Fetch scores
    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
    });

    if (departments.length === 0) {
      return { success: false, error: 'No active departments found to simulate.', code: 'SIM_001' };
    }

    const avgEnv = departments.reduce((acc, curr) => acc + Number(curr.envScore), 0) / departments.length;
    const avgSocial = departments.reduce((acc, curr) => acc + Number(curr.socialScore), 0) / departments.length;
    const avgGov = departments.reduce((acc, curr) => acc + Number(curr.govScore), 0) / departments.length;
    const avgTotal = departments.reduce((acc, curr) => acc + Number(curr.totalScore), 0) / departments.length;

    // Fetch goals and compliance counts
    const activeGoalsCount = await prisma.environmentalGoal.count({
      where: { status: 'ACTIVE' },
    });

    const openIssuesCount = await prisma.complianceIssue.count({
      where: { status: 'OPEN' },
    });

    const contextSummary = `Organization ESG Snapshot:
- Overall Score: ${avgTotal.toFixed(1)}/100
- Environmental Score: ${avgEnv.toFixed(1)}/100 (Active Goals: ${activeGoalsCount})
- Social Score: ${avgSocial.toFixed(1)}/100
- Governance Score: ${avgGov.toFixed(1)}/100 (Open Compliance Issues: ${openIssuesCount})`;

    const prompt = `You are EcoSphere AI, a principal ESG consultant. Review our current scores:
${contextSummary}

We want to raise our Overall ESG Score to 100. Provide exactly 3 high-impact, department-specific steps we should take immediately.
For each step, specify:
1. **Target Area** (E, S, or G)
2. **Action Item** (e.g., complete pending goals, launch zero-waste challenge, resolve compliance issues)
3. **Expected Impact** (e.g., +5.0 Governance Index)

Keep your response extremely concise, structured as markdown bullet points, and do not write any conversational intro or sign-off.`;

    const roadmap = await generateAIContent(prompt);
    return { success: true, data: roadmap };
  } catch (error: any) {
    console.error('[generateSimulationRoadmapAction]', error);
    return { success: false, error: 'Failed to generate simulation roadmap.', code: 'SRV_001' };
  }
}
