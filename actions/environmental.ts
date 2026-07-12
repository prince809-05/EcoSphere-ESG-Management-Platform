'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { recalculateDepartmentScore } from '@/lib/esgEngine';
import { generateAIContent } from '@/lib/ai';
import { CarbonTransactionType, GoalStatus } from '@prisma/client';

const emissionFactorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  unit: z.string().min(1, 'Unit is required'),
  factorValue: z.number().positive('Factor value must be positive'),
  source: z.string().min(2, 'Source is required'),
});

const carbonTransactionSchema = z.object({
  type: z.enum(['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET']),
  quantity: z.number().positive('Quantity must be positive'),
  emissionFactorId: z.string().uuid('Invalid emission factor ID'),
  departmentId: z.string().uuid('Invalid department ID'),
  autoCalculated: z.boolean().default(true),
  manualCO2: z.number().optional(),
});

const goalSchema = z.object({
  name: z.string().min(2, 'Goal name must be at least 2 characters'),
  targetCO2: z.number().nonnegative('Target must be positive'),
  currentCO2: z.number().nonnegative('Current progress must be positive'),
  departmentId: z.string().uuid('Invalid department ID'),
  deadline: z.string().transform((str) => new Date(str)),
  status: z.enum(['ACTIVE', 'ACHIEVED', 'EXPIRED']).default('ACTIVE'),
});

// --- EMISSION FACTORS ---

export async function createEmissionFactorAction(data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  const validation = emissionFactorSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const ef = await prisma.emissionFactor.create({
      data: {
        name: validation.data.name,
        category: validation.data.category,
        unit: validation.data.unit,
        factorValue: validation.data.factorValue,
        source: validation.data.source,
        status: 'ACTIVE',
      },
    });
    revalidatePath('/environmental');
    return { success: true, data: ef };
  } catch (error: any) {
    console.error('Error creating emission factor:', error);
    return { error: 'Failed to create emission factor' };
  }
}

export async function updateEmissionFactorAction(id: string, data: any) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  const validation = emissionFactorSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const ef = await prisma.emissionFactor.update({
      where: { id },
      data: {
        name: validation.data.name,
        category: validation.data.category,
        unit: validation.data.unit,
        factorValue: validation.data.factorValue,
        source: validation.data.source,
      },
    });
    revalidatePath('/environmental');
    return { success: true, data: ef };
  } catch (error: any) {
    console.error('Error updating emission factor:', error);
    return { error: 'Failed to update emission factor' };
  }
}

export async function deleteEmissionFactorAction(id: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Forbidden: Admin access required' };
  }

  try {
    await prisma.emissionFactor.update({
      where: { id },
      data: { status: 'INACTIVE' }, // Soft delete
    });
    revalidatePath('/environmental');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting emission factor:', error);
    return { error: 'Failed to delete emission factor' };
  }
}

// --- CARBON TRANSACTIONS ---

export async function createCarbonTransactionAction(data: any) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  // Validate manager has access to their own department, admins have full access
  if (session.role === 'EMPLOYEE' || session.role === 'AUDITOR') {
    return { error: 'Forbidden: Insufficient privileges' };
  }

  if (session.role === 'MANAGER' && session.departmentId !== data.departmentId) {
    return { error: 'Forbidden: You can only log carbon transactions for your own department' };
  }

  const validation = carbonTransactionSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const ef = await prisma.emissionFactor.findUnique({
      where: { id: validation.data.emissionFactorId },
    });

    if (!ef) {
      return { error: 'Emission factor not found' };
    }

    let calculatedCO2 = 0;
    if (validation.data.autoCalculated) {
      calculatedCO2 = Number(validation.data.quantity) * Number(ef.factorValue);
    } else {
      calculatedCO2 = Number(validation.data.manualCO2 || 0);
    }

    const tx = await prisma.carbonTransaction.create({
      data: {
        type: validation.data.type as CarbonTransactionType,
        quantity: validation.data.quantity,
        emissionFactorId: validation.data.emissionFactorId,
        calculatedCO2: calculatedCO2,
        departmentId: validation.data.departmentId,
        autoCalculated: validation.data.autoCalculated,
      },
    });

    // Automatically recalculate scores
    await recalculateDepartmentScore(validation.data.departmentId);

    revalidatePath('/environmental');
    revalidatePath('/');
    return { success: true, data: tx };
  } catch (error: any) {
    console.error('Error creating carbon transaction:', error);
    return { error: 'Failed to log carbon transaction' };
  }
}

