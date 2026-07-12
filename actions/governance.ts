'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { createNotification } from './notifications';
import { ApiResponse } from '@/types/api';
import { 
  policySchema, 
  auditSchema, 
  complianceIssueSchema, 
  updateComplianceIssueSchema, 
  completeAuditSchema, 
  resolveComplianceIssueSchema 
} from '@/lib/validators';
import { PolicyStatus, AuditStatus, ComplianceSeverity, ComplianceStatus } from '@prisma/client';

const uuidSchema = z.string().uuid('Invalid ID format');

// --- ESG POLICIES ---

export async function createPolicy(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = policySchema.parse(input);

    const policy = await prisma.eSGBPolicy.create({
      data: {
        title: data.title,
        content: data.content,
        departmentId: data.departmentId || undefined,
        status: data.status as PolicyStatus,
      },
    });

    // Notify employees
    let employeesToNotify = [];
    if (data.departmentId) {
      employeesToNotify = await prisma.user.findMany({
        where: { departmentId: data.departmentId },
      });
    } else {
      employeesToNotify = await prisma.user.findMany();
    }

    for (const emp of employeesToNotify) {
      await createNotification(
        emp.id,
        'POLICY',
        'New ESG Policy Published',
        `A new ESG policy has been published: "${policy.title}". Please read and acknowledge.`,
        '/governance'
      );
    }

    revalidatePath('/governance');
    return { success: true, data: policy };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createPolicy]', error);
    return { success: false, error: 'Failed to create policy', code: 'SRV_001' };
  }
}

export async function updatePolicy(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = policySchema.parse(input);

    const policy = await prisma.eSGBPolicy.update({
      where: { id: validatedId },
      data: {
        title: data.title,
        content: data.content,
        departmentId: data.departmentId || undefined,
        status: data.status as PolicyStatus,
      },
    });

    revalidatePath('/governance');
    return { success: true, data: policy };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updatePolicy]', error);
    return { success: false, error: 'Failed to update policy', code: 'SRV_001' };
  }
}

export async function archivePolicy(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    await prisma.eSGBPolicy.update({
      where: { id: validatedId },
      data: { status: 'ARCHIVED' },
    });

    revalidatePath('/governance');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[archivePolicy]', error);
    return { success: false, error: 'Failed to archive policy', code: 'SRV_001' };
  }
}

export async function listPolicies(filters?: { status?: PolicyStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const statusFilter = filters?.status || 'ACTIVE';

    const list = await prisma.eSGBPolicy.findMany({
      where: { status: statusFilter },
      include: { department: true, acknowledgements: true },
      orderBy: { effectiveDate: 'desc' },
    });

    const serialized = list.map(p => ({
      ...p,
      department: p.department ? {
        ...p.department,
        envScore: Number(p.department.envScore),
        socialScore: Number(p.department.socialScore),
        govScore: Number(p.department.govScore),
        totalScore: Number(p.department.totalScore),
      } : null,
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listPolicies]', error);
    return { success: false, error: 'Failed to list policies', code: 'SRV_001' };
  }
}

export async function acknowledgePolicy(policyId: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedPolicyId = uuidSchema.parse(policyId);

    const existing = await prisma.policyAcknowledgement.findFirst({
      where: {
        employeeId: session.userId,
        policyId: validatedPolicyId,
      },
    });

    if (existing) {
      return { success: false, error: 'Policy already acknowledged', code: 'GOV_001' };
    }

    const ipAddress = '192.168.1.' + Math.floor(Math.random() * 254 + 1);

    await prisma.policyAcknowledgement.create({
      data: {
        employeeId: session.userId,
        policyId: validatedPolicyId,
        ipAddress,
      },
    });

    // Check if employee belongs to a department to trigger score recalculations
    if (session.departmentId) {
      await recalculateDepartmentScore(session.departmentId);
    }

    revalidatePath('/governance');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[acknowledgePolicy]', error);
    return { success: false, error: 'Failed to acknowledge policy', code: 'SRV_001' };
  }
}

export async function getPolicyAcknowledgementStatus(policyId: string): Promise<ApiResponse<{ acknowledged: number; total: number; rate: number }>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedId = uuidSchema.parse(policyId);

    const policy = await prisma.eSGBPolicy.findUnique({
      where: { id: validatedId },
    });

    if (!policy) {
      return { success: false, error: 'Policy not found', code: 'GOV_002' };
    }

    // Determine target users to count: if department specific, count department staff, else all users
    const totalStaff = await prisma.user.count({
      where: policy.departmentId ? { departmentId: policy.departmentId } : {},
    });

    const acknowledged = await prisma.policyAcknowledgement.count({
      where: {
        policyId: validatedId,
        employee: policy.departmentId ? { departmentId: policy.departmentId } : {},
      },
    });

    const rate = totalStaff > 0 ? (acknowledged / totalStaff) * 100 : 0;

    return {
      success: true,
      data: { acknowledged, total: totalStaff, rate },
    };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[getPolicyAcknowledgementStatus]', error);
    return { success: false, error: 'Failed to fetch policy acknowledgement statistics', code: 'SRV_001' };
  }
}

