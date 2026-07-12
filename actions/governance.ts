'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { PolicyStatus, AuditStatus, ComplianceSeverity, ComplianceStatus } from '@prisma/client';

const policySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  departmentId: z.string().uuid().optional().nullable(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

const auditSchema = z.object({
  title: z.string().min(3, 'Audit title must be at least 3 characters'),
  departmentId: z.string().uuid('Invalid department ID'),
  auditorId: z.string().uuid('Invalid auditor ID'),
  date: z.string().transform((str) => new Date(str)),
  findings: z.string().optional().default('[]'),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).default('SCHEDULED'),
});

const complianceIssueSchema = z.object({
  auditId: z.string().uuid('Invalid audit ID'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(5, 'Description is required'),
  ownerId: z.string().uuid('Invalid owner ID'),
  dueDate: z.string().transform((str) => new Date(str)),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'OVERDUE']).default('OPEN'),
});

// --- ESG POLICIES ---

export async function createESGBPolicyAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  const validation = policySchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const policy = await prisma.eSGBPolicy.create({
      data: {
        title: validation.data.title,
        content: validation.data.content,
        departmentId: validation.data.departmentId || undefined,
        status: validation.data.status as PolicyStatus,
      },
    });

    // Notify employees
    let employeesToNotify = [];
    if (validation.data.departmentId) {
      employeesToNotify = await prisma.user.findMany({
        where: { departmentId: validation.data.departmentId },
      });
    } else {
      employeesToNotify = await prisma.user.findMany();
    }

    for (const emp of employeesToNotify) {
      await prisma.notification.create({
        data: {
          userId: emp.id,
          type: 'POLICY',
          title: 'New Policy Published',
          message: `A new policy has been published: "${policy.title}". Please read and acknowledge it.`,
          link: '/governance',
        },
      });
    }

    revalidatePath('/governance');
    return { success: true, data: policy };
  } catch (error: any) {
    console.error('Error creating policy:', error);
    return { error: 'Failed to create policy' };
  }
}

export async function acknowledgePolicyAction(policyId: string, ipAddress: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const existing = await prisma.policyAcknowledgement.findFirst({
      where: {
        employeeId: session.userId,
        policyId,
      },
    });

    if (existing) {
      return { error: 'Policy already acknowledged' };
    }

    await prisma.policyAcknowledgement.create({
      data: {
        employeeId: session.userId,
        policyId,
        ipAddress,
      },
    });

    revalidatePath('/governance');
    return { success: true };
  } catch (error: any) {
    console.error('Error acknowledging policy:', error);
    return { error: 'Failed to acknowledge policy' };
  }
}

// --- AUDITS ---

export async function createAuditAction(data: any) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
    return { error: 'Forbidden: Admin or Auditor credentials required' };
  }

  const validation = auditSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const findingsParsed = JSON.parse(validation.data.findings);
    const audit = await prisma.audit.create({
      data: {
        title: validation.data.title,
        departmentId: validation.data.departmentId,
        auditorId: validation.data.auditorId,
        date: validation.data.date,
        findings: findingsParsed,
        status: validation.data.status as AuditStatus,
      },
    });
    revalidatePath('/governance');
    return { success: true, data: audit };
  } catch (error: any) {
    console.error('Error creating audit:', error);
    return { error: 'Failed to create audit' };
  }
}

// --- COMPLIANCE ISSUES ---

export async function createComplianceIssueAction(data: any) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'AUDITOR')) {
    return { error: 'Forbidden' };
  }

  const validation = complianceIssueSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const issue = await prisma.complianceIssue.create({
      data: {
        auditId: validation.data.auditId,
        severity: validation.data.severity as ComplianceSeverity,
        description: validation.data.description,
        ownerId: validation.data.ownerId,
        dueDate: validation.data.dueDate,
        status: validation.data.status as ComplianceStatus,
      },
    });

    // Notify owner
    await prisma.notification.create({
      data: {
        userId: validation.data.ownerId,
        type: 'COMPLIANCE',
        title: 'New Compliance Issue Assigned',
        message: `You have been assigned a compliance issue: "${issue.description}". Due date: ${issue.dueDate.toLocaleDateString()}`,
        link: '/governance',
      },
    });

    // Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'COMPLIANCE',
          title: 'New Compliance Issue Created',
          message: `A new compliance issue has been raised for auditor review. Severity: ${issue.severity}`,
          link: '/governance',
        },
      });
    }

    // Trigger score recalculation on the department associated with the audit
    const audit = await prisma.audit.findUnique({
      where: { id: validation.data.auditId },
    });
    if (audit) {
      await recalculateDepartmentScore(audit.departmentId);
    }

    revalidatePath('/governance');
    revalidatePath('/');
    return { success: true, data: issue };
  } catch (error: any) {
    console.error('Error creating compliance issue:', error);
    return { error: 'Failed to create compliance issue' };
  }
}

export async function resolveComplianceIssueAction(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const issue = await prisma.complianceIssue.findUnique({
      where: { id },
      include: {
        audit: true,
      },
    });

    if (!issue) return { error: 'Compliance issue not found' };

    // Owners, Managers of the department, and Admins can resolve issues
    const isOwner = issue.ownerId === session.userId;
    const isAdmin = session.role === 'ADMIN';
    const isManagerOfDept = session.role === 'MANAGER' && session.departmentId === issue.audit.departmentId;

    if (!isOwner && !isAdmin && !isManagerOfDept) {
      return { error: 'Forbidden: Insufficient privileges' };
    }

    await prisma.complianceIssue.update({
      where: { id },
      data: { status: 'RESOLVED' },
    });

    // Recalculate governance score
    await recalculateDepartmentScore(issue.audit.departmentId);

    // Notify all Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'COMPLIANCE',
          title: 'Compliance Issue Resolved',
          message: `Compliance issue "${issue.description}" has been resolved by ${session.name}.`,
          link: '/governance',
        },
      });
    }

    revalidatePath('/governance');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error resolving compliance issue:', error);
    return { error: 'Failed to resolve compliance issue' };
  }
}
