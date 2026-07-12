import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import FeedbackClient from '@/components/FeedbackClient';

export const revalidate = 0;

export default async function FeedbackPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  // Admins see all feedback. Users see their own submissions plus public positive feedback.
  const feedbacks = await prisma.feedback.findMany({
    where: session.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { userId: session.userId },
            {
              category: { in: ['GENERAL', 'FEATURE_REQUEST'] },
              rating: { gte: 4 },
              status: { in: ['REVIEWED', 'RESOLVED'] },
            },
          ],
        },
    include: {
      user: { select: { name: true, role: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = feedbacks.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));

  return (
    <FeedbackClient
      session={{ userId: session.userId, role: session.role, name: session.name }}
      feedbacks={formatted}
    />
  );
}
