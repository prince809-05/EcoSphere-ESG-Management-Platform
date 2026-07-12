'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession, requireRole } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { generateCarbonSuggestions } from '@/lib/ai/carbon';
import { ApiResponse } from '@/types/api';
import { 
  emissionFactorSchema, 
  carbonTransactionSchema, 
  environmentalGoalSchema, 
  goalProgressSchema 
} from '@/lib/validators';
import { CarbonTransactionType, GoalStatus } from '@prisma/client';

const uuidSchema = z.string().uuid('Invalid ID format');

// --- EMISSION FACTORS ---

export async function createEmissionFactor(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    
    // ADMIN only
    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = emissionFactorSchema.parse(input);

    const ef = await prisma.emissionFactor.create({
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        factorValue: data.factorValue,
        source: 'EcoSphere Database',
        status: 'ACTIVE',
      },
    });

    revalidatePath('/environmental');
    return { success: true, data: ef };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createEmissionFactor]', error);
    return { success: false, error: 'Failed to create emission factor', code: 'SRV_001' };
  }
}

export async function updateEmissionFactor(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    
    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);
    const data = emissionFactorSchema.parse(input);

    const ef = await prisma.emissionFactor.update({
      where: { id: validatedId },
      data: {
        name: data.name,
        category: data.category,
        unit: data.unit,
        factorValue: data.factorValue,
      },
    });

    revalidatePath('/environmental');
    return { success: true, data: ef };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateEmissionFactor]', error);
    return { success: false, error: 'Failed to update emission factor', code: 'SRV_001' };
  }
}

export async function deleteEmissionFactor(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    
    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    await prisma.emissionFactor.update({
      where: { id: validatedId },
      data: { status: 'INACTIVE' },
    });

    revalidatePath('/environmental');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[deleteEmissionFactor]', error);
    return { success: false, error: 'Failed to delete emission factor', code: 'SRV_001' };
  }
}

export async function listEmissionFactors(): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const factors = await prisma.emissionFactor.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    const serialized = factors.map(f => ({
      ...f,
      factorValue: Number(f.factorValue),
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listEmissionFactors]', error);
    return { success: false, error: 'Failed to list emission factors', code: 'SRV_001' };
  }
}

// --- CARBON TRANSACTIONS ---

export async function createCarbonTransaction(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const data = carbonTransactionSchema.parse(input);

    // Enforce MANAGER/ADMIN restrictions
    if (session.role === 'EMPLOYEE' || session.role === 'AUDITOR') {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }
    if (session.role === 'MANAGER' && session.departmentId !== data.departmentId) {
      return { success: false, error: 'Forbidden: Cannot log carbon transactions for other departments', code: 'AUTH_002' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const ef = await tx.emissionFactor.findUnique({
        where: { id: data.emissionFactorId },
      });
      if (!ef) {
        throw new Error('Emission factor not found');
      }

      let calculatedCO2 = 0;
      if (data.autoCalculated) {
        calculatedCO2 = data.quantity * Number(ef.factorValue);
      } else {
        calculatedCO2 = data.manualCO2 || 0;
      }

      const createdTx = await tx.carbonTransaction.create({
        data: {
          type: data.type as CarbonTransactionType,
          quantity: data.quantity,
          emissionFactorId: data.emissionFactorId,
          calculatedCO2: calculatedCO2,
          departmentId: data.departmentId,
          autoCalculated: data.autoCalculated,
          createdAt: data.date,
        },
      });

      return { createdTx, deptId: data.departmentId };
    });

    // Auto recalculate scoring
    await recalculateDepartmentScore(result.deptId);

    revalidatePath('/environmental');
    revalidatePath('/');
    return { success: true, data: result.createdTx };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createCarbonTransaction]', error);
    return { success: false, error: error.message || 'Failed to log carbon transaction', code: 'SRV_001' };
  }
}

