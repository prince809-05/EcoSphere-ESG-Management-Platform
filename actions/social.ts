'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { checkAndAwardBadges } from '@/lib/gamification';
import { createNotification } from './notifications';
import { ApiResponse } from '@/types/api';
import { csrActivitySchema, participationReviewSchema } from '@/lib/validators';
import { ActivityStatus, ParticipationStatus } from '@prisma/client';

const uuidSchema = z.string().uuid('Invalid ID format');

// --- CSR ACTIVITIES CRUD ---

export async function createCSRActivity(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = csrActivitySchema.parse(input);

    const activity = await prisma.cSRActivity.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        pointsReward: data.pointsReward,
        xpReward: Math.round(data.pointsReward * 1.5), // XP reward correlates with points
        deadline: data.deadline,
        status: data.status as ActivityStatus,
      },
    });

    revalidatePath('/social');
    return { success: true, data: activity };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createCSRActivity]', error);
    return { success: false, error: 'Failed to create CSR activity', code: 'SRV_001' };
  }
}

export async function updateCSRActivity(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = csrActivitySchema.parse(input);

    const activity = await prisma.cSRActivity.update({
      where: { id: validatedId },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        pointsReward: data.pointsReward,
        xpReward: Math.round(data.pointsReward * 1.5),
        deadline: data.deadline,
        status: data.status as ActivityStatus,
      },
    });

    revalidatePath('/social');
    return { success: true, data: activity };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateCSRActivity]', error);
    return { success: false, error: 'Failed to update CSR activity', code: 'SRV_001' };
  }
}

export async function archiveCSRActivity(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    await prisma.cSRActivity.update({
      where: { id: validatedId },
      data: { status: 'ARCHIVED' },
    });

    revalidatePath('/social');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[archiveCSRActivity]', error);
    return { success: false, error: 'Failed to archive CSR activity', code: 'SRV_001' };
  }
}

export async function listCSRActivities(filters?: { status?: ActivityStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const statusFilter = filters?.status || 'ACTIVE';

    const activities = await prisma.cSRActivity.findMany({
      where: { status: statusFilter },
      include: { category: true },
      orderBy: { deadline: 'asc' },
    });

    return { success: true, data: activities };
  } catch (error: any) {
    console.error('[listCSRActivities]', error);
    return { success: false, error: 'Failed to list CSR activities', code: 'SRV_001' };
  }
}

// --- EMPLOYEE JOIN & PROOF ---

export async function joinCSRActivity(activityId: string): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'EMPLOYEE') {
      return { success: false, error: 'Forbidden: Only employees can register for CSR activities', code: 'AUTH_002' };
    }

    const validatedActivityId = uuidSchema.parse(activityId);

    const activity = await prisma.cSRActivity.findUnique({
      where: { id: validatedActivityId },
    });

    if (!activity) {
      return { success: false, error: 'Activity not found', code: 'CSR_001' };
    }

    // Prevent duplicates
    const existing = await prisma.employeeParticipation.findFirst({
      where: {
        employeeId: session.userId,
        activityId: validatedActivityId,
      },
    });

    if (existing) {
      return { success: false, error: 'You are already registered for this activity', code: 'CSR_002' };
    }

    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: session.userId,
        activityId: validatedActivityId,
        approvalStatus: 'PENDING',
        pointsEarned: 0,
      },
    });

    revalidatePath('/social');
    return { success: true, data: participation };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[joinCSRActivity]', error);
    return { success: false, error: 'Failed to join activity', code: 'SRV_001' };
  }
}

export async function submitProof(participationId: string, proofUrl: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedPartId = uuidSchema.parse(participationId);
    z.string().url('Proof must be a valid link URL').parse(proofUrl);

    const participation = await prisma.employeeParticipation.findUnique({
      where: { id: validatedPartId },
    });

    if (!participation) {
      return { success: false, error: 'Participation record not found', code: 'CSR_003' };
    }

    if (participation.employeeId !== session.userId) {
      return { success: false, error: 'Forbidden: You can only submit proof for your own activities', code: 'AUTH_002' };
    }

    await prisma.employeeParticipation.update({
      where: { id: validatedPartId },
      data: {
        proofUrl,
        completedAt: new Date(),
      },
    });

    revalidatePath('/social');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[submitProof]', error);
    return { success: false, error: 'Failed to submit proof', code: 'SRV_001' };
  }
}

