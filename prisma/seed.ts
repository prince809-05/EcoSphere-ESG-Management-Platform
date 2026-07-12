import { PrismaClient, Role, DepartmentStatus, CategoryType, GoalStatus, CarbonTransactionType, ActivityStatus, ChallengeDifficulty, ChallengeStatus, RewardStatus, PolicyStatus, ParticipationStatus, AuditStatus, ComplianceSeverity, ComplianceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Delete all existing data
  await prisma.settings.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.policyAcknowledgement.deleteMany({});
  await prisma.eSGBPolicy.deleteMany({});
  await prisma.complianceIssue.deleteMany({});
  await prisma.audit.deleteMany({});
  await prisma.rewardRedemption.deleteMany({});
  await prisma.reward.deleteMany({});
  await prisma.employeeBadge.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.challengeParticipation.deleteMany({});
  await prisma.challenge.deleteMany({});
  await prisma.employeeParticipation.deleteMany({});
  await prisma.cSRActivity.deleteMany({});
  await prisma.carbonTransaction.deleteMany({});
  await prisma.environmentalGoal.deleteMany({});
  await prisma.productESGProfile.deleteMany({});
  await prisma.emissionFactor.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.departmentScore.deleteMany({});
  // Set heads to null to break dependency cycle for deleting users
  await prisma.department.updateMany({ data: { headId: null } });
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Create Global Settings
  const settings = await prisma.settings.create({
    data: {
      id: 1,
      config: {
        weights: { env: 0.4, social: 0.3, gov: 0.3 },
        autoEmissionCalculation: true,
        requireEvidenceForCSR: true,
        autoAwardBadges: true,
        emailNotifications: true
      }
    }
  });
  console.log('Created global settings');

  // 3. Create Categories
  const catCSR = await prisma.category.create({
    data: { name: 'Community Outreach', type: CategoryType.CSR_ACTIVITY, status: 'ACTIVE' }
  });
  const catEcoCSR = await prisma.category.create({
    data: { name: 'Environmental Volunteering', type: CategoryType.CSR_ACTIVITY, status: 'ACTIVE' }
  });
  const catCommute = await prisma.category.create({
    data: { name: 'Green Commuting', type: CategoryType.CHALLENGE, status: 'ACTIVE' }
  });
  const catEnergy = await prisma.category.create({
    data: { name: 'Energy Conservation', type: CategoryType.CHALLENGE, status: 'ACTIVE' }
  });
  console.log('Created categories');

  // 4. Create Emission Factors
  const efElectricity = await prisma.emissionFactor.create({
    data: { name: 'Grid Electricity', category: 'Energy', unit: 'kWh', factorValue: 0.00085, source: 'EPA 2024', status: 'ACTIVE' }
  });
  const efDiesel = await prisma.emissionFactor.create({
    data: { name: 'Diesel Fleet Fuel', category: 'Fleet', unit: 'Liters', factorValue: 0.00268, source: 'DEFRA 2024', status: 'ACTIVE' }
  });
  const efRawMaterial = await prisma.emissionFactor.create({
    data: { name: 'Recycled Aluminum Raw', category: 'Manufacturing', unit: 'kg', factorValue: 0.0015, source: 'Ecoinvent v3.10', status: 'ACTIVE' }
  });
  console.log('Created emission factors');

  // 5. Create Departments
  const deptMfg = await prisma.department.create({
    data: { name: 'Manufacturing', code: 'MFG', employeeCount: 4, status: DepartmentStatus.ACTIVE }
  });
  const deptLog = await prisma.department.create({
    data: { name: 'Logistics', code: 'LOG', employeeCount: 3, status: DepartmentStatus.ACTIVE }
  });
  const deptCorp = await prisma.department.create({
    data: { name: 'Corporate Office', code: 'CORP', employeeCount: 3, status: DepartmentStatus.ACTIVE }
  });
  console.log('Created departments');

  // 6. Create Users
  const passwordHash = bcrypt.hashSync('password123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@ecosphere.com', passwordHash, name: 'Alex Admin', role: Role.ADMIN, totalXP: 100, totalPoints: 100 }
  });

  const mfgManager = await prisma.user.create({
    data: { email: 'manager.mfg@ecosphere.com', passwordHash, name: 'Maria Manufacturing', role: Role.MANAGER, departmentId: deptMfg.id, totalXP: 250, totalPoints: 300 }
  });

  const logManager = await prisma.user.create({
    data: { email: 'manager.log@ecosphere.com', passwordHash, name: 'Luis Logistics', role: Role.MANAGER, departmentId: deptLog.id, totalXP: 180, totalPoints: 200 }
  });

  const auditor = await prisma.user.create({
    data: { email: 'auditor@ecosphere.com', passwordHash, name: 'Audrey Auditor', role: Role.AUDITOR, totalXP: 50, totalPoints: 50 }
  });

  // Employees
  const emp1 = await prisma.user.create({
    data: { email: 'emp1.mfg@ecosphere.com', passwordHash, name: 'Emma Emily', role: Role.EMPLOYEE, departmentId: deptMfg.id, totalXP: 450, totalPoints: 400 }
  });
  const emp2 = await prisma.user.create({
    data: { email: 'emp2.mfg@ecosphere.com', passwordHash, name: 'Ethan Evans', role: Role.EMPLOYEE, departmentId: deptMfg.id, totalXP: 320, totalPoints: 280 }
  });
  const emp3 = await prisma.user.create({
    data: { email: 'emp3.log@ecosphere.com', passwordHash, name: 'Logan Lucas', role: Role.EMPLOYEE, departmentId: deptLog.id, totalXP: 210, totalPoints: 190 }
  });
  const emp4 = await prisma.user.create({
    data: { email: 'emp4.corp@ecosphere.com', passwordHash, name: 'Chloe Carter', role: Role.EMPLOYEE, departmentId: deptCorp.id, totalXP: 600, totalPoints: 550 }
  });
  const emp5 = await prisma.user.create({
    data: { email: 'emp5.corp@ecosphere.com', passwordHash, name: 'Caleb Cooper', role: Role.EMPLOYEE, departmentId: deptCorp.id, totalXP: 120, totalPoints: 100 }
  });
  console.log('Created users');

  // Update Department Heads
  await prisma.department.update({ where: { id: deptMfg.id }, data: { headId: mfgManager.id } });
  await prisma.department.update({ where: { id: deptLog.id }, data: { headId: logManager.id } });
  console.log('Updated department heads');

  // 7. Create Environmental Goals
  await prisma.environmentalGoal.createMany({
    data: [
      { name: 'Reduce MFG energy emissions', targetCO2: 12.00, currentCO2: 8.50, departmentId: deptMfg.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Minimize Aluminum production scrap', targetCO2: 50.00, currentCO2: 45.00, departmentId: deptMfg.id, deadline: new Date('2026-10-15'), status: GoalStatus.ACTIVE },
      { name: 'Optimize Diesel fleet consumption', targetCO2: 25.00, currentCO2: 18.00, departmentId: deptLog.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Route optimization efficiency', targetCO2: 10.00, currentCO2: 9.80, departmentId: deptLog.id, deadline: new Date('2026-09-01'), status: GoalStatus.ACTIVE },
      { name: 'Office carbon footprint reduction', targetCO2: 5.00, currentCO2: 2.10, departmentId: deptCorp.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Zero-paper administrative operations', targetCO2: 2.00, currentCO2: 1.80, departmentId: deptCorp.id, deadline: new Date('2026-08-30'), status: GoalStatus.ACTIVE }
    ]
  });
  console.log('Created environmental goals');

  // 8. Create Carbon Transactions
  await prisma.carbonTransaction.createMany({
    data: [
      { type: CarbonTransactionType.MANUFACTURING, quantity: 10000, emissionFactorId: efElectricity.id, calculatedCO2: 8.5, departmentId: deptMfg.id, autoCalculated: true, createdAt: new Date('2026-01-10') },
      { type: CarbonTransactionType.PURCHASE, quantity: 30000, emissionFactorId: efRawMaterial.id, calculatedCO2: 45.0, departmentId: deptMfg.id, autoCalculated: true, createdAt: new Date('2026-02-15') },
      { type: CarbonTransactionType.FLEET, quantity: 6716.4, emissionFactorId: efDiesel.id, calculatedCO2: 18.0, departmentId: deptLog.id, autoCalculated: true, createdAt: new Date('2026-03-05') },
      { type: CarbonTransactionType.EXPENSE, quantity: 2470.5, emissionFactorId: efElectricity.id, calculatedCO2: 2.1, departmentId: deptCorp.id, autoCalculated: true, createdAt: new Date('2026-04-12') }
    ]
  });
  console.log('Created carbon transactions');

  // 9. Create CSR Activities
  const activity1 = await prisma.cSRActivity.create({
    data: { title: 'Annual Forestation Drive', description: 'Help plant 1000 saplings in the green belt to restore biodiversity.', categoryId: catEcoCSR.id, pointsReward: 150, xpReward: 200, deadline: new Date('2026-08-15'), status: ActivityStatus.ACTIVE }
  });
  const activity2 = await prisma.cSRActivity.create({
    data: { title: 'Local School Science Mentorship', description: 'Teach local school children about carbon footprint accounting and recycling.', categoryId: catCSR.id, pointsReward: 100, xpReward: 120, deadline: new Date('2026-09-20'), status: ActivityStatus.ACTIVE }
  });
  const activity3 = await prisma.cSRActivity.create({
    data: { title: 'Corporate E-Waste Collection', description: 'Clean out your desk and recycle old electronics safely.', categoryId: catEcoCSR.id, pointsReward: 50, xpReward: 60, deadline: new Date('2026-07-28'), status: ActivityStatus.ACTIVE }
  });
  console.log('Created CSR activities');

  // Add Employee Participation
  await prisma.employeeParticipation.create({
    data: { employeeId: emp1.id, activityId: activity1.id, proofUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 150, completedAt: new Date('2026-05-12'), reviewedBy: mfgManager.id, reviewedAt: new Date('2026-05-13') }
  });
  await prisma.employeeParticipation.create({
    data: { employeeId: emp3.id, activityId: activity1.id, proofUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 150, completedAt: new Date('2026-05-12'), reviewedBy: logManager.id, reviewedAt: new Date('2026-05-14') }
  });
  await prisma.employeeParticipation.create({
    data: { employeeId: emp4.id, activityId: activity2.id, proofUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45', approvalStatus: ParticipationStatus.PENDING }
  });
  console.log('Created employee participations');

  // 10. Create Challenges
  const challenge1 = await prisma.challenge.create({
    data: { title: 'Zero Waste Commute Week', description: 'Walk, cycle, or carpool to work for 5 consecutive days.', categoryId: catCommute.id, xpReward: 150, difficulty: ChallengeDifficulty.MEDIUM, evidenceRequired: true, deadline: new Date('2026-07-20'), status: ChallengeStatus.ACTIVE }
  });
  const challenge2 = await prisma.challenge.create({
    data: { title: 'Monitor & Unplug', description: 'Turn off all monitors, chargers, and workstation extensions at the end of every day.', categoryId: catEnergy.id, xpReward: 80, difficulty: ChallengeDifficulty.EASY, evidenceRequired: false, deadline: new Date('2026-07-30'), status: ChallengeStatus.ACTIVE }
  });
  console.log('Created challenges');

  // Challenge participations
  await prisma.challengeParticipation.create({
    data: { employeeId: emp1.id, challengeId: challenge1.id, progress: 100, proofUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e', approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 150, completedAt: new Date('2026-06-10') }
  });
  await prisma.challengeParticipation.create({
    data: { employeeId: emp4.id, challengeId: challenge1.id, progress: 80, proofUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e', approvalStatus: ParticipationStatus.PENDING }
  });
  await prisma.challengeParticipation.create({
    data: { employeeId: emp2.id, challengeId: challenge2.id, progress: 100, approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 80, completedAt: new Date('2026-06-15') }
  });
  console.log('Created challenge participations');

  // 11. Create Badges
  const badgeGreenhorn = await prisma.badge.create({
    data: { name: 'ESG Greenhorn', description: 'Unlocked by reaching 100 XP threshold.', unlockRule: { type: 'XP_THRESHOLD', value: 100 }, icon: 'Leaf' }
  });
  const badgeCarbonSlayer = await prisma.badge.create({
    data: { name: 'Carbon Slayer', description: 'Unlocked by completing 1 high-difficulty challenge.', unlockRule: { type: 'CHALLENGE_COUNT', value: 1 }, icon: 'Zap' }
  });
  console.log('Created badges');

  // Assign Badges
  await prisma.employeeBadge.createMany({
    data: [
      { employeeId: emp1.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-04-10'), autoAwarded: true },
      { employeeId: emp1.id, badgeId: badgeCarbonSlayer.id, unlockedAt: new Date('2026-06-10'), autoAwarded: true },
      { employeeId: emp4.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-03-01'), autoAwarded: true }
    ]
  });
  console.log('Awarded employee badges');

  // 12. Create Rewards
  const reward1 = await prisma.reward.create({
    data: { name: 'Eco-Friendly Reusable Water Bottle', description: 'Premium copper-insulated reusable water bottle branded with EcoSphere.', pointsRequired: 150, stock: 25, status: RewardStatus.ACTIVE }
  });
  const reward2 = await prisma.reward.create({
    data: { name: '1 Tree Planted in Your Name', description: 'Redeem points to have a tree planted in a national reserve, with a digital certificate.', pointsRequired: 50, stock: 500, status: RewardStatus.ACTIVE }
  });
  console.log('Created rewards');

  // Redemptions
  await prisma.rewardRedemption.create({
    data: { employeeId: emp1.id, rewardId: reward2.id, pointsDeducted: 50, redeemedAt: new Date('2026-06-20'), status: 'DELIVERED' }
  });
  console.log('Created reward redemptions');

  // 13. Create Policies
  const policy1 = await prisma.eSGBPolicy.create({
    data: { title: 'Corporate Environmental Code of Conduct', content: 'Detailed instructions on minimizing paper use, managing electronic waste, and standard recycling procedures. Employees must shut down workstations at the end of the day.', departmentId: deptCorp.id, effectiveDate: new Date('2026-01-01'), status: PolicyStatus.ACTIVE }
  });
  const policy2 = await prisma.eSGBPolicy.create({
    data: { title: 'Ethical Supply Chain Standard', content: 'Our standard for selecting raw material suppliers, prioritizing recyclability and local carbon footprints.', departmentId: deptMfg.id, effectiveDate: new Date('2026-02-01'), status: PolicyStatus.ACTIVE }
  });
  console.log('Created ESG policies');

  // Acknowledgements
  await prisma.policyAcknowledgement.create({
    data: { employeeId: emp4.id, policyId: policy1.id, acknowledgedAt: new Date('2026-01-15'), ipAddress: '192.168.1.55' }
  });
  await prisma.policyAcknowledgement.create({
    data: { employeeId: emp1.id, policyId: policy2.id, acknowledgedAt: new Date('2026-02-15'), ipAddress: '192.168.1.102' }
  });
  console.log('Created policy acknowledgements');

  // 14. Create Audits
  const audit1 = await prisma.audit.create({
    data: { title: 'Q1 ESG Compliance Audit', departmentId: deptMfg.id, auditorId: auditor.id, date: new Date('2026-03-20'), status: AuditStatus.COMPLETED, findings: [
      { id: 1, finding: 'High carbon footprint observed in aluminum sourcing.', status: 'OPEN' },
      { id: 2, finding: 'Acknowledge rate for procurement policy is below 75%.', status: 'RESOLVED' }
    ]}
  });
  const audit2 = await prisma.audit.create({
    data: { title: 'Q2 Logistics Operational Audit', departmentId: deptLog.id, auditorId: auditor.id, date: new Date('2026-06-25'), status: AuditStatus.IN_PROGRESS, findings: [] }
  });
  console.log('Created audits');

  // Compliance Issues
  await prisma.complianceIssue.create({
    data: { auditId: audit1.id, severity: ComplianceSeverity.CRITICAL, description: 'Sourcing carbon footprint exceeded acceptable threshold.', ownerId: mfgManager.id, dueDate: new Date('2026-04-30'), status: ComplianceStatus.OPEN, createdAt: new Date('2026-03-21') }
  });
  await prisma.complianceIssue.create({
    data: { auditId: audit1.id, severity: ComplianceSeverity.HIGH, description: 'Incomplete employee training on toxic waste disposal.', ownerId: mfgManager.id, dueDate: new Date('2026-05-15'), status: ComplianceStatus.RESOLVED, createdAt: new Date('2026-03-21') }
  });
  console.log('Created compliance issues');

  // 15. Create Department Scores & Scores history
  const scores = [
    { departmentId: deptMfg.id, environmentalScore: 65, socialScore: 80, governanceScore: 70, totalScore: 71, period: '2026-05' },
    { departmentId: deptLog.id, environmentalScore: 55, socialScore: 75, governanceScore: 80, totalScore: 68.5, period: '2026-05' },
    { departmentId: deptCorp.id, environmentalScore: 85, socialScore: 90, governanceScore: 95, totalScore: 89.5, period: '2026-05' },
    
    { departmentId: deptMfg.id, environmentalScore: 72, socialScore: 85, governanceScore: 75, totalScore: 76.8, period: '2026-06' },
    { departmentId: deptLog.id, environmentalScore: 60, socialScore: 78, governanceScore: 85, totalScore: 72.9, period: '2026-06' },
    { departmentId: deptCorp.id, environmentalScore: 88, socialScore: 92, governanceScore: 95, totalScore: 91.3, period: '2026-06' }
  ];

  for (const s of scores) {
    await prisma.departmentScore.create({
      data: {
        departmentId: s.departmentId,
        environmentalScore: s.environmentalScore,
        socialScore: s.socialScore,
        governanceScore: s.governanceScore,
        totalScore: s.totalScore,
        period: s.period,
        calculatedAt: new Date(`${s.period}-28`)
      }
    });
  }

  // Update current scores in department table
  await prisma.department.update({
    where: { id: deptMfg.id },
    data: { envScore: 72, socialScore: 85, govScore: 75, totalScore: 76.8 }
  });
  await prisma.department.update({
    where: { id: deptLog.id },
    data: { envScore: 60, socialScore: 78, govScore: 85, totalScore: 72.9 }
  });
  await prisma.department.update({
    where: { id: deptCorp.id },
    data: { envScore: 88, socialScore: 92, govScore: 95, totalScore: 91.3 }
  });
  console.log('Created department scores');

  // 16. Create Notifications
  await prisma.notification.create({
    data: { userId: mfgManager.id, type: 'COMPLIANCE', title: 'Critical Compliance Action Required', message: 'Sourcing carbon footprint compliance issue is unresolved.', link: '/dashboard/governance' }
  });
  await prisma.notification.create({
    data: { userId: emp4.id, type: 'CSR', title: 'Participation Under Review', message: 'Your proof upload for Annual Forestation Drive is pending review.', link: '/dashboard/social' }
  });
  console.log('Created notifications');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
