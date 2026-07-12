import React from 'react';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import GovernanceClient from './GovernanceClient';

export const revalidate = 0; // Fetch fresh data on load

export default async function GovernancePage() {
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

  // 3. Fetch Audits based on role
  let audits;
  if (session.role === 'ADMIN' || session.role === 'AUDITOR') {
    audits = await prisma.audit.findMany({
      include: {
        department: true,
        auditor: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  } else {
    // Managers/Employees can only see audits related to their own department
    audits = await prisma.audit.findMany({
      where: {
        departmentId: userDeptId || undefined,
      },
      include: {
        department: true,
        auditor: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  // 4. Fetch Compliance Issues based on role
  let complianceIssues;
  if (session.role === 'ADMIN' || session.role === 'AUDITOR') {
    complianceIssues = await prisma.complianceIssue.findMany({
      include: {
        audit: true,
        owner: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  } else {
    // Managers and Employees see issues assigned to them OR those within their department audits
    complianceIssues = await prisma.complianceIssue.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          {
            audit: {
              departmentId: userDeptId || undefined,
            },
          },
        ],
      },
      include: {
        audit: true,
        owner: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  // 5. Fetch all Active Departments
  const departments = await prisma.department.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: {
      name: 'asc',
    },
  });

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
      policies={policies}
      myAcknowledgements={myAcknowledgements}
      audits={audits}
      complianceIssues={complianceIssues}
      departments={departments}
      users={users}
    />
  );
}
