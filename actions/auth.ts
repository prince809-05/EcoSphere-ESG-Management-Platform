'use server';

import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { encrypt, getSession, requireRole } from '@/lib/auth';
import { loginSchema, registerSchema } from '@/lib/validators';
import { ApiResponse } from '@/types/api';
import { Role } from '@prisma/client';
import { z } from 'zod';

// --- MAIN SERVER ACTIONS ---

export async function login(input: unknown): Promise<ApiResponse<any>> {
  try {
    const data = loginSchema.parse(input);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password', code: 'AUTH_003' };
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      return { success: false, error: 'Invalid email or password', code: 'AUTH_003' };
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

    const { passwordHash, ...safeUser } = user;
    return { success: true, data: safeUser };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[login]', error);
    return { success: false, error: 'Failed to authenticate user', code: 'SRV_001' };
  }
}

export async function register(input: unknown): Promise<ApiResponse<any>> {
  try {
    const data = registerSchema.parse(input);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return { success: false, error: 'A user with this email already exists', code: 'AUTH_004' };
    }

    // Secure password hashing with saltRounds: 12
    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role as Role,
          departmentId: data.departmentId || undefined,
          totalPoints: 0,
          totalXP: 0,
        },
      });

      // Update employee count in department if assigned
      if (data.departmentId) {
        await tx.department.update({
          where: { id: data.departmentId },
          data: {
            employeeCount: {
              increment: 1,
            },
          },
        });
      }

      return createdUser;
    });

    const sessionToken = await encrypt({
      userId: result.id,
      email: result.email,
      role: result.role,
      departmentId: result.departmentId,
      name: result.name,
    });

    const cookieStore = await cookies();
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    const { passwordHash: _, ...safeUser } = result;
    return { success: true, data: safeUser };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[register]', error);
    return { success: false, error: 'Failed to register user', code: 'SRV_001' };
  }
}

export async function logout(): Promise<ApiResponse<null>> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return { success: true, data: null };
  } catch (error: any) {
    console.error('[logout]', error);
    return { success: false, error: 'Failed to delete session', code: 'SRV_001' };
  }
}

// --- FORWARD COMPATIBILITY WRAPPERS FOR FORMS ---

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const res = await login({ email, password });
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true };
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const roleStr = formData.get('role') as string || 'EMPLOYEE';
  const departmentId = formData.get('departmentId') as string || null;

  const res = await register({
    name,
    email,
    password,
    role: roleStr,
    departmentId: departmentId || undefined,
  });

  if (!res.success) {
    return { error: res.error };
  }
  return { success: true };
}

export async function logoutAction() {
  const res = await logout();
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true };
}
