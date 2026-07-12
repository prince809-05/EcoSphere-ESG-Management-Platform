'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { checkAndAwardBadges } from '@/lib/gamification';
import { ChallengeDifficulty, ChallengeStatus, RewardStatus, ParticipationStatus } from '@prisma/client';

const challengeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: z.string().uuid('Invalid category ID'),
  xpReward: z.number().int().nonnegative('XP reward must be positive'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  evidenceRequired: z.boolean().default(false),
  deadline: z.string().transform((str) => new Date(str)),
  status: z.enum(['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
});

const rewardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description is required'),
  pointsRequired: z.number().int().positive('Points must be positive'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
});

// --- CHALLENGES CRUD ---

export async function createChallengeAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  const validation = challengeSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const challenge = await prisma.challenge.create({
      data: {
        title: validation.data.title,
        description: validation.data.description,
        categoryId: validation.data.categoryId,
        xpReward: validation.data.xpReward,
        difficulty: validation.data.difficulty as ChallengeDifficulty,
        evidenceRequired: validation.data.evidenceRequired,
        deadline: validation.data.deadline,
        status: validation.data.status as ChallengeStatus,
      },
    });
    revalidatePath('/gamification');
    return { success: true, data: challenge };
  } catch (error: any) {
    console.error('Error creating Challenge:', error);
    return { error: 'Failed to create challenge' };
  }
}

export async function updateChallengeStatusAction(challengeId: string, status: ChallengeStatus) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  try {
    await prisma.challenge.update({
      where: { id: challengeId },
      data: { status },
    });
    revalidatePath('/gamification');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating challenge status:', error);
    return { error: 'Failed to update challenge status' };
  }
}

// --- CHALLENGE PARTICIPATIONS ---

export async function joinChallengeAction(challengeId: string) {
  const session = await getSession();
  if (!session || session.role !== 'EMPLOYEE') {
    return { error: 'Only employees can participate in challenges' };
  }

  try {
    const existing = await prisma.challengeParticipation.findFirst({
      where: {
        employeeId: session.userId,
        challengeId,
      },
    });

    if (existing) {
      return { error: 'You are already registered for this challenge' };
    }

    const participation = await prisma.challengeParticipation.create({
      data: {
        employeeId: session.userId,
        challengeId,
        progress: 0,
        approvalStatus: 'PENDING',
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: participation };
  } catch (error: any) {
    console.error('Error joining challenge:', error);
    return { error: 'Failed to join challenge' };
  }
}

export async function updateChallengeProgressAction(participationId: string, progress: number, proofUrl?: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const participation = await prisma.challengeParticipation.findUnique({
      where: { id: participationId },
    });

    if (!participation) return { error: 'Participation not found' };
    if (participation.employeeId !== session.userId) return { error: 'Forbidden' };

    await prisma.challengeParticipation.update({
      where: { id: participationId },
      data: {
        progress: Math.min(100, Math.max(0, progress)),
        proofUrl: proofUrl || undefined,
        completedAt: progress >= 100 ? new Date() : undefined,
      },
    });

    revalidatePath('/gamification');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating challenge progress:', error);
    return { error: 'Failed to update progress' };
  }
}

export async function approveChallengeParticipationAction(participationId: string, status: 'APPROVED' | 'REJECTED') {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden' };
  }

  try {
    const participation = await prisma.challengeParticipation.findUnique({
      where: { id: participationId },
      include: {
        employee: true,
        challenge: true,
      },
    });

    if (!participation) return { error: 'Participation not found' };

    if (session.role === 'MANAGER' && session.departmentId !== participation.employee.departmentId) {
      return { error: 'Forbidden: You can only approve challenges for employees in your department' };
    }

    const completedAtDate = new Date();

    if (status === 'APPROVED') {
      const xp = participation.challenge.xpReward;

      await prisma.challengeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'APPROVED',
          xpAwarded: xp,
          completedAt: completedAtDate,
        },
      });

      // Award XP
      await prisma.user.update({
        where: { id: participation.employeeId },
        data: {
          totalXP: { increment: xp },
        },
      });

      // Recalculate Social Score (because challenge participation count affects Social score)
      if (participation.employee.departmentId) {
        await recalculateDepartmentScore(participation.employee.departmentId);
      }

      // Check badge awards
      await checkAndAwardBadges(participation.employeeId);

      // Create Notification
      await prisma.notification.create({
        data: {
          userId: participation.employeeId,
          type: 'CHALLENGE',
          title: 'Challenge Completion Approved!',
          message: `Your completion of "${participation.challenge.title}" was approved. You earned ${xp} XP!`,
          link: '/gamification',
        },
      });

    } else {
      await prisma.challengeParticipation.update({
        where: { id: participationId },
        data: {
          approvalStatus: 'REJECTED',
        },
      });

      // Create Notification
      await prisma.notification.create({
        data: {
          userId: participation.employeeId,
          type: 'CHALLENGE',
          title: 'Challenge Completion Rejected',
          message: `Your proof for challenge "${participation.challenge.title}" was rejected. Please review your submission.`,
          link: '/gamification',
        },
      });
    }

    revalidatePath('/gamification');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error approving challenge completion:', error);
    return { error: 'Failed to approve challenge' };
  }
}