// --- AUDITS ---

export async function createAudit(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
      return { success: false, error: 'Forbidden: Auditor or Admin credentials required', code: 'AUTH_002' };
    }

    const data = auditSchema.parse(input);
    const findingsParsed = JSON.parse(data.findings);

    const audit = await prisma.audit.create({
      data: {
        title: data.title,
        departmentId: data.departmentId,
        auditorId: data.auditorId,
        date: data.date,
        findings: findingsParsed,
        status: AuditStatus.SCHEDULED,
      },
    });

    revalidatePath('/governance');
    return { success: true, data: audit };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createAudit]', error);
    return { success: false, error: 'Failed to create audit', code: 'SRV_001' };
  }
}

export async function updateAudit(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
      return { success: false, error: 'Forbidden', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = auditSchema.parse(input);
    const findingsParsed = JSON.parse(data.findings);

    const audit = await prisma.audit.update({
      where: { id: validatedId },
      data: {
        title: data.title,
        departmentId: data.departmentId,
        auditorId: data.auditorId,
        date: data.date,
        findings: findingsParsed,
      },
    });

    revalidatePath('/governance');
    return { success: true, data: audit };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateAudit]', error);
    return { success: false, error: 'Failed to update audit', code: 'SRV_001' };
  }
}

export async function completeAudit(id: string, input: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
      return { success: false, error: 'Forbidden: Auditor or Admin credentials required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = completeAuditSchema.parse(input);

    const audit = await prisma.audit.findUnique({
      where: { id: validatedId },
    });

    if (!audit) {
      return { success: false, error: 'Audit record not found', code: 'GOV_003' };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark audit as COMPLETED and store findings
      await tx.audit.update({
        where: { id: validatedId },
        data: {
          status: AuditStatus.COMPLETED,
          findings: data.findings as any,
        },
      });

      // 2. Loop findings and auto-create ComplianceIssues for those with severity >= MEDIUM
      for (const finding of data.findings) {
        if (finding.severity === 'MEDIUM' || finding.severity === 'HIGH' || finding.severity === 'CRITICAL') {
          await tx.complianceIssue.create({
            data: {
              auditId: validatedId,
              severity: finding.severity,
              description: finding.finding,
              ownerId: finding.ownerId,
              dueDate: finding.dueDate,
              status: ComplianceStatus.OPEN,
            },
          });

          // Send notification to owner
          await tx.notification.create({
            data: {
              userId: finding.ownerId,
              type: 'COMPLIANCE',
              title: 'Compliance Issue Assigned',
              message: `A compliance issue has been opened for you from audit "${audit.title}". Due date: ${finding.dueDate.toLocaleDateString()}`,
              link: '/governance',
              read: false,
            },
          });
        }
      }
    });

    await recalculateDepartmentScore(audit.departmentId);

    revalidatePath('/governance');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[completeAudit]', error);
    return { success: false, error: 'Failed to complete audit log', code: 'SRV_001' };
  }
}

