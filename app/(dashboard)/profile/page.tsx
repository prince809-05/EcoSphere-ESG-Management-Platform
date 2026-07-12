import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ProfileClient from '@/components/ProfileClient';

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      department: { select: { name: true, code: true } },
      badges: { include: { badge: true }, orderBy: { unlockedAt: 'desc' } },
      participations: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
      challengeParticipations: { where: { approvalStatus: 'APPROVED' }, select: { id: true } },
      redemptions: { select: { id: true, pointsDeducted: true } },
    },
  });

  if (!user) redirect('/login');

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalXP: user.totalXP,
        totalPoints: user.totalPoints,
        createdAt: user.createdAt.toISOString(),
        department: user.department ?? null,
        badges: user.badges.map((eb) => ({
          id: eb.id,
          unlockedAt: eb.unlockedAt.toISOString(),
          badge: { name: eb.badge.name, description: eb.badge.description, icon: eb.badge.icon },
        })),
        csrCount: user.participations.length,
        challengeCount: user.challengeParticipations.length,
        redemptionCount: user.redemptions.length,
        pointsSpent: user.redemptions.reduce((sum, r) => sum + r.pointsDeducted, 0),
      }}
    />
  );
}
