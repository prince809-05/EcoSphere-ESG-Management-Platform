'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { DepartmentStatus, CategoryType } from '@prisma/client';

const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['CSR_ACTIVITY', 'CHALLENGE']),
});

// --- GLOBAL SETTINGS ---

export async function getSettingsAction() {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });
    return { success: true, settings };
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return { error: 'Failed to fetch settings' };
  }
}

export async function updateSettingsAction(config: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  try {
    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { config },
      create: { id: 1, config },
    });
    revalidatePath('/');
    revalidatePath('/environmental');
    revalidatePath('/settings');
    return { success: true, settings };
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return { error: 'Failed to update settings' };
  }
}

// --- DEPARTMENTS CRUD ---

export async function createDepartmentAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  const validation = departmentSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const dept = await prisma.department.create({
      data: {
        name: validation.data.name,
        code: validation.data.code,
        status: validation.data.status as DepartmentStatus,
        employeeCount: 0,
      },
    });
    revalidatePath('/settings');
    return { success: true, data: dept };
  } catch (error: any) {
    console.error('Error creating department:', error);
    return { error: 'Failed to create department' };
  }
}

export async function updateDepartmentAction(id: string, data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  const validation = departmentSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const dept = await prisma.department.update({
      where: { id },
      data: {
        name: validation.data.name,
        code: validation.data.code,
        status: validation.data.status as DepartmentStatus,
      },
    });
    revalidatePath('/settings');
    return { success: true, data: dept };
  } catch (error: any) {
    console.error('Error updating department:', error);
    return { error: 'Failed to update department' };
  }
}

export async function deleteDepartmentAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  try {
    await prisma.department.delete({
      where: { id },
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting department:', error);
    return { error: 'Failed to delete department. Note: Cannot delete department with active dependencies.' };
  }
}

// --- CATEGORIES CRUD ---

export async function createCategoryAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  const validation = categorySchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const cat = await prisma.category.create({
      data: {
        name: validation.data.name,
        type: validation.data.type as CategoryType,
        status: 'ACTIVE',
      },
    });
    revalidatePath('/settings');
    return { success: true, data: cat };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { error: 'Failed to create category' };
  }
}

export async function deleteCategoryAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden' };
  }

  try {
    await prisma.category.delete({
      where: { id },
    });
    revalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return { error: 'Failed to delete category. Ensure no CSR activities or challenges are linked to it.' };
  }
}