export async function updateCarbonTransaction(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedId = uuidSchema.parse(id);
    const data = carbonTransactionSchema.parse(input);

    if (session.role === 'EMPLOYEE' || session.role === 'AUDITOR') {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }
    if (session.role === 'MANAGER' && session.departmentId !== data.departmentId) {
      return { success: false, error: 'Forbidden: Cannot edit transactions for other departments', code: 'AUTH_002' };
    }

    const tx = await prisma.carbonTransaction.findUnique({
      where: { id: validatedId },
    });
    if (!tx) {
      return { success: false, error: 'Transaction not found', code: 'TX_001' };
    }

    const result = await prisma.$transaction(async (txDb) => {
      const ef = await txDb.emissionFactor.findUnique({
        where: { id: data.emissionFactorId },
      });
      if (!ef) throw new Error('Emission factor not found');

      let calculatedCO2 = 0;
      if (data.autoCalculated) {
        calculatedCO2 = data.quantity * Number(ef.factorValue);
      } else {
        calculatedCO2 = data.manualCO2 || 0;
      }

      const updated = await txDb.carbonTransaction.update({
        where: { id: validatedId },
        data: {
          type: data.type as CarbonTransactionType,
          quantity: data.quantity,
          emissionFactorId: data.emissionFactorId,
          calculatedCO2: calculatedCO2,
          departmentId: data.departmentId,
          autoCalculated: data.autoCalculated,
        },
      });

      return updated;
    });

    await recalculateDepartmentScore(data.departmentId);

    revalidatePath('/environmental');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateCarbonTransaction]', error);
    return { success: false, error: error.message || 'Failed to update transaction', code: 'SRV_001' };
  }
}

export async function deleteCarbonTransaction(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    // ADMIN only
    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin role required', code: 'AUTH_002' };
    }

    const validatedId = uuidSchema.parse(id);

    const tx = await prisma.carbonTransaction.findUnique({
      where: { id: validatedId },
    });
    if (!tx) {
      return { success: false, error: 'Transaction not found', code: 'TX_001' };
    }

    await prisma.carbonTransaction.delete({
      where: { id: validatedId },
    });

    await recalculateDepartmentScore(tx.departmentId);

    revalidatePath('/environmental');
    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid ID: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[deleteCarbonTransaction]', error);
    return { success: false, error: 'Failed to delete carbon transaction', code: 'SRV_001' };
  }
}

export async function listCarbonTransactions(filters: {
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: CarbonTransactionType;
}): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};

    // Enforce role department checks
    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) {
        return { success: true, data: [] }; // unassigned employees see nothing
      }
      queryWhere.departmentId = session.departmentId;
    } else if (filters.departmentId) {
      queryWhere.departmentId = filters.departmentId;
    }

    if (filters.type) {
      queryWhere.type = filters.type;
    }

    if (filters.dateFrom || filters.dateTo) {
      queryWhere.createdAt = {};
      if (filters.dateFrom) queryWhere.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) queryWhere.createdAt.lte = new Date(filters.dateTo);
    }

    const txs = await prisma.carbonTransaction.findMany({
      where: queryWhere,
      include: {
        department: true,
        emissionFactor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized = txs.map(t => ({
      ...t,
      quantity: Number(t.quantity),
      calculatedCO2: Number(t.calculatedCO2),
      emissionFactor: {
        ...t.emissionFactor,
        factorValue: Number(t.emissionFactor.factorValue),
      },
    }));

    return { success: true, data: serialized };
  } catch (error: any) {
    console.error('[listCarbonTransactions]', error);
    return { success: false, error: 'Failed to list transactions', code: 'SRV_001' };
  }
}

// --- ENVIRONMENTAL GOALS ---

export async function createEnvironmentalGoal(input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    // ADMIN only
    if (session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Admin access required', code: 'AUTH_002' };
    }

    const data = environmentalGoalSchema.parse(input);

    const goal = await prisma.environmentalGoal.create({
      data: {
        name: data.name,
        targetCO2: data.targetCO2,
        currentCO2: data.currentCO2,
        departmentId: data.departmentId,
        deadline: data.deadline,
        status: GoalStatus.ACTIVE,
      },
    });

    revalidatePath('/environmental');
    return { success: true, data: goal };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[createEnvironmentalGoal]', error);
    return { success: false, error: 'Failed to create environmental goal', code: 'SRV_001' };
  }
}

export async function updateGoalProgress(id: string, input: unknown): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const validatedId = uuidSchema.parse(id);
    const data = goalProgressSchema.parse(input);

    const goal = await prisma.environmentalGoal.findUnique({
      where: { id: validatedId },
    });

    if (!goal) {
      return { success: false, error: 'Goal not found', code: 'GOL_001' };
    }

    if (session.role === 'EMPLOYEE' || session.role === 'AUDITOR') {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }
    if (session.role === 'MANAGER' && session.departmentId !== goal.departmentId) {
      return { success: false, error: 'Forbidden: Cannot edit goals of other departments', code: 'AUTH_002' };
    }

    // Determine status (Achieved if currentCO2 <= targetCO2)
    const isAchieved = Number(data.currentCO2) <= Number(goal.targetCO2);
    const status = isAchieved ? GoalStatus.ACHIEVED : GoalStatus.ACTIVE;

    const updated = await prisma.environmentalGoal.update({
      where: { id: validatedId },
      data: {
        currentCO2: data.currentCO2,
        status,
      },
    });

    revalidatePath('/environmental');
    return { success: true, data: updated };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[updateGoalProgress]', error);
    return { success: false, error: 'Failed to update goal progress', code: 'SRV_001' };
  }
}

