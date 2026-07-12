import { prisma } from '@/lib/prisma';
import RegisterForm from './RegisterForm';

export default async function RegisterPage() {
  const departments = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return <RegisterForm departments={departments} />;
}
