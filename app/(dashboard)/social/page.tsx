import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SocialClient from './SocialClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function SocialPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Fetch all CSR Activities
  const activities = await prisma.cSRActivity.findMany({
    include: {
      category: true,
    },
    orderBy: {
      deadline: 'asc',
    },
  });

  // 2. Fetch employee's own participations
  const myParticipations = await prisma.employeeParticipation.findMany({
    where: {
      employeeId: session.userId,
    },
    include: {
      activity: true,
    },
    orderBy: {
      completedAt: 'desc',
    },
  });

  // 3. Fetch pending participations for Manager/Admin review
  let pendingParticipations: any[] = [];
  if (session.role === 'ADMIN') {
    pendingParticipations = await prisma.employeeParticipation.findMany({
      where: {
        approvalStatus: 'PENDING',
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        activity: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });
  } else if (session.role === 'MANAGER' && session.departmentId) {
    pendingParticipations = await prisma.employeeParticipation.findMany({
      where: {
        approvalStatus: 'PENDING',
        employee: {
          departmentId: session.departmentId,
        },
      },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        activity: true,
      },
      orderBy: {
        completedAt: 'asc',
      },
    });
  }

  // 4. Fetch CSR Categories
  const categories = await prisma.category.findMany({
    where: {
      type: 'CSR_ACTIVITY',
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  const formattedPending = pendingParticipations.map((p) => ({
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

  return (
    <SocialClient
      session={session}
      activities={activities}
      myParticipations={myParticipations}
      pendingParticipations={formattedPending}
      categories={categories}
    />
  );
}
