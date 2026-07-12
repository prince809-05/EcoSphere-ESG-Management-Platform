'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { ApiResponse } from '@/types/api';
import { revalidatePath } from 'next/cache';

const departmentIdSchema = z.string().uuid('Invalid department ID format');

export async function recalculateDepartmentScoreAction(departmentId: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized: Session missing', code: 'AUTH_001' };
    }

    // Admins, Auditors, and Managers of the same department can trigger recalculations
    const isAdminOrAuditor = session.role === 'ADMIN' || session.role === 'AUDITOR';
    const isManagerOfDept = session.role === 'MANAGER' && session.departmentId === departmentId;

    if (!isAdminOrAuditor && !isManagerOfDept) {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    const validatedDeptId = departmentIdSchema.parse(departmentId);

    // Call lib/esgEngine.ts routine
    await recalculateDepartmentScore(validatedDeptId);

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[recalculateDepartmentScoreAction]', error);
    return { success: false, error: 'Failed to recalculate department score.', code: 'SRV_001' };
  }
}

export async function recalculateAllScoresAction(): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized: Session missing', code: 'AUTH_001' };
    }

    // Only Admin and Auditor can trigger full system recalculations
    if (session.role !== 'ADMIN' && session.role !== 'AUDITOR') {
      return { success: false, error: 'Forbidden: Admin or Auditor role required', code: 'AUTH_002' };
    }

    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    // Run sequentially to avoid database deadlock during massive upserts
    for (const dept of departments) {
      await recalculateDepartmentScore(dept.id);
    }

    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, data: null };
  } catch (error: any) {
    console.error('[recalculateAllScoresAction]', error);
    return { success: false, error: 'Failed to recalculate all scores.', code: 'SRV_001' };
  }
}
