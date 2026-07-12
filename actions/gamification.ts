'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { checkAndAwardBadges as checkAndAwardBadgesLib } from '@/lib/gamification';
import { createNotification } from './notifications';
import { ApiResponse } from '@/types/api';
import { 
  challengeSchema, 
  challengeStatusSchema, 
  challengeProgressSchema, 
  reviewChallengeParticipationSchema, 
  rewardSchema 
} from '@/lib/validators';
import { ChallengeDifficulty, ChallengeStatus, RewardStatus, ParticipationStatus } from '@prisma/client';

const uuidSchema = z.string().uuid('Invalid ID format');

// --- CHALLENGES CRUD & LIFECYCLE ---

export async function createChallenge(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = challengeSchema.parse(input);

    const challenge = await prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        xpReward: data.xpReward,
        difficulty: data.difficulty as ChallengeDifficulty,
        evidenceRequired: data.evidenceRequired,
        deadline: data.deadline,
        status: data.status as ChallengeStatus,
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: challenge };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createChallenge]', error);
    return { success: false, error: 'Failed to create challenge', code: 'SRV_001' };
  }
}

export async function updateChallenge(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = challengeSchema.parse(input);

    const challenge = await prisma.challenge.update({
      where: { id: validatedId },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        xpReward: data.xpReward,
        difficulty: data.difficulty as ChallengeDifficulty,
        evidenceRequired: data.evidenceRequired,
        deadline: data.deadline,
        status: data.status as ChallengeStatus,
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: challenge };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateChallenge]', error);
    return { success: false, error: 'Failed to update challenge', code: 'SRV_001' };
  }
}

export async function changeChallengeStatus(id: string, statusInput: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const { status } = challengeStatusSchema.parse(statusInput);

    const challenge = await prisma.challenge.findUnique({
      where: { id: validatedId },
    });

    if (!challenge) {
      return { success: false, error: 'Challenge not found', code: 'CHA_001' };
    }

    // Enforce strict state lifecycle: DRAFT -> ACTIVE -> UNDER_REVIEW -> COMPLETED (can ARCHIVE from any state)
    const current = challenge.status;
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['ACTIVE', 'ARCHIVED'],
      ACTIVE: ['UNDER_REVIEW', 'ARCHIVED'],
      UNDER_REVIEW: ['COMPLETED', 'ARCHIVED'],
      COMPLETED: ['ARCHIVED'],
      ARCHIVED: [],
    };

    const isAllowed = status === 'ARCHIVED' || (allowedTransitions[current]?.includes(status) ?? false);
    if (!isAllowed) {
      return { success: false, error: `Invalid status transition from ${current} to ${status}`, code: 'CHA_002' };
    }

    await prisma.challenge.update({
      where: { id: validatedId },
      data: { status },
    });

    revalidatePath('/gamification');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[changeChallengeStatus]', error);
    return { success: false, error: 'Failed to transition challenge status', code: 'SRV_001' };
  }
}

export async function listChallenges(filters?: { status?: ChallengeStatus }): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const statusFilter = filters?.status || 'ACTIVE';

    const challenges = await prisma.challenge.findMany({
      where: { status: statusFilter },
      include: { category: true },
      orderBy: { deadline: 'asc' },
    });

    return { success: true, data: challenges };
  } catch (error: any) {
    console.error('[listChallenges]', error);
    return { success: false, error: 'Failed to list challenges', code: 'SRV_001' };
  }
}

// --- CHALLENGE PARTICIPATIONS ---

export async function joinChallenge(challengeId: string): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'EMPLOYEE') {
      return { success: false, error: 'Forbidden: Only employees can register for sustainability challenges', code: 'AUTH_002' };
    }

    const validatedChallengeId = uuidSchema.parse(challengeId);

    const challenge = await prisma.challenge.findUnique({
      where: { id: validatedChallengeId },
    });

    if (!challenge) {
      return { success: false, error: 'Challenge not found', code: 'CHA_001' };
    }

    // Prevent duplicates
    const existing = await prisma.challengeParticipation.findFirst({
      where: {
        employeeId: session.userId,
        challengeId: validatedChallengeId,
      },
    });

    if (existing) {
      return { success: false, error: 'You are already registered for this challenge', code: 'CHA_003' };
    }

    const participation = await prisma.challengeParticipation.create({
      data: {
        employeeId: session.userId,
        challengeId: validatedChallengeId,
        progress: 0,
        approvalStatus: 'PENDING',
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: participation };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[joinChallenge]', error);
    return { success: false, error: 'Failed to join challenge', code: 'SRV_001' };
  }
}