export async function deleteCarbonTransactionAction(id: string, departmentId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden' };
  }

  if (session.role === 'MANAGER' && session.departmentId !== departmentId) {
    return { error: 'Forbidden: You cannot modify other departments data' };
  }

  try {
    await prisma.carbonTransaction.delete({
      where: { id },
    });

    // Recalculate scores
    await recalculateDepartmentScore(departmentId);

    revalidatePath('/environmental');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting carbon transaction:', error);
    return { error: 'Failed to delete transaction' };
  }
}

// --- ENVIRONMENTAL GOALS ---

export async function createEnvironmentalGoalAction(data: any) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden' };
  }

  if (session.role === 'MANAGER' && session.departmentId !== data.departmentId) {
    return { error: 'Forbidden: You can only set goals for your own department' };
  }

  const validation = goalSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const goal = await prisma.environmentalGoal.create({
      data: {
        name: validation.data.name,
        targetCO2: validation.data.targetCO2,
        currentCO2: validation.data.currentCO2,
        departmentId: validation.data.departmentId,
        deadline: validation.data.deadline,
        status: validation.data.status as GoalStatus,
      },
    });
    revalidatePath('/environmental');
    return { success: true, data: goal };
  } catch (error: any) {
    console.error('Error creating environmental goal:', error);
    return { error: 'Failed to set environmental goal' };
  }
}

export async function updateEnvironmentalGoalAction(id: string, data: any) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden' };
  }

  if (session.role === 'MANAGER' && session.departmentId !== data.departmentId) {
    return { error: 'Forbidden' };
  }

  const validation = goalSchema.safeParse(data);
  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    const goal = await prisma.environmentalGoal.update({
      where: { id },
      data: {
        name: validation.data.name,
        targetCO2: validation.data.targetCO2,
        currentCO2: validation.data.currentCO2,
        deadline: validation.data.deadline,
        status: validation.data.status as GoalStatus,
      },
    });
    revalidatePath('/environmental');
    return { success: true, data: goal };
  } catch (error: any) {
    console.error('Error updating environmental goal:', error);
    return { error: 'Failed to update environmental goal' };
  }
}

export async function deleteEnvironmentalGoalAction(id: string, departmentId: string) {
  const session = await getSession();
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { error: 'Forbidden' };
  }

  if (session.role === 'MANAGER' && session.departmentId !== departmentId) {
    return { error: 'Forbidden' };
  }

  try {
    await prisma.environmentalGoal.delete({
      where: { id },
    });
    revalidatePath('/environmental');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    return { error: 'Failed to delete goal' };
  }
}

// --- AI SUGGESTIONS ---

export async function getAISuggestionsAction(departmentId: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) return { error: 'Department not found' };

    const last10Txs = await prisma.carbonTransaction.findMany({
      where: { departmentId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        emissionFactor: true,
      },
    });

    if (last10Txs.length === 0) {
      return {
        suggestions: 'No carbon transactions logged for this department yet. Please add carbon data to get personalized AI suggestions.',
      };
    }

    const txString = last10Txs
      .map(
        (t) =>
          `- ${t.type} transaction: logged ${t.quantity} ${t.emissionFactor.unit} of ${t.emissionFactor.name}, resulting in ${t.calculatedCO2} tons of CO2.`
      )
      .join('\n');

    const prompt = `You are EcoSphere AI, an expert sustainability and carbon management consultant. 
Analyze the following recent carbon transactions logged by the ${department.name} department:

${txString}

Provide exactly 3 specific, actionable recommendations to reduce these emissions in this specific department. 
Focus on low-cost, high-impact operational changes. Keep each recommendation to 1-2 clear sentences. 
Format as a neat, clean markdown list. Do not write any conversational preamble or sign-off.`;

    const suggestions = await generateAIContent(prompt);

    return { suggestions };
  } catch (error: any) {
    console.error('Error generating AI carbon suggestions:', error);
    return { error: 'Failed to generate AI carbon suggestions. Please check if your API keys are configured.' };
  }
}
