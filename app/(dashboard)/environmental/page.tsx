import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EnvironmentalClient from './EnvironmentalClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function EnvironmentalPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userDepartmentId = session.departmentId;

  // 1. Query Carbon Transactions based on role
  let transactions;
  if (session.role === 'ADMIN' || session.role === 'AUDITOR') {
    transactions = await prisma.carbonTransaction.findMany({
      include: {
        department: true,
        emissionFactor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  } else {
    transactions = await prisma.carbonTransaction.findMany({
      where: {
        departmentId: userDepartmentId || undefined,
      },
      include: {
        department: true,
        emissionFactor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // 2. Query Active Emission Factors
  const factors = await prisma.emissionFactor.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  // 3. Query Environmental Goals based on role
  let goals;
  if (session.role === 'ADMIN' || session.role === 'AUDITOR') {
    goals = await prisma.environmentalGoal.findMany({
      include: {
        department: true,
      },
      orderBy: {
        deadline: 'asc',
      },
    });
  } else {
    goals = await prisma.environmentalGoal.findMany({
      where: {
        departmentId: userDepartmentId || undefined,
      },
      include: {
        department: true,
      },
      orderBy: {
        deadline: 'asc',
      },
    });
  }

  // 4. Query All Active Departments (useful for dropdown selections)
  const departments = await prisma.department.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Format Decimal types for serialization since Next.js cannot serialize Decimal objects directly!
  const formattedTransactions = transactions.map((t) => ({
    ...t,
    quantity: Number(t.quantity),
    calculatedCO2: Number(t.calculatedCO2),
    emissionFactor: {
      ...t.emissionFactor,
      factorValue: Number(t.emissionFactor.factorValue),
    },
  }));

  const formattedFactors = factors.map((f) => ({
    ...f,
    factorValue: Number(f.factorValue),
  }));

  const formattedGoals = goals.map((g) => ({
    ...g,
    targetCO2: Number(g.targetCO2),
    currentCO2: Number(g.currentCO2),
  }));

  return (
    <EnvironmentalClient
      session={session}
      transactions={formattedTransactions}
      factors={formattedFactors}
      goals={formattedGoals}
      departments={departments}
    />
  );
}