export async function listAudits(filters?: { departmentId?: string; status?: AuditStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};

    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) return { success: true, data: [] };
      queryWhere.departmentId = session.departmentId;
    } else if (filters?.departmentId) {
      queryWhere.departmentId = filters.departmentId;
    }

    if (filters?.status) {
      queryWhere.status = filters.status;
    }

    const audits = await prisma.audit.findMany({
      where: queryWhere,
      include: { department: true, auditor: true },
      orderBy: { date: 'desc' },
    });

    const serialized = audits.map(a => ({
      ...a,
      department: {
        ...a.department,
        envScore: Number(a.department.envScore),
        socialScore: Number(a.department.socialScore),
        govScore: Number(a.department.govScore),
        totalScore: Number(a.department.totalScore),
      },
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listAudits]', error);
    return { success: false, error: 'Failed to list audits database', code: 'SRV_001' };
  }
}

// --- COMPLIANCE ISSUES ---

export async function createComplianceIssue(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
      return { success: false, error: 'Forbidden: Auditor or Admin credentials required', code: 'AUTH_002' };
    }

    const data = complianceIssueSchema.parse(input);

    const issue = await prisma.complianceIssue.create({
      data: {
        auditId: data.auditId,
        severity: data.severity as ComplianceSeverity,
        description: data.description,
        ownerId: data.ownerId,
        dueDate: data.dueDate,
        status: data.status as ComplianceStatus,
      },
    });

    await createNotification(
      data.ownerId,
      'COMPLIANCE',
      'Compliance Issue Assigned',
      `You have been assigned a compliance issue: "${issue.description}". Due: ${issue.dueDate.toLocaleDateString()}`,
      '/governance'
    );

    const audit = await prisma.audit.findUnique({ where: { id: data.auditId } });
    if (audit) {
      await recalculateDepartmentScore(audit.departmentId);
    }

    revalidatePath('/governance');
    return { success: true, data: issue };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createComplianceIssue]', error);
    return { success: false, error: 'Failed to create compliance issue', code: 'SRV_001' };
  }
}

export async function updateComplianceIssue(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedId = uuidSchema.parse(id);
    const data = updateComplianceIssueSchema.parse(input);

    const issue = await prisma.complianceIssue.findUnique({
      where: { id: validatedId },
      include: { audit: true },
    });

    if (!issue) {
      return { success: false, error: 'Compliance issue not found', code: 'GOV_004' };
    }

    // Owner, Manager of same department, and Admins can update
    const isOwner = issue.ownerId === session.userId;
    const isAdmin = session.role === 'ADMIN';
    const isManagerOfDept = session.role === 'MANAGER' && session.departmentId === issue.audit.departmentId;

    if (!isOwner && !isAdmin && !isManagerOfDept) {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    const updated = await prisma.complianceIssue.update({
      where: { id: validatedId },
      data: {
        severity: data.severity as ComplianceSeverity || undefined,
        description: data.description || undefined,
        ownerId: data.ownerId || undefined,
        dueDate: data.dueDate || undefined,
        status: data.status as ComplianceStatus || undefined,
      },
    });

    await recalculateDepartmentScore(issue.audit.departmentId);

    revalidatePath('/governance');
    return { success: true, data: updated };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateComplianceIssue]', error);
    return { success: false, error: 'Failed to update compliance issue', code: 'SRV_001' };
  }
}

export async function resolveComplianceIssue(id: string, resolutionNotes: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedId = uuidSchema.parse(id);
    z.string().min(5, 'Notes must explain findings remedy').parse(resolutionNotes);

    const issue = await prisma.complianceIssue.findUnique({
      where: { id: validatedId },
      include: { audit: true },
    });

    if (!issue) {
      return { success: false, error: 'Compliance issue not found', code: 'GOV_004' };
    }

    const isOwner = issue.ownerId === session.userId;
    const isAdmin = session.role === 'ADMIN';
    const isManagerOfDept = session.role === 'MANAGER' && session.departmentId === issue.audit.departmentId;

    if (!isOwner && !isAdmin && !isManagerOfDept) {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    await prisma.complianceIssue.update({
      where: { id: validatedId },
      data: {
        status: ComplianceStatus.RESOLVED,
      },
    });

    await recalculateDepartmentScore(issue.audit.departmentId);

    // Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'COMPLIANCE',
        'Compliance Issue Resolved',
        `Compliance issue "${issue.description}" resolved by ${session.name}.`,
        '/governance'
      );
    }

    revalidatePath('/governance');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid notes input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[resolveComplianceIssue]', error);
    return { success: false, error: 'Failed to resolve compliance issue', code: 'SRV_001' };
  }
}

