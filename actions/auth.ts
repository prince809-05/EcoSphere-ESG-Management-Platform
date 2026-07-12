'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { encrypt, logout } from '@/lib/auth';
import { Role } from '@prisma/client';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'AUDITOR']).default('EMPLOYEE'),
  departmentId: z.string().optional().nullable(),
});

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { error: 'Invalid email or password' };
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return { error: 'Invalid email or password' };
    }

    const sessionToken = await encrypt({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  } catch (error: any) {
    console.error('Login error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const roleStr = formData.get('role') as string || 'EMPLOYEE';
  const departmentId = formData.get('departmentId') as string || null;

  const validation = registerSchema.safeParse({
    name,
    email,
    password,
    role: roleStr,
    departmentId,
  });

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: 'A user with this email already exists' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: roleStr as Role,
        departmentId: departmentId || undefined,
        totalPoints: 0,
        totalXP: 0,
      },
    });

    // Update employee count in department if assigned
    if (departmentId) {
      await prisma.department.update({
        where: { id: departmentId },
        data: {
          employeeCount: {
            increment: 1,
          },
        },
      });
    }

    const sessionToken = await encrypt({
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      name: user.name,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return { success: true };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { error: 'An unexpected error occurred. Please try again.' };
  }
}

export async function logoutAction() {
  await logout();
  return { success: true };
}
