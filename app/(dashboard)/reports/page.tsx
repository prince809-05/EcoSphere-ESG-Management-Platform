import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReportsClient from './ReportsClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Verify Role (Only ADMIN, AUDITOR, and MANAGER can access reports)
  if (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER') {
    redirect('/');
  }

  // 1. Fetch departments
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

  // 2. Fetch users/employees
  const employees = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <ReportsClient
      session={session}
      departments={formattedDepartments}
      employees={employees}
    />
  );
}
