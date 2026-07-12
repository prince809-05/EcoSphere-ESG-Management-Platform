'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ApiResponse } from '@/types/api';
import { esgConfigSchema, departmentSchema, categorySchema } from '@/lib/validators';
import { DepartmentStatus, CategoryType } from '@prisma/client';
import { recalculateDepartmentScore } from '@/lib/esgEngine';

const uuidSchema = z.string().uuid('Invalid ID format');

// --- ESG CONFIGS ---

export async function getESGConfig(): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });

    const config = settings?.config || {
      autoEmissionCalculation: true,
      requireEvidenceForCSR: true,
      autoAwardBadges: true,
      emailNotifications: true,
      envWeight: 0.4,
      socialWeight: 0.3,
      govWeight: 0.3,
    };

    return { success: true, data: config };
  } catch (error: any) {
    console.error('[getESGConfig]', error);
    return { success: false, error: 'Failed to retrieve ESG configuration settings', code: 'SRV_001' };
  }
}

export async function updateESGConfig(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const data = esgConfigSchema.parse(input);

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: { config: data as any },
      create: { id: 1, config: data as any },
    });

    const departments = await prisma.department.findMany({ select: { id: true } });
    await Promise.all(departments.map((department) => recalculateDepartmentScore(department.id)));

    revalidatePath('/');
    revalidatePath('/environmental');
    revalidatePath('/settings');
    return { success: true, data: settings.config };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateESGConfig]', error);
    return { success: false, error: 'Failed to update ESG configuration', code: 'SRV_001' };
  }
}

// --- DEPARTMENTS CRUD ---

export async function createDepartment(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const data = departmentSchema.parse(input);

    const dept = await prisma.department.create({
      data: {
        name: data.name,
        code: data.code,
        status: data.status as DepartmentStatus,
        employeeCount: 0,
      },
    });

    revalidatePath('/settings');
    return { success: true, data: dept };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createDepartment]', error);
    return { success: false, error: 'Failed to create department', code: 'SRV_001' };
  }
}

export async function updateDepartment(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = departmentSchema.parse(input);

    const dept = await prisma.department.update({
      where: { id: validatedId },
      data: {
        name: data.name,
        code: data.code,
        status: data.status as DepartmentStatus,
      },
    });

    revalidatePath('/settings');
    return { success: true, data: dept };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateDepartment]', error);
    return { success: false, error: 'Failed to update department details', code: 'SRV_001' };
  }
}

export async function deleteDepartment(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    // Enforce dependency constraints (cannot delete department with active employees or audits)
    const employeesCount = await prisma.user.count({ where: { departmentId: validatedId } });
    if (employeesCount > 0) {
      return { success: false, error: 'Cannot delete department. Active employees are assigned to it.', code: 'DEP_001' };
    }

    await prisma.department.delete({
      where: { id: validatedId },
    });

    revalidatePath('/settings');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[deleteDepartment]', error);
    return { success: false, error: 'Failed to delete department', code: 'SRV_001' };
  }
}

export async function listDepartments(): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const list = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });

    const serialized = list.map(d => ({
      ...d,
      envScore: Number(d.envScore),
      socialScore: Number(d.socialScore),
      govScore: Number(d.govScore),
      totalScore: Number(d.totalScore),
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listDepartments]', error);
    return { success: false, error: 'Failed to list departments', code: 'SRV_001' };
  }
}

// --- CATEGORIES CRUD ---

export async function createCategory(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const data = categorySchema.parse(input);

    const cat = await prisma.category.create({
      data: {
        name: data.name,
        type: data.type as CategoryType,
        status: 'ACTIVE',
      },
    });

    revalidatePath('/settings');
    return { success: true, data: cat };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createCategory]', error);
    return { success: false, error: 'Failed to create category', code: 'SRV_001' };
  }
}

export async function updateCategory(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = categorySchema.parse(input);

    const cat = await prisma.category.update({
      where: { id: validatedId },
      data: {
        name: data.name,
        type: data.type as CategoryType,
      },
    });

    revalidatePath('/settings');
    return { success: true, data: cat };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateCategory]', error);
    return { success: false, error: 'Failed to update category details', code: 'SRV_001' };
  }
}

export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    // Enforce dependency constraints (cannot delete category with active dependencies)
    const linkedChallengesCount = await prisma.challenge.count({ where: { categoryId: validatedId } });
    const linkedCSRActivitiesCount = await prisma.cSRActivity.count({ where: { categoryId: validatedId } });

    if (linkedChallengesCount > 0 || linkedCSRActivitiesCount > 0) {
      return { success: false, error: 'Cannot delete category. Challenges or CSR activities are linked to it.', code: 'CAT_001' };
    }

    await prisma.category.delete({
      where: { id: validatedId },
    });

    revalidatePath('/settings');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[deleteCategory]', error);
    return { success: false, error: 'Failed to delete category', code: 'SRV_001' };
  }
}

export async function listCategories(type?: CategoryType): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = { status: 'ACTIVE' };
    if (type) {
      queryWhere.type = type;
    }

    const list = await prisma.category.findMany({
      where: queryWhere,
      orderBy: { name: 'asc' },
    });

    return { success: true, data: list };
  } catch (error: any) {
    console.error('[listCategories]', error);
    return { success: false, error: 'Failed to list categories', code: 'SRV_001' };
  }
}

// --- BACKWARD COMPATIBILITY WRAPPERS FOR SETTINGS CLIENT ---

export async function getSettingsAction() {
  const res = await getESGConfig();
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true, settings: { config: res.data } };
}

export async function updateSettingsAction(config: any) {
  const normalizedConfig = {
    autoEmissionCalculation: Boolean(config.autoEmissionCalculation),
    requireEvidenceForCSR: Boolean(config.requireEvidenceForCSR),
    autoAwardBadges: Boolean(config.autoAwardBadges),
    emailNotifications: Boolean(config.emailNotifications),
    envWeight: Number(config.envWeight ?? config.weights?.env ?? 0.4),
    socialWeight: Number(config.socialWeight ?? config.weights?.social ?? 0.3),
    govWeight: Number(config.govWeight ?? config.weights?.gov ?? 0.3),
  };

  const res = await updateESGConfig(normalizedConfig);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true, settings: { config: res.data } };
}

export async function createDepartmentAction(data: any) {
  const res = await createDepartment(data);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true, data: res.data };
}

export async function updateDepartmentAction(id: string, data: any) {
  const res = await updateDepartment(id, data);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true, data: res.data };
}

export async function deleteDepartmentAction(id: string) {
  const res = await deleteDepartment(id);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true };
}

export async function createCategoryAction(data: any) {
  const res = await createCategory(data);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true, data: res.data };
}

export async function deleteCategoryAction(id: string) {
  const res = await deleteCategory(id);
  if (!res.success) {
    return { error: res.error };
  }
  return { success: true };
}
