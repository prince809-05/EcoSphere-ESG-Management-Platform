'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { generateReportSummary } from '@/lib/ai/summary';
import { ApiResponse } from '@/types/api';

const reportFiltersSchema = z.object({
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  moduleId: z.enum(['ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE', 'ALL']).optional().default('ALL'),
  employeeId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

type ReportFilters = z.infer<typeof reportFiltersSchema>;

// --- DEDICATED REPORT ACTIONS ---

export async function generateEnvironmentalReport(filtersInput: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
      return { success: false, error: 'Forbidden: Report viewing permissions required', code: 'AUTH_002' };
    }

    const filters = reportFiltersSchema.parse(filtersInput);
    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const queryWhere: any = {};
    if (filters.departmentId) queryWhere.departmentId = filters.departmentId;
    if (hasDateFilter) queryWhere.createdAt = dateFilter;

    const txs = await prisma.carbonTransaction.findMany({
      where: queryWhere,
      include: { department: true, emissionFactor: true },
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by scope types and monthly groupings
    let totalCO2 = 0;
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;

    const monthlyAggregate: Record<string, number> = {};

    txs.forEach((t) => {
      const co2 = Number(t.calculatedCO2);
      totalCO2 += co2;
      if (t.type === 'MANUFACTURING' || t.type === 'FLEET') {
        scope1 += co2;
      } else if (t.type === 'PURCHASE') {
        scope2 += co2;
      } else if (t.type === 'EXPENSE') {
        scope3 += co2;
      }

      const monthKey = t.createdAt.toISOString().slice(0, 7); // YYYY-MM
      monthlyAggregate[monthKey] = (monthlyAggregate[monthKey] || 0) + co2;
    });

    const chartData = Object.keys(monthlyAggregate).map((month) => ({
      month,
      emissions: monthlyAggregate[month],
    }));

    return {
      success: true,
      data: {
        chartData,
        summary: {
          totalCO2,
          scope1,
          scope2,
          scope3,
        },
        transactions: txs.map(t => ({
          id: t.id,
          date: t.createdAt.toLocaleDateString(),
          department: t.department.name,
          type: t.type,
          quantity: `${t.quantity} ${t.emissionFactor.unit}`,
          calculatedCO2: Number(t.calculatedCO2),
        })),
      },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[generateEnvironmentalReport]', error);
    return { success: false, error: 'Failed to generate environmental report', code: 'SRV_001' };
  }
}

export async function generateSocialReport(filtersInput: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
      return { success: false, error: 'Forbidden: Report viewing permissions required', code: 'AUTH_002' };
    }

    const filters = reportFiltersSchema.parse(filtersInput);
    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const queryWhere: any = {};
    if (filters.departmentId) queryWhere.employee = { departmentId: filters.departmentId };
    if (filters.employeeId) queryWhere.employeeId = filters.employeeId;
    if (hasDateFilter) queryWhere.completedAt = dateFilter;
    if (filters.categoryId) queryWhere.activity = { categoryId: filters.categoryId };

    const participations = await prisma.employeeParticipation.findMany({
      where: queryWhere,
      include: {
        employee: { include: { department: true } },
        activity: { include: { category: true } },
      },
      orderBy: { completedAt: 'desc' },
    });

    let approvedCSR = 0;
    let pendingCSR = 0;
    let totalPointsAwarded = 0;

    const activityStats: Record<string, number> = {};

    participations.forEach((p) => {
      if (p.approvalStatus === 'APPROVED') {
        approvedCSR++;
        totalPointsAwarded += p.pointsEarned;
        const name = p.activity.category.name;
        activityStats[name] = (activityStats[name] || 0) + 1;
      } else if (p.approvalStatus === 'PENDING') {
        pendingCSR++;
      }
    });

    const categorySummary = Object.keys(activityStats).map((cat) => ({
      category: cat,
      count: activityStats[cat],
    }));

    return {
      success: true,
      data: {
        categorySummary,
        summary: {
          totalParticipations: participations.length,
          approvedCSR,
          pendingCSR,
          totalPointsAwarded,
        },
        participations: participations.map(p => ({
          date: p.completedAt ? p.completedAt.toLocaleDateString() : 'Pending',
          employee: p.employee.name,
          department: p.employee.department?.name || 'Corporate',
          activity: p.activity.title,
          points: p.pointsEarned,
          status: p.approvalStatus,
        })),
      },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[generateSocialReport]', error);
    return { success: false, error: 'Failed to generate social report', code: 'SRV_001' };
  }
}

export async function generateGovernanceReport(filtersInput: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
      return { success: false, error: 'Forbidden: Report viewing permissions required', code: 'AUTH_002' };
    }

    const filters = reportFiltersSchema.parse(filtersInput);
    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const queryWhere: any = {};
    if (filters.departmentId) queryWhere.audit = { departmentId: filters.departmentId };
    if (filters.employeeId) queryWhere.ownerId = filters.employeeId;
    if (hasDateFilter) queryWhere.createdAt = dateFilter;

    const issues = await prisma.complianceIssue.findMany({
      where: queryWhere,
      include: {
        audit: { include: { department: true } },
        owner: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    let unresolvedGov = 0;
    let resolvedGov = 0;
    let criticalCount = 0;
    let highCount = 0;

    issues.forEach((i) => {
      if (i.status === 'RESOLVED') {
        resolvedGov++;
      } else {
        unresolvedGov++;
      }

      if (i.severity === 'CRITICAL') criticalCount++;
      if (i.severity === 'HIGH') highCount++;
    });

    return {
      success: true,
      data: {
        summary: {
          totalIssues: issues.length,
          unresolvedGov,
          resolvedGov,
          criticalCount,
          highCount,
        },
        issues: issues.map(i => ({
          date: i.createdAt.toLocaleDateString(),
          audit: i.audit.title,
          department: i.audit.department.name,
          description: i.description,
          severity: i.severity,
          owner: i.owner.name,
          status: i.status,
        })),
      },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[generateGovernanceReport]', error);
    return { success: false, error: 'Failed to generate governance report', code: 'SRV_001' };
  }
}

export async function generateESGSummaryReport(): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
      return { success: false, error: 'Forbidden', code: 'AUTH_002' };
    }

    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { totalScore: 'desc' },
    });

    const serializedDepts = departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      envScore: Number(d.envScore),
      socialScore: Number(d.socialScore),
      govScore: Number(d.govScore),
      totalScore: Number(d.totalScore),
    }));

    const count = serializedDepts.length;
    const averageTotal = count > 0 
      ? serializedDepts.reduce((acc, curr) => acc + curr.totalScore, 0) / count 
      : 0;

    return {
      success: true,
      data: {
        departments: serializedDepts,
        averageScore: averageTotal,
      },
    };
  } catch (error: any) {
    console.error('[generateESGSummaryReport]', error);
    return { success: false, error: 'Failed to generate ESG summary report', code: 'SRV_001' };
  }
}