export async function getEnvironmentalMetrics(departmentId?: string): Promise<ApiResponse<any>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized', code: 'AUTH_001' };

    const queryWhere: any = {};
    if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') {
      if (!session.departmentId) {
        return { success: true, data: { totalCO2ThisMonth: 0, totalCO2LastMonth: 0, percentChange: 0, activeGoalsCount: 0, completedGoalsCount: 0 } };
      }
      queryWhere.departmentId = session.departmentId;
    } else if (departmentId) {
      queryWhere.departmentId = departmentId;
    }

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Fetch this month transactions
    const thisMonthTxs = await prisma.carbonTransaction.findMany({
      where: {
        ...queryWhere,
        createdAt: { gte: startOfThisMonth },
      },
    });
    const totalCO2ThisMonth = thisMonthTxs.reduce((acc, c) => acc + Number(c.calculatedCO2), 0);

    // Fetch last month transactions
    const lastMonthTxs = await prisma.carbonTransaction.findMany({
      where: {
        ...queryWhere,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    });
    const totalCO2LastMonth = lastMonthTxs.reduce((acc, c) => acc + Number(c.calculatedCO2), 0);

    let percentChange = 0;
    if (totalCO2LastMonth > 0) {
      percentChange = ((totalCO2ThisMonth - totalCO2LastMonth) / totalCO2LastMonth) * 100;
    }

    const activeGoalsCount = await prisma.environmentalGoal.count({
      where: {
        ...queryWhere,
        status: GoalStatus.ACTIVE,
      },
    });

    const completedGoalsCount = await prisma.environmentalGoal.count({
      where: {
        ...queryWhere,
        status: GoalStatus.ACHIEVED,
      },
    });

    return {
      success: true,
      data: {
        totalCO2ThisMonth,
        totalCO2LastMonth,
        percentChange,
        activeGoalsCount,
        completedGoalsCount,
      },
    };
  } catch (error: any) {
    console.error('[getEnvironmentalMetrics]', error);
    return { success: false, error: 'Failed to calculate environmental metrics', code: 'SRV_001' };
  }
}

// --- FORWARD COMPATIBILITY HELPER ---

export async function getAISuggestionsAction(departmentId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const last10Txs = await prisma.carbonTransaction.findMany({
      where: { departmentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        emissionFactor: true,
      },
    });

    // Cast properties
    const formatted = last10Txs.map(t => ({
      ...t,
      quantity: Number(t.quantity),
      calculatedCO2: Number(t.calculatedCO2),
      emissionFactor: {
        name: t.emissionFactor.name,
        unit: t.emissionFactor.unit,
      },
    }));

    const suggestions = await generateCarbonSuggestions(formatted);
    return { suggestions };
  } catch (error: any) {
    return { error: 'Failed to load suggestions' };
  }
}

export async function createEmissionFactorAction(data: any) {
  const res = await createEmissionFactor(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function updateEmissionFactorAction(id: string, data: any) {
  const res = await updateEmissionFactor(id, data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function deleteEmissionFactorAction(id: string) {
  const res = await deleteEmissionFactor(id);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function createCarbonTransactionAction(data: any) {
  const res = await createCarbonTransaction(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function deleteCarbonTransactionAction(id: string, departmentId: string) {
  const res = await deleteCarbonTransaction(id);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function createEnvironmentalGoalAction(data: any) {
  const res = await createEnvironmentalGoal(data);
  if (!res.success) return { error: res.error };
  return { success: true, data: res.data };
}

export async function updateEnvironmentalGoalAction(id: string, data: any) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return { error: 'Forbidden' };
    }

    const updated = await prisma.environmentalGoal.update({
      where: { id },
      data: {
        name: data.name,
        targetCO2: data.targetCO2,
        currentCO2: data.currentCO2,
        deadline: new Date(data.deadline),
        status: data.status,
      },
    });

    revalidatePath('/environmental');
    return { success: true, data: updated };
  } catch (error: any) {
    return { error: 'Failed to update goal' };
  }
}

export async function deleteEnvironmentalGoalAction(id: string, departmentId: string) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
      return { error: 'Forbidden' };
    }

    await prisma.environmentalGoal.delete({
      where: { id },
    });

    revalidatePath('/environmental');
    return { success: true };
  } catch (error: any) {
    return { error: 'Failed to delete goal' };
  }
}

