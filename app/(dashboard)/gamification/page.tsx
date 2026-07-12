import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import GamificationClient from './GamificationClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function GamificationPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userDeptId = session.departmentId;

  // 1. Fetch all Challenges
  const challenges = await prisma.challenge.findMany({
    include: {
      category: true,
    },
    orderBy: {
      deadline: 'asc',
    },
  });

  // 2. Fetch employee's challenge participations
  const myChallengeParticipations = await prisma.challengeParticipation.findMany({
    where: {
      employeeId: session.userId,
    },
  });

  // 3. Fetch pending challenge submissions for review (progress = 100, status = PENDING)
  let pendingChallengeReviews: any[] = [];
  if (session.role === 'ADMIN') {
    pendingChallengeReviews = await prisma.challengeParticipation.findMany({
      where: {
        approvalStatus: 'PENDING',
        progress: 100,
      },
      include: {
        employee: true,
        challenge: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });
  } else if (session.role === 'MANAGER' && userDeptId) {
    pendingChallengeReviews = await prisma.challengeParticipation.findMany({
      where: {
        approvalStatus: 'PENDING',
        progress: 100,
        employee: {
          departmentId: userDeptId,
        },
      },
      include: {
        employee: true,
        challenge: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });
  }

  // 4. Fetch Active Rewards
  const rewards = await prisma.reward.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      pointsRequired: 'asc',
    },
  });

  // 5. Fetch user's Reward Redemptions
  const redemptions = await prisma.rewardRedemption.findMany({
    where: {
      employeeId: session.userId,
    },
    include: {
      reward: true,
    },
    orderBy: {
      redeemedAt: 'desc',
    },
  });

  // 6. Fetch user's unlocked Badges
  const badges = await prisma.employeeBadge.findMany({
    where: {
      employeeId: session.userId,
    },
    include: {
      badge: true,
    },
    orderBy: {
      unlockedAt: 'desc',
    },
  });

  // 7. Fetch all employees ranking for Leaderboard
  const leaderboard = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      totalXP: true,
      totalPoints: true,
      departmentId: true,
      department: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      totalXP: 'desc',
    },
  });

  // 8. Fetch active departments for leaderboard filtering
  const departments = await prisma.department.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  const formattedDepartments = departments.map((d) => ({
    ...d,
    envScore: Number(d.envScore),
    socialScore: Number(d.socialScore),
    govScore: Number(d.govScore),
    totalScore: Number(d.totalScore),
  }));

  // 9. Fetch Challenge Categories
  const categories = await prisma.category.findMany({
    where: {
      type: 'CHALLENGE',
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <GamificationClient
      session={session}
      challenges={challenges}
      myChallengeParticipations={myChallengeParticipations}
      pendingChallengeReviews={pendingChallengeReviews}
      rewards={rewards}
      redemptions={redemptions}
      badges={badges}
      leaderboard={leaderboard}
      departments={formattedDepartments}
      categories={categories}
    />
  );
}