// --- DYNAMIC CUSTOM REPORT BUILDER ---

export async function generateCustomReport(filtersInput: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER')) {
      return { success: false, error: 'Forbidden: Report viewing permissions required', code: 'AUTH_002' };
    }

    const filters = reportFiltersSchema.parse(filtersInput);

    const dateFilter: any = {};
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.lte = new Date(filters.endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    let environmentalData: any[] = [];
    let socialData: any[] = [];
    let governanceData: any[] = [];

    // Query scopes
    if (filters.moduleId === 'ALL' || filters.moduleId === 'ENVIRONMENTAL') {
      const txWhere: any = {};
      if (filters.departmentId) txWhere.departmentId = filters.departmentId;
      if (hasDateFilter) txWhere.createdAt = dateFilter;

      const txs = await prisma.carbonTransaction.findMany({
        where: txWhere,
        include: { department: true, emissionFactor: true },
        orderBy: { createdAt: 'desc' },
      });

      environmentalData = txs.map(t => ({
        date: t.createdAt.toLocaleDateString(),
        department: t.department.name,
        type: t.type,
        quantity: `${t.quantity} ${t.emissionFactor.unit}`,
        co2: Number(t.calculatedCO2),
      }));
    }

    if (filters.moduleId === 'ALL' || filters.moduleId === 'SOCIAL') {
      const partWhere: any = {};
      if (filters.departmentId) partWhere.employee = { departmentId: filters.departmentId };
      if (filters.employeeId) partWhere.employeeId = filters.employeeId;
      if (hasDateFilter) partWhere.completedAt = dateFilter;
      if (filters.categoryId) partWhere.activity = { categoryId: filters.categoryId };

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

    if (filters.moduleId === 'ALL' || filters.moduleId === 'GOVERNANCE') {
      const issueWhere: any = {};
      if (filters.departmentId) issueWhere.audit = { departmentId: filters.departmentId };
      if (filters.employeeId) issueWhere.ownerId = filters.employeeId;
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

    const totalCO2 = environmentalData.reduce((acc, curr) => acc + curr.co2, 0);
    const approvedCSR = socialData.filter(s => s.status === 'APPROVED').length;
    const pendingCSR = socialData.filter(s => s.status === 'PENDING').length;
    const unresolvedGov = governanceData.filter(g => g.status !== 'RESOLVED').length;

    // Call dynamic AI summary generator helper
    const aiSummary = await generateReportSummary({
      environmentalCount: environmentalData.length,
      socialCount: socialData.length,
      governanceCount: governanceData.length,
      metrics: {
        totalCO2,
        approvedCSR,
        pendingCSR,
        unresolvedGov,
      },
    });

    return {
      success: true,
      data: {
        environmental: environmentalData,
        social: socialData,
        governance: governanceData,
        aiSummary,
        metrics: {
          totalCO2,
          approvedCSR,
          pendingCSR,
          unresolvedGov,
        },
      },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[generateCustomReport]', error);
    return { success: false, error: 'Failed to generate custom report', code: 'SRV_001' };
  }
}

// --- BACKWARD COMPATIBILITY COMPAT ROUTE ---

export async function runReportAction(filters: ReportFilters) {
  const res = await generateCustomReport(filters);
  if (!res.success) {
    return { error: res.error };
  }
  return {
    success: true,
    environmental: res.data.environmental,
    social: res.data.social,
    governance: res.data.governance,
    aiSummary: res.data.aiSummary,
    metrics: res.data.metrics,
  };
}
