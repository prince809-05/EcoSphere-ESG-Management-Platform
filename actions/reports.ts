'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateAIContent } from '@/lib/ai';

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  moduleId?: 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE' | 'ALL';
  employeeId?: string;
  challengeId?: string;
  categoryId?: string;
}

export async function runReportAction(filters: ReportFilters) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden: Report viewing permissions required' };
  }

  const { startDate, endDate, departmentId, moduleId = 'ALL', employeeId, challengeId, categoryId } = filters;

  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const hasDateFilter = Object.keys(dateFilter).length > 0;

  try {
    let environmentalData: any[] = [];
    let socialData: any[] = [];
    let governanceData: any[] = [];

    // 1. Query ENVIRONMENTAL (Carbon Transactions)
    if (moduleId === 'ALL' || moduleId === 'ENVIRONMENTAL') {
      const txWhere: any = {};
      if (departmentId) txWhere.departmentId = departmentId;
      if (hasDateFilter) txWhere.createdAt = dateFilter;

      const txs = await prisma.carbonTransaction.findMany({
        where: txWhere,
        include: {
          department: true,
          emissionFactor: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      environmentalData = txs.map(t => ({
        date: t.createdAt.toLocaleDateString(),
        department: t.department.name,
        type: t.type,
        quantity: `${t.quantity} ${t.emissionFactor.unit}`,
        factor: t.emissionFactor.name,
        co2: Number(t.calculatedCO2),
      }));
    }

    // 2. Query SOCIAL (CSR Employee Participations)
    if (moduleId === 'ALL' || moduleId === 'SOCIAL') {
      const partWhere: any = {};
      if (departmentId) partWhere.employee = { departmentId };
      if (employeeId) partWhere.employeeId = employeeId;
      if (hasDateFilter) partWhere.completedAt = dateFilter;
      if (categoryId) partWhere.activity = { categoryId };

      const participations = await prisma.employeeParticipation.findMany({
        where: partWhere,
        include: {
          employee: { include: { department: true } },
          activity: { include: { category: true } },
        },
        orderBy: { completedAt: 'desc' },
      });

      socialData = participations.map(p => ({
        date: p.completedAt ? p.completedAt.toLocaleDateString() : 'Pending',
        employee: p.employee.name,
        department: p.employee.department?.name || 'Corporate',
        activity: p.activity.title,
        points: p.pointsEarned,
        status: p.approvalStatus,
      }));
    }

    // 3. Query GOVERNANCE (Audits and Compliance Issues)
    if (moduleId === 'ALL' || moduleId === 'GOVERNANCE') {
      const issueWhere: any = {};
      if (departmentId) issueWhere.audit = { departmentId };
      if (employeeId) issueWhere.ownerId = employeeId;
      if (hasDateFilter) issueWhere.createdAt = dateFilter;

      const issues = await prisma.complianceIssue.findMany({
        where: issueWhere,
        include: {
          audit: { include: { department: true } },
          owner: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      governanceData = issues.map(i => ({
        date: i.createdAt.toLocaleDateString(),
        audit: i.audit.title,
        department: i.audit.department.name,
        description: i.description,
        severity: i.severity,
        owner: i.owner.name,
        status: i.status,
      }));
    }

    // Combine data summaries for AI prompt
    const totalCO2 = environmentalData.reduce((acc, curr) => acc + curr.co2, 0);
    const approvedCSR = socialData.filter(s => s.status === 'APPROVED').length;
    const pendingCSR = socialData.filter(s => s.status === 'PENDING').length;
    const unresolvedGov = governanceData.filter(g => g.status !== 'RESOLVED').length;

    const dataSummary = `Report Summary:
- Environmental: Logged ${environmentalData.length} carbon transactions, totaling ${totalCO2.toFixed(2)} tons of CO2.
- Social: Logged ${socialData.length} CSR activities, with ${approvedCSR} approved and ${pendingCSR} pending review.
- Governance: Tracked ${governanceData.length} compliance issues, with ${unresolvedGov} unresolved.`;

    const aiPrompt = `You are EcoSphere AI, an expert ESG auditor. Review the following aggregated report metrics:

${dataSummary}

Provide a concise, 2-3 sentence executive summary of these findings, highlighting achievements and key areas of concern. 
Keep it extremely professional and actionable. Do not use conversational filler.`;

    const aiSummary = await generateAIContent(aiPrompt);

    return {
      success: true,
      environmental: environmentalData,
      social: socialData,
      governance: governanceData,
      aiSummary,
      metrics: {
        totalCO2,
        approvedCSR,
        pendingCSR,
        unresolvedGov,
      }
    };

  } catch (error: any) {
    console.error('Error generating report:', error);
    return { error: 'Failed to run ESG report query' };
  }
}