// --- REWARDS SYSTEM ---

export async function redeemRewardAction(rewardId: string) {
  const session = await getSession();
  if (!session || session.role !== 'EMPLOYEE') {
    return { error: 'Only employees can redeem rewards from the catalog' };
  }

  try {
    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch user points
      const user = await tx.user.findUnique({
        where: { id: session.userId },
      });
      if (!user) throw new Error('User not found');

      // 2. Fetch reward details
      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });
      if (!reward) throw new Error('Reward not found');

      // 3. Verify stock
      if (reward.stock <= 0) {
        throw new Error('This reward is currently out of stock');
      }

      // 4. Verify points balance
      if (user.totalPoints < reward.pointsRequired) {
        throw new Error(`Insufficient points. You need ${reward.pointsRequired} points but have ${user.totalPoints}`);
      }

      // 5. Deduct points from employee
      const updatedUser = await tx.user.update({
        where: { id: session.userId },
        data: {
          totalPoints: { decrement: reward.pointsRequired },
        },
      });

      // 6. Decrement stock from reward
      await tx.reward.update({
        where: { id: rewardId },
        data: {
          stock: { decrement: 1 },
        },
      });

      // 7. Create RewardRedemption transaction
      const redemption = await tx.rewardRedemption.create({
        data: {
          employeeId: session.userId,
          rewardId,
          pointsDeducted: reward.pointsRequired,
          status: 'DELIVERED', // immediately approved for simulation
        },
      });

      // 8. Send notification
      await tx.notification.create({
        data: {
          userId: session.userId,
          type: 'CSR', // generic notification
          title: 'Reward Redeemed Successfully!',
          message: `You redeemed "${reward.name}" for ${reward.pointsRequired} points. Your remaining balance: ${updatedUser.totalPoints} points.`,
          link: '/gamification',
        },
      });

      return { success: true };
    });

    revalidatePath('/gamification');
    revalidatePath('/');
    return result;
  } catch (error: any) {
    console.error('Error redeeming reward:', error);
    return { error: error.message || 'Failed to redeem reward' };
  }
}

export async function createRewardAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  const validation = rewardSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const reward = await prisma.reward.create({
      data: {
        name: validation.data.name,
        description: validation.data.description,
        pointsRequired: validation.data.pointsRequired,
        stock: validation.data.stock,
        status: 'ACTIVE' as RewardStatus,
      },
    });
    revalidatePath('/gamification');
    return { success: true, data: reward };
  } catch (error: any) {
    console.error('Error creating reward:', error);
    return { error: 'Failed to create reward' };
  }
}
