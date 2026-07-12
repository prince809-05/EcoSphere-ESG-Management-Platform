import { prisma } from './prisma';

export async function recalculateDepartmentScore(departmentId: string) {
  try {
    // 1. Fetch Department & Settings
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        employees: true,
      },
    });

    if (!department) {
      console.warn(`Department with ID ${departmentId} not found.`);
      return;
    }

    const settings = await prisma.settings.findUnique({
      where: { id: 1 },
    });

    const config = (settings?.config as any) || {
      weights: { env: 0.4, social: 0.3, gov: 0.3 }
    };
    
    const weights = config.weights || { env: 0.4, social: 0.3, gov: 0.3 };

    // 2. ENVIRONMENTAL SCORE
    // Formula: 100 - (Total CO2 emissions in tons * 0.5)
    // Fetch all carbon transactions in this department
    const carbonTransactions = await prisma.carbonTransaction.findMany({
      where: { departmentId },
    });
    const totalCO2 = carbonTransactions.reduce((acc, curr) => acc + Number(curr.calculatedCO2), 0);
    const envScore = Math.max(0, Math.min(100, 100 - totalCO2 * 0.5));

    // 3. SOCIAL SCORE
    // Formula: 60 + (Approved CSR Activities * 15) + (Approved Challenges * 10)
    // Clamp between 0 and 100.
    const approvedCSRCount = await prisma.employeeParticipation.count({
      where: {
        employee: { departmentId },
        approvalStatus: 'APPROVED',
      },
    });

    const approvedChallengesCount = await prisma.challengeParticipation.count({
      where: {
        employee: { departmentId },
        approvalStatus: 'APPROVED',
      },
    });

    const socialScore = Math.max(0, Math.min(100, 60 + approvedCSRCount * 15 + approvedChallengesCount * 10));

    // 4. GOVERNANCE SCORE
    // Formula: 100 - (Open Compliance Issues * 15) - (Overdue Compliance Issues * 10)
    // Fetch all compliance issues from audits of this department
    const audits = await prisma.audit.findMany({
      where: { departmentId },
      select: { id: true },
    });
    const auditIds = audits.map((a) => a.id);

    const openIssues = await prisma.complianceIssue.count({
      where: {
        auditId: { in: auditIds },
        status: 'OPEN',
      },
    });

    // Check overdue
    const now = new Date();
    const overdueIssues = await prisma.complianceIssue.count({
      where: {
        auditId: { in: auditIds },
        status: 'OPEN',
        dueDate: { lt: now },
      },
    });

    const govScore = Math.max(0, Math.min(100, 100 - openIssues * 15 - overdueIssues * 10));

    // 5. WEIGHTED TOTAL SCORE
    const totalScore = envScore * Number(weights.env) + socialScore * Number(weights.social) + govScore * Number(weights.gov);

    const period = now.toISOString().slice(0, 7); // YYYY-MM

    // 6. Save DepartmentScore History
    // Check if score for this period already exists, if so update it, else create
    const existingScore = await prisma.departmentScore.findFirst({
      where: {
        departmentId,
        period,
      },
    });

    if (existingScore) {
      await prisma.departmentScore.update({
        where: { id: existingScore.id },
        data: {
          environmentalScore: envScore,
          socialScore: socialScore,
          governanceScore: govScore,
          totalScore: totalScore,
          calculatedAt: now,
        },
      });
    } else {
      await prisma.departmentScore.create({
        data: {
          departmentId,
          environmentalScore: envScore,
          socialScore: socialScore,
          governanceScore: govScore,
          totalScore: totalScore,
          period,
          calculatedAt: now,
        },
      });
    }

    // 7. Update Department scores in primary table
    await prisma.department.update({
      where: { id: departmentId },
      data: {
        envScore: envScore,
        socialScore: socialScore,
        govScore: govScore,
        totalScore: totalScore,
      },
    });

    console.log(`Successfully recalculated ESG Scores for department ${department.name}. Total: ${totalScore.toFixed(2)}`);
  } catch (error) {
    console.error(`Error in recalculateDepartmentScore for dept ${departmentId}:`, error);
  }
}