export async function reviewParticipation(input: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    const data = participationReviewSchema.parse(input);

    const participation = await prisma.employeeParticipation.findUnique({
      where: { id: data.participationId },
      include: {
        employee: true,
        activity: true,
      },
    });

    if (!participation) {
      return { success: false, error: 'Participation record not found', code: 'CSR_003' };
    }

    // Manager department constraint
    if (session.role === 'MANAGER' && session.departmentId !== participation.employee.departmentId) {
      return { success: false, error: 'Forbidden: You can only review employees in your own department', code: 'AUTH_002' };
    }

    // Load ESG Config settings
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const config = (settings?.config as any) || {};
    const requireEvidence = config.requireEvidenceForCSR ?? true;

    // Block approval if evidence required but missing
    if (data.status === 'APPROVED' && requireEvidence && !participation.proofUrl) {
      return { success: false, error: 'Evidence URL is required by policy configuration before approval.', code: 'CSR_004' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const completedDate = new Date();
      const points = data.pointsOverride !== undefined && data.pointsOverride !== null 
        ? data.pointsOverride 
        : participation.activity.pointsReward;
      const xp = Math.round(points * 1.5);

      if (data.status === 'APPROVED') {
        // 1. Update status
        await tx.employeeParticipation.update({
          where: { id: data.participationId },
          data: {
            approvalStatus: 'APPROVED',
            pointsEarned: points,
            reviewedBy: session.userId,
            reviewedAt: completedDate,
          },
        });

        // 2. Increment points & XP
        await tx.user.update({
          where: { id: participation.employeeId },
          data: {
            totalPoints: { increment: points },
            totalXP: { increment: xp },
          },
        });

        // 3. Create Notification
        await tx.notification.create({
          data: {
            userId: participation.employeeId,
            type: 'CSR',
            title: 'CSR Participation Approved',
            message: `Your participation in "${participation.activity.title}" was approved! +${points} Points, +${xp} XP.`,
            link: '/social',
            read: false,
          },
        });

        return { approved: true, employeeId: participation.employeeId, deptId: participation.employee.departmentId };
      } else {
        // REJECTED
        await tx.employeeParticipation.update({
          where: { id: data.participationId },
          data: {
            approvalStatus: 'REJECTED',
            reviewedBy: session.userId,
            reviewedAt: completedDate,
          },
        });

        // Create Notification
        await tx.notification.create({
          data: {
            userId: participation.employeeId,
            type: 'CSR',
            title: 'CSR Participation Rejected',
            message: `Your submission for "${participation.activity.title}" was rejected. Please review proof guidelines.`,
            link: '/social',
            read: false,
          },
        });

        return { approved: false, employeeId: participation.employeeId, deptId: null };
      }
    });

    if (result.approved && result.deptId) {
      await recalculateDepartmentScore(result.deptId);
      await checkAndAwardBadges(result.employeeId);
    }

    revalidatePath('/social');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[reviewParticipation]', error);
    return { success: false, error: 'Failed to process review action', code: 'SRV_001' };
  }
}

export async function listParticipations(filters?: { departmentId?: string; status?: ParticipationStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};

    // Filter by role permissions
    if (session.role === 'EMPLOYEE') {
      queryWhere.employeeId = session.userId;
    } else if (session.role === 'MANAGER') {
      if (!session.departmentId) return { success: true, data: [] };
      queryWhere.employee = { departmentId: session.departmentId };
    } else if (filters?.departmentId) {
      queryWhere.employee = { departmentId: filters.departmentId };
    }

    if (filters?.status) {
      queryWhere.approvalStatus = filters.status;
    }

    const list = await prisma.employeeParticipation.findMany({
      where: queryWhere,
      include: {
        employee: { include: { department: true } },
        activity: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    // Cast nested decimals
    const serialized = list.map(p => ({
      ...p,
      employee: {
        ...p.employee,
        department: p.employee.department ? {
          ...p.employee.department,
          envScore: Number(p.employee.department.envScore),
          socialScore: Number(p.employee.department.socialScore),
          govScore: Number(p.employee.department.govScore),
          totalScore: Number(p.employee.department.totalScore),
        } : null,
      },
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listParticipations]', error);
    return { success: false, error: 'Failed to list participations', code: 'SRV_001' };
  }
}

export async function getSocialMetrics(departmentId?: string): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};
    let targetDeptId = departmentId;

    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) {
        return { success: true, data: { participationRate: 0, totalCSRHours: 0, pendingApprovalsCount: 0 } };
      }
      targetDeptId = session.departmentId;
    }

    if (targetDeptId) {
      queryWhere.employee = { departmentId: targetDeptId };
    }

    const totalStaff = await prisma.user.count({
      where: targetDeptId ? { departmentId: targetDeptId } : {},
    });

    const activeParticipants = await prisma.employeeParticipation.groupBy({
      by: ['employeeId'],
      where: {
        ...queryWhere,
        approvalStatus: 'APPROVED',
      },
    });

    const participationRate = totalStaff > 0 ? (activeParticipants.length / totalStaff) * 100 : 0;

    const pendingApprovalsCount = await prisma.employeeParticipation.count({
      where: {
        ...queryWhere,
        approvalStatus: 'PENDING',
      },
    });

    // Assume 4 hours per approved activity on average for MVP
    const approvedCount = await prisma.employeeParticipation.count({
      where: {
        ...queryWhere,
        approvalStatus: 'APPROVED',
      },
    });
    const totalCSRHours = approvedCount * 4;

    return {
      success: true,
      data: {
        participationRate,
        totalCSRHours,
        pendingApprovalsCount,
      },
    };
  } catch (error: any) {
    console.error('[getSocialMetrics]', error);
    return { success: false, error: 'Failed to load social metrics', code: 'SRV_001' };
  }
}

export async function createCSRActivityAction(data: any) {
  const res = await createCSRActivity(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function deleteCSRActivityAction(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return { error: 'Forbidden' };
    await prisma.cSRActivity.delete({ where: { id } });
    revalidatePath('/social');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to delete activity' };
  }
}

export async function joinCSRActivityAction(activityId: string) {
  const res = await joinCSRActivity(activityId);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function uploadProofCSRAction(participationId: string, proofUrl: string) {
  const res = await submitProof(participationId, proofUrl);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function approveParticipationAction(participationId: string, status: 'APPROVED' | 'REJECTED') {
  const res = await reviewParticipation({ participationId, status });
  if (!res.success) return { error: res.error };
  return { success: true };
}

