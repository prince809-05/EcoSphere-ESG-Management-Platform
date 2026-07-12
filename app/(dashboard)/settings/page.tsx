import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import SettingsClient from './SettingsClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function SettingsPage() {
  await connection();

  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Double check admin role constraint
  if (session.role !== 'ADMIN') {
    redirect('/');
  }

  // 1. Fetch settings (id: 1)
  const settings = await prisma.settings.findUnique({
    where: { id: 1 },
  });

  // 2. Fetch departments
  const departments = await prisma.department.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // 3. Fetch categories
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  // Convert decimal properties on department list for serialization
  const formattedDepartments = departments.map((d) => ({
    ...d,
    envScore: Number(d.envScore),
    socialScore: Number(d.socialScore),
    govScore: Number(d.govScore),
    totalScore: Number(d.totalScore),
  }));

  return (
    <SettingsClient
      initialSettings={settings}
      departments={formattedDepartments}
      categories={categories}
    />
  );
}
