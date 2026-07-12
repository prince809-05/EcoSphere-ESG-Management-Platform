import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import GovernanceClient from './GovernanceClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function GovernancePage() {
  await connection();

  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const userDeptId = session.departmentId;

  // 1. Fetch ESG Policies
  const policies = await prisma.eSGBPolicy.findMany({
    include: {
      department: true,
      acknowledgements: true,
    },
    orderBy: {
      effectiveDate: 'desc',
    },
  });

  // 2. Fetch logged-in user acknowledgements
  const acknowledgements = await prisma.policyAcknowledgement.findMany({
    where: {
      employeeId: session.userId,
    },
  });
  const myAcknowledgements = acknowledgements.map((a) => a.policyId);

  // 3. Fetch Audits — ALL users can view all audits (read-only for employees/managers)
  const audits = await prisma.audit.findMany({
    include: {
      department: true,
      auditor: true,
    },
    orderBy: {
      date: 'desc',
    },
  });

  // 4. Fetch Compliance Issues — ALL users can view (read-only for employees/managers)
  const complianceIssues = await prisma.complianceIssue.findMany({
    include: {
      audit: true,
      owner: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  });

  // 5. Fetch all Active Departments
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

  const formattedPolicies = policies.map((p) => ({
    ...p,
    department: p.department ? {
      ...p.department,
      envScore: Number(p.department.envScore),
      socialScore: Number(p.department.socialScore),
      govScore: Number(p.department.govScore),
      totalScore: Number(p.department.totalScore),
    } : null,
  }));

  const formattedAudits = audits.map((a) => ({
    ...a,
    department: {
      ...a.department,
      envScore: Number(a.department.envScore),
      socialScore: Number(a.department.socialScore),
      govScore: Number(a.department.govScore),
      totalScore: Number(a.department.totalScore),
    },
  }));

  // 6. Fetch users list (for assigning compliance issues)
  const users = await prisma.user.findMany({
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
    <GovernanceClient
      session={session}
      policies={formattedPolicies}
      myAcknowledgements={myAcknowledgements}
      audits={formattedAudits}
      complianceIssues={complianceIssues}
      departments={formattedDepartments}
      users={users}
    />
  );
}
