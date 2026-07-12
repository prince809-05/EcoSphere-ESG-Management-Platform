'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { checkAndAwardBadges } from '@/lib/gamification';
import { ActivityStatus, ParticipationStatus } from '@prisma/client';

const csrActivitySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().uuid('Invalid category ID'),
  pointsReward: z.number().int().nonnegative('Points reward must be positive'),
  xpReward: z.number().int().nonnegative('XP reward must be positive'),
  deadline: z.string().transform((str) => new Date(str)),
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
});

// --- CSR ACTIVITIES CRUD ---

export async function createCSRActivityAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  const validation = csrActivitySchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const activity = await prisma.cSRActivity.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        categoryId: validation.data.categoryId,
        pointsReward: validation.data.pointsReward,
        xpReward: validation.data.xpReward,
        deadline: validation.data.deadline,
        status: validation.data.status as ActivityStatus,
      },
    });
    revalidatePath('/social');
    return { success: true, data: activity };
  } catch (error: any) {
    console.error('Error creating CSR Activity:', error);
    return { error: 'Failed to create CSR activity' };
  }
}

export async function deleteCSRActivityAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  try {
    await prisma.cSRActivity.delete({
      where: { id },
    });
    revalidatePath('/social');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting CSR Activity:', error);
    return { error: 'Failed to delete CSR activity' };
  }
}

// --- EMPLOYEE JOIN & PROOF ---

export async function joinCSRActivityAction(activityId: string) {
  const session = await getSession();
  if (!session || session.role !== 'EMPLOYEE') {
    return { error: 'Only employees can participate in CSR activities' };
  }

  try {
    // Check if already participating
    const existing = await prisma.employeeParticipation.findFirst({
      where: {
        employeeId: session.userId,
        activityId,
      },
    });

    if (existing) {
      return { error: 'You are already registered for this activity' };
    }

    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: session.userId,
        activityId,
        approvalStatus: 'PENDING',
      },
    });

    revalidatePath('/social');
    return { success: true, data: participation };
  } catch (error: any) {
    console.error('Error joining CSR activity:', error);
    return { error: 'Failed to join activity' };
  }
}

export async function uploadProofCSRAction(participationId: string, proofUrl: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const participation = await prisma.employeeParticipation.findUnique({
      where: { id: participationId },
      include: { employee: true },
    });

    if (!participation) return { error: 'Participation record not found' };
    
    if (participation.employeeId !== session.userId) {
      return { error: 'Forbidden: You can only upload proof for your own participation' };
    }

    await prisma.employeeParticipation.update({
      where: { id: participationId },
      data: {
        proofUrl,
        completedAt: new Date(),
      },
    });

    revalidatePath('/social');
    return { success: true };
  } catch (error: any) {
    console.error('Error uploading CSR proof:', error);
    return { error: 'Failed to upload proof' };
  }
}

// --- MANAGER APPROVALS ---

export async function approveParticipationAction(participationId: string, status: 'APPROVED' | 'REJECTED') {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden: Insufficient privileges' };
  }

  try {
    const participation = await prisma.employeeParticipation.findUnique({
      where: { id: participationId },
      include: {
        employee: true,
        activity: true,
      },
    });

    if (!participation) return { error: 'Participation record not found' };

    // Managers can only approve participations for employees of their own department
    if (session.role === 'MANAGER' && session.departmentId !== participation.employee.departmentId) {
      return { error: 'Forbidden: You can only approve participations for employees in your own department' };
    }

    const completedDate = new Date();

    if (status === 'APPROVED') {
      const points = participation.activity.pointsReward;
      const xp = participation.activity.xpReward;

      // Update participation record
      await prisma.employeeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'APPROVED',
          pointsEarned: points,
          reviewedBy: session.userId,
          reviewedAt: completedDate,
        },
      });

      // Award XP & Points to employee
      await prisma.user.update({
        where: { id: participation.employeeId },
        data: {
          totalPoints: { increment: points },
          totalXP: { increment: xp },
        },
      });

      // Trigger ESG recalculation
      if (participation.employee.departmentId) {
        await recalculateDepartmentScore(participation.employee.departmentId);
      }

      // Trigger Badge Auto-Award checks
      await checkAndAwardBadges(participation.employeeId);

      // Create Notification
      await prisma.notification.create({
        data: {
          userId: participation.employeeId,
          type: 'CSR',
          title: 'CSR Activity Approved',
          message: `Your participation in "${participation.activity.title}" was approved! You earned ${points} Points and ${xp} XP.`,
          link: '/gamification',
        },
      });

    } else {
      // REJECTED
      await prisma.employeeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'REJECTED',
          reviewedBy: session.userId,
          reviewedAt: completedDate,
        },
      });

      // Create Notification
      await prisma.notification.create({
        data: {
          userId: participation.employeeId,
          type: 'CSR',
          title: 'CSR Activity Rejected',
          message: `Your participation proof for "${participation.activity.title}" was rejected. Please review and re-submit.`,
          link: '/social',
        },
      });
    }

    revalidatePath('/social');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error approving CSR participation:', error);
    return { error: 'Failed to process approval request' };
  }
}
