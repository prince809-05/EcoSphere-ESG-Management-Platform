import { z } from 'zod';
import { Role, ChallengeDifficulty, ChallengeStatus, ComplianceSeverity, ComplianceStatus, PolicyStatus, AuditStatus, CategoryType, RewardStatus } from '@prisma/client';

// Helper: Custom UUID string validator
const uuid = z.string().uuid('Invalid unique identifier format');

// --- AUTH VALIDATORS ---

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role).default(Role.EMPLOYEE),
  departmentId: uuid.nullable().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// --- ENVIRONMENTAL VALIDATORS ---

export const emissionFactorSchema = z.object({
  name: z.string().min(2, 'Factor name is required'),
  category: z.string().min(2, 'Category name is required'),
  factorValue: z.number().positive('Factor value must be greater than 0'),
  unit: z.string().min(1, 'Unit of measurement is required'),
});

export const carbonTransactionSchema = z.object({
  departmentId: uuid,
  type: z.enum(['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET']),
  quantity: z.number().nonnegative('Quantity cannot be negative'),
  manualCO2: z.number().nonnegative().optional(),
  emissionFactorId: uuid,
  date: z.string().default(() => new Date().toISOString()).transform((val) => new Date(val)),
  notes: z.string().optional().nullable(),
  autoCalculated: z.boolean().default(true),
});

export const environmentalGoalSchema = z.object({
  departmentId: uuid,
  name: z.string().min(2, 'Goal name is required'),
  targetCO2: z.number().positive('Target CO2 must be positive'),
  currentCO2: z.number().nonnegative().default(0),
  deadline: z.string().default(() => new Date().toISOString()).transform((val) => new Date(val)),
});

export const goalProgressSchema = z.object({
  currentCO2: z.number().nonnegative('Current CO2 cannot be negative'),
});

// --- SOCIAL VALIDATORS ---

export const csrActivitySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: uuid,
  pointsReward: z.number().int().nonnegative('Points reward must be positive'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  deadline: z.string().transform((val) => new Date(val)),
});

export const participationReviewSchema = z.object({
  participationId: uuid,
  status: z.enum(['APPROVED', 'REJECTED']),
  pointsOverride: z.number().int().nonnegative().optional().nullable(),
});

// --- GOVERNANCE VALIDATORS ---

export const policySchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  departmentId: uuid.nullable().optional(),
  status: z.nativeEnum(PolicyStatus).default(PolicyStatus.ACTIVE),
});

export const auditSchema = z.object({
  title: z.string().min(3, 'Audit title must be at least 3 characters'),
  departmentId: uuid,
  auditorId: uuid,
  date: z.string().transform((val) => new Date(val)),
  findings: z.string().optional().default('[]'),
});

export const completeAuditSchema = z.object({
  findings: z.array(z.object({
    finding: z.string().min(2, 'Finding text is required'),
    severity: z.nativeEnum(ComplianceSeverity),
    ownerId: uuid,
    dueDate: z.string().transform((val) => new Date(val)),
  })),
});

export const complianceIssueSchema = z.object({
  auditId: uuid,
  severity: z.nativeEnum(ComplianceSeverity),
  description: z.string().min(5, 'Description is required'),
  ownerId: uuid,
  dueDate: z.string().transform((val) => new Date(val)),
  status: z.nativeEnum(ComplianceStatus).default(ComplianceStatus.OPEN),
});

export const updateComplianceIssueSchema = z.object({
  severity: z.nativeEnum(ComplianceSeverity).optional(),
  description: z.string().min(5).optional(),
  ownerId: uuid.optional(),
  dueDate: z.string().transform((val) => new Date(val)).optional(),
  status: z.nativeEnum(ComplianceStatus).optional(),
  resolutionNotes: z.string().optional().nullable(),
});

export const resolveComplianceIssueSchema = z.object({
  resolutionNotes: z.string().min(5, 'Resolution notes must explain findings remedy'),
});

// --- GAMIFICATION VALIDATORS ---

export const challengeSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  categoryId: uuid,
  xpReward: z.number().int().nonnegative('XP reward must be positive'),
  difficulty: z.nativeEnum(ChallengeDifficulty).default(ChallengeDifficulty.MEDIUM),
  evidenceRequired: z.boolean().default(false),
  deadline: z.string().transform((val) => new Date(val)),
  status: z.nativeEnum(ChallengeStatus).default(ChallengeStatus.ACTIVE),
});

export const challengeStatusSchema = z.object({
  status: z.nativeEnum(ChallengeStatus),
});

export const challengeProgressSchema = z.object({
  progress: z.number().int().min(0).max(100, 'Progress must be between 0 and 100'),
  proofUrl: z.string().url('Proof must be a valid link URL').optional().or(z.literal('')),
});

export const reviewChallengeParticipationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  xpAwarded: z.number().int().nonnegative().optional().nullable(),
});

export const rewardSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(5, 'Description is required'),
  pointsRequired: z.number().int().positive('Points must be positive'),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
});

// --- SETTINGS VALIDATORS ---

export const esgConfigSchema = z.object({
  autoEmissionCalculation: z.boolean(),
  requireEvidenceForCSR: z.boolean(),
  autoAwardBadges: z.boolean(),
  emailNotifications: z.boolean(),
  envWeight: z.number().min(0).max(1),
  socialWeight: z.number().min(0).max(1),
  govWeight: z.number().min(0).max(1),
});

export const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export const categorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.nativeEnum(CategoryType),
});