export async function listComplianceIssues(filters?: { departmentId?: string; status?: ComplianceStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};

    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) return { success: true, data: [] };
      queryWhere.OR = [
        { ownerId: session.userId },
        { audit: { departmentId: session.departmentId } },
      ];
    } else if (filters?.departmentId) {
      queryWhere.audit = { departmentId: filters.departmentId };
    }

    if (filters?.status) {
      queryWhere.status = filters.status;
    }

    const issues = await prisma.complianceIssue.findMany({
      where: queryWhere,
      include: {
        audit: { include: { department: true } },
        owner: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    // Overdue items flagged automatically in query/mapping
    const mapped = issues.map((i) => {
      const isOverdue = i.status === 'OPEN' && new Date(i.dueDate) < now;
      return {
        ...i,
        status: isOverdue ? 'OVERDUE' : i.status,
        audit: {
          ...i.audit,
          department: {
            ...i.audit.department,
            envScore: Number(i.audit.department.envScore),
            socialScore: Number(i.audit.department.socialScore),
            govScore: Number(i.audit.department.govScore),
            totalScore: Number(i.audit.department.totalScore),
          },
        },
      };
    });

    return { success: true, data: mapped };
  } catch (error: any) {
    console.error('[listComplianceIssues]', error);
    return { success: false, error: 'Failed to list compliance issues log', code: 'SRV_001' };
  }
}

export async function getGovernanceMetrics(): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const now = new Date();
    const queryWhere: any = {};

    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) {
        return { success: true, data: { openIssuesCount: 0, overdueIssuesCount: 0, policyAcknowledgementRate: 0, auditCompletionRate: 0 } };
      }
      queryWhere.audit = { departmentId: session.departmentId };
    }

    const openIssuesCount = await prisma.complianceIssue.count({
      where: {
        ...queryWhere,
        status: ComplianceStatus.OPEN,
      },
    });

    const overdueIssuesCount = await prisma.complianceIssue.count({
      where: {
        ...queryWhere,
        status: ComplianceStatus.OPEN,
        dueDate: { lt: now },
      },
    });

    // Policies acknowledgement rate
    const totalStaff = await prisma.user.count({
      where: session.departmentId ? { departmentId: session.departmentId } : {},
    });
    const totalAcks = await prisma.policyAcknowledgement.count({
      where: {
        employee: session.departmentId ? { departmentId: session.departmentId } : {},
      },
    });
    const policyAcknowledgementRate = totalStaff > 0 ? (totalAcks / totalStaff) * 100 : 0;

    // Audits completion rate
    const totalAudits = await prisma.audit.count({ where: queryWhere });
    const completedAudits = await prisma.audit.count({
      where: {
        ...queryWhere,
        status: AuditStatus.COMPLETED,
      },
    });
    const auditCompletionRate = totalAudits > 0 ? (completedAudits / totalAudits) * 100 : 0;

    return {
      success: true,
      data: {
        openIssuesCount,
        overdueIssuesCount,
        policyAcknowledgementRate,
        auditCompletionRate,
      },
    };
  } catch (error: any) {
    console.error('[getGovernanceMetrics]', error);
    return { success: false, error: 'Failed to calculate governance metrics', code: 'SRV_001' };
  }
}

export async function createESGBPolicyAction(data: any) {
  const res = await createPolicy(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function acknowledgePolicyAction(policyId: string, ipAddress?: string) {
  const res = await acknowledgePolicy(policyId);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function createAuditAction(data: any) {
  const res = await createAudit(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function createComplianceIssueAction(data: any) {
  const res = await createComplianceIssue(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function resolveComplianceIssueAction(id: string) {
  const res = await resolveComplianceIssue(id, 'Resolved via client interface');
  if (!res.success) return { error: res.error };
  return { success: true };
}

