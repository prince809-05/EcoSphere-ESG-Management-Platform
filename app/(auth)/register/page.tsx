import { prisma } from '@/lib/prisma';
import { connection } from 'next/server';
import RegisterForm from './RegisterForm';

export default async function RegisterPage() {
  await connection();

  let departments: { id: string; name: string; code: string }[] = [];

  try {
    departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (error) {
    console.warn('Failed to fetch departments (database may be unavailable):', error);
  }

  return <RegisterForm departments={departments} />;
}