export async function updateChallengeProgress(participationId: string, input: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedPartId = uuidSchema.parse(participationId);
    const data = challengeProgressSchema.parse(input);

    const participation = await prisma.challengeParticipation.findUnique({
      where: { id: validatedPartId },
    });

    if (!participation) {
      return { success: false, error: 'Participation record not found', code: 'CHA_004' };
    }

    if (participation.employeeId !== session.userId) {
      return { success: false, error: 'Forbidden: You can only update your own progress', code: 'AUTH_002' };
    }

    await prisma.challengeParticipation.update({
      where: { id: validatedPartId },
      data: {
        progress: data.progress,
        proofUrl: data.proofUrl || null,
        completedAt: data.progress >= 100 ? new Date() : undefined,
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateChallengeProgress]', error);
    return { success: false, error: 'Failed to update progress', code: 'SRV_001' };
  }
}

export async function reviewChallengeParticipation(participationId: string, input: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    const validatedPartId = uuidSchema.parse(participationId);
    const data = reviewChallengeParticipationSchema.parse(input);

    const participation = await prisma.challengeParticipation.findUnique({
      where: { id: validatedPartId },
      include: {
        employee: true,
        challenge: true,
      },
    });

    if (!participation) {
      return { success: false, error: 'Participation record not found', code: 'CHA_004' };
    }

    if (session.role === 'MANAGER' && session.departmentId !== participation.employee.departmentId) {
      return { success: false, error: 'Forbidden: You can only review employees in your own department', code: 'AUTH_002' };
    }

    const completedAtDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (data.status === 'APPROVED') {
        const xp = data.xpAwarded !== undefined && data.xpAwarded !== null 
          ? data.xpAwarded 
          : participation.challenge.xpReward;

        await tx.challengeParticipation.update({
          where: { id: validatedPartId },
          data: {
            approvalStatus: 'APPROVED',
            xpAwarded: xp,
            completedAt: completedAtDate,
          },
        });

        // Award XP & Points (1 point per 2 XP for challenges)
        const pointsAwarded = Math.round(xp / 2);
        await tx.user.update({
          where: { id: participation.employeeId },
          data: {
            totalXP: { increment: xp },
            totalPoints: { increment: pointsAwarded },
          },
        });

        await tx.notification.create({
          data: {
            userId: participation.employeeId,
            type: 'CHALLENGE',
            title: 'Challenge Completion Approved!',
            message: `Your completion of "${participation.challenge.title}" was approved. You earned +${xp} XP, +${pointsAwarded} Points!`,
            link: '/gamification',
            read: false,
          },
        });

        return { approved: true, employeeId: participation.employeeId, deptId: participation.employee.departmentId };
      } else {
        await tx.challengeParticipation.update({
          where: { id: validatedPartId },
          data: {
            approvalStatus: 'REJECTED',
          },
        });

        await tx.notification.create({
          data: {
            userId: participation.employeeId,
            type: 'CHALLENGE',
            title: 'Challenge Completion Rejected',
            message: `Your proof for challenge "${participation.challenge.title}" was rejected. Please review submission parameters.`,
            link: '/gamification',
            read: false,
          },
        });

        return { approved: false, employeeId: participation.employeeId, deptId: null };
      }
    });

    if (result.approved && result.deptId) {
      await recalculateDepartmentScore(result.deptId);
      await checkAndAwardBadgesLib(result.employeeId);
    }

    revalidatePath('/gamification');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[reviewChallengeParticipation]', error);
    return { success: false, error: 'Failed to process review action', code: 'SRV_001' };
  }
}

export async function checkAndAwardBadges(employeeId: string): Promise<ApiResponse<null>> {
  try {
    const validatedId = uuidSchema.parse(employeeId);
    await checkAndAwardBadgesLib(validatedId);
    return { success: true, data: null };
  } catch (error: any) {
    console.error('[checkAndAwardBadges - ServerAction]', error);
    return { success: false, error: 'Failed to evaluate badge unlocks', code: 'SRV_001' };
  }
}

// --- LEADERBOARD ---

export async function getLeaderboard(departmentId?: string, limit = 10): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};
    if (departmentId) {
      queryWhere.departmentId = uuidSchema.parse(departmentId);
    }

    const list = await prisma.user.findMany({
      where: queryWhere,
      select: {
        id: true,
        name: true,
        role: true,
        totalXP: true,
        totalPoints: true,
        departmentId: true,
        department: {
          select: { name: true },
        },
        badges: {
          select: { id: true },
        },
      },
      orderBy: { totalXP: 'desc' },
      take: limit,
    });

    const ranked = list.map((user, idx) => ({
      rank: idx + 1,
      id: user.id,
      name: user.name,
      department: user.department?.name || 'Corporate',
      departmentId: user.departmentId,
      totalXP: user.totalXP,
      totalPoints: user.totalPoints,
      badgeCount: user.badges.length,
    }));

    return { success: true, data: ranked };
  } catch (error: any) {
    console.error('[getLeaderboard]', error);
    return { success: false, error: 'Failed to load leaderboard', code: 'SRV_001' };
  }
}

// --- REWARDS ---

export async function createReward(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = rewardSchema.parse(input);

    const reward = await prisma.reward.create({
      data: {
        name: data.name,
        description: data.description,
        pointsRequired: data.pointsRequired,
        stock: data.stock,
        status: RewardStatus.ACTIVE,
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: reward };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createReward]', error);
    return { success: false, error: 'Failed to create reward catalog', code: 'SRV_001' };
  }
}

export async function updateReward(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = rewardSchema.parse(input);

    const reward = await prisma.reward.update({
      where: { id: validatedId },
      data: {
        name: data.name,
        description: data.description,
        pointsRequired: data.pointsRequired,
        stock: data.stock,
      },
    });

    revalidatePath('/gamification');
    return { success: true, data: reward };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateReward]', error);
    return { success: false, error: 'Failed to update reward details', code: 'SRV_001' };
  }
}

export async function redeemReward(rewardId: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    if (session.role !== 'EMPLOYEE') {
      return { success: false, error: 'Forbidden: Only employees can redeem rewards', code: 'AUTH_002' };
    }

    const validatedRewardId = uuidSchema.parse(rewardId);

    await prisma.$transaction(async (tx) => {
      // 1. Fetch user points
      const user = await tx.user.findUnique({
        where: { id: session.userId },
      });
      if (!user) throw new Error('User record not found');

      // 2. Fetch reward details
      const reward = await tx.reward.findUnique({
        where: { id: validatedRewardId },
      });
      if (!reward) throw new Error('Reward catalog item not found');

      // 3. Verify stock
      if (reward.stock <= 0) {
        throw new Error('Reward item is out of stock');
      }

      // 4. Verify points balance
      if (user.totalPoints < reward.pointsRequired) {
        throw new Error(`Insufficient points. You need ${reward.pointsRequired} pts but have ${user.totalPoints} pts.`);
      }

      // 5. Decrement user points
      await tx.user.update({
        where: { id: session.userId },
        data: {
          totalPoints: { decrement: reward.pointsRequired },
        },
      });

      // 6. Decrement stock
      await tx.reward.update({
        where: { id: validatedRewardId },
        data: {
          stock: { decrement: 1 },
        },
      });

      // 7. Log redemption
      await tx.rewardRedemption.create({
        data: {
          employeeId: session.userId,
          rewardId: validatedRewardId,
          pointsDeducted: reward.pointsRequired,
          status: 'DELIVERED',
        },
      });

      // 8. Create Notification
      await tx.notification.create({
        data: {
          userId: session.userId,
          type: 'CSR',
          title: 'Reward Redeemed Successfully!',
          message: `You redeemed "${reward.name}" for ${reward.pointsRequired} points. Remaining balance: ${user.totalPoints - reward.pointsRequired} pts.`,
          link: '/gamification',
          read: false,
        },
      });
    });

    revalidatePath('/gamification');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[redeemReward]', error);
    return { success: false, error: error.message || 'Failed to redeem reward item', code: 'SRV_001' };
  }
}

export async function listRewards(): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const rewards = await prisma.reward.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { pointsRequired: 'asc' },
    });

    return { success: true, data: rewards };
  } catch (error: any) {
    console.error('[listRewards]', error);
    return { success: false, error: 'Failed to list rewards catalog', code: 'SRV_001' };
  }
}

export async function getGamificationMetrics(): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const activeChallengesCount = await prisma.challenge.count({
      where: { status: 'ACTIVE' },
    });

    const participations = await prisma.challengeParticipation.findMany({
      where: { approvalStatus: 'APPROVED' },
      select: { xpAwarded: true },
    });
    const totalXPDistributed = participations.reduce((acc, curr) => acc + (curr.xpAwarded || 0), 0);

    const totalRedemptions = await prisma.rewardRedemption.count();

    // Query top department by aggregate XP
    const departments = await prisma.department.findMany({
      select: {
        name: true,
        employees: {
          select: {
            totalXP: true,
          },
        },
      },
    });

    let topDeptName = 'None';
    let maxXP = -1;

    for (const dept of departments) {
      const aggregateXP = dept.employees.reduce((acc, emp) => acc + emp.totalXP, 0);
      if (aggregateXP > maxXP) {
        maxXP = aggregateXP;
        topDeptName = dept.name;
      }
    }

    return {
      success: true,
      data: {
        activeChallengesCount,
        totalXPDistributed,
        totalRedemptions,
        topDepartment: topDeptName,
      },
    };
  } catch (error: any) {
    console.error('[getGamificationMetrics]', error);
    return { success: false, error: 'Failed to calculate gamification metrics', code: 'SRV_001' };
  }
}

export async function joinChallengeAction(challengeId: string) {
  const res = await joinChallenge(challengeId);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function updateChallengeProgressAction(participationId: string, progress: number, proofUrl?: string) {
  const res = await updateChallengeProgress(participationId, { progress, proofUrl });
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function approveChallengeParticipationAction(participationId: string, status: 'APPROVED' | 'REJECTED') {
  const res = await reviewChallengeParticipation(participationId, { status });
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function redeemRewardAction(rewardId: string) {
  const res = await redeemReward(rewardId);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function createChallengeAction(data: any) {
  const res = await createChallenge(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function createRewardAction(data: any) {
  const res = await createReward(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

