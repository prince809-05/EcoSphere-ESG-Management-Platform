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
  await prisma.department.updateMany({ data: { headId: null } });
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});

  // 2. Create Global Settings
  await prisma.settings.create({
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
  const catCSR = await prisma.category.create({ data: { name: 'Community Outreach', type: CategoryType.CSR_ACTIVITY, status: 'ACTIVE' } });
  const catEcoCSR = await prisma.category.create({ data: { name: 'Environmental Volunteering', type: CategoryType.CSR_ACTIVITY, status: 'ACTIVE' } });
  const catHealthCSR = await prisma.category.create({ data: { name: 'Health & Wellbeing', type: CategoryType.CSR_ACTIVITY, status: 'ACTIVE' } });
  const catCommute = await prisma.category.create({ data: { name: 'Green Commuting', type: CategoryType.CHALLENGE, status: 'ACTIVE' } });
  const catEnergy = await prisma.category.create({ data: { name: 'Energy Conservation', type: CategoryType.CHALLENGE, status: 'ACTIVE' } });
  const catWaste = await prisma.category.create({ data: { name: 'Waste Reduction', type: CategoryType.CHALLENGE, status: 'ACTIVE' } });
  console.log('Created categories');

  // 4. Create Emission Factors
  const efElectricity = await prisma.emissionFactor.create({ data: { name: 'Grid Electricity', category: 'Energy', unit: 'kWh', factorValue: 0.00085, source: 'EPA 2024', status: 'ACTIVE' } });
  const efDiesel = await prisma.emissionFactor.create({ data: { name: 'Diesel Fleet Fuel', category: 'Fleet', unit: 'Liters', factorValue: 0.00268, source: 'DEFRA 2024', status: 'ACTIVE' } });
  const efRawMaterial = await prisma.emissionFactor.create({ data: { name: 'Recycled Aluminum Raw', category: 'Manufacturing', unit: 'kg', factorValue: 0.0015, source: 'Ecoinvent v3.10', status: 'ACTIVE' } });
  const efNaturalGas = await prisma.emissionFactor.create({ data: { name: 'Natural Gas Heating', category: 'Energy', unit: 'm3', factorValue: 0.00201, source: 'EPA 2024', status: 'ACTIVE' } });
  const efAirTravel = await prisma.emissionFactor.create({ data: { name: 'Domestic Air Travel', category: 'Travel', unit: 'km', factorValue: 0.000255, source: 'DEFRA 2024', status: 'ACTIVE' } });
  console.log('Created emission factors');

  // 5. Create Product ESG Profiles
  await prisma.productESGProfile.createMany({
    data: [
      { productName: 'EcoPack Aluminum Panel', carbonFootprint: 12.50, recyclabilityScore: 92, ethicalSourcing: 'Verified — ISEAL certified supplier', status: 'ACTIVE' },
      { productName: 'Solar Charge Module V2', carbonFootprint: 6.80, recyclabilityScore: 78, ethicalSourcing: 'Partial — 2 suppliers pending audit', status: 'ACTIVE' },
      { productName: 'Bio-Resin Casing A4', carbonFootprint: 4.20, recyclabilityScore: 95, ethicalSourcing: 'Verified — FSC certified', status: 'ACTIVE' },
      { productName: 'Copper Wire Bundle 2.5mm', carbonFootprint: 18.90, recyclabilityScore: 65, ethicalSourcing: 'Under Review — DRC supply chain flagged', status: 'ACTIVE' },
      { productName: 'Recycled PET Insulation Board', carbonFootprint: 3.10, recyclabilityScore: 99, ethicalSourcing: 'Verified — 100% post-consumer waste input', status: 'ACTIVE' },
    ]
  });
  console.log('Created product ESG profiles');

  // 6. Create Departments
  const deptMfg = await prisma.department.create({ data: { name: 'Manufacturing', code: 'MFG', employeeCount: 4, status: DepartmentStatus.ACTIVE } });
  const deptLog = await prisma.department.create({ data: { name: 'Logistics', code: 'LOG', employeeCount: 3, status: DepartmentStatus.ACTIVE } });
  const deptCorp = await prisma.department.create({ data: { name: 'Corporate Office', code: 'CORP', employeeCount: 3, status: DepartmentStatus.ACTIVE } });
  const deptRD = await prisma.department.create({ data: { name: 'Research & Development', code: 'RD', employeeCount: 3, status: DepartmentStatus.ACTIVE } });
  console.log('Created departments');

  // 7. Create 11 Users (Prince as Admin)
  const passwordHash = bcrypt.hashSync('password123', 10);

  // Admin — Prince
  const prince = await prisma.user.create({
    data: { email: 'admin@ecosphere.com', passwordHash, name: 'Prince', role: Role.ADMIN, totalXP: 500, totalPoints: 450 }
  });

  // Managers
  const mfgManager = await prisma.user.create({
    data: { email: 'manager.mfg@ecosphere.com', passwordHash, name: 'Maria Manufacturing', role: Role.MANAGER, departmentId: deptMfg.id, totalXP: 320, totalPoints: 380 }
  });
  const logManager = await prisma.user.create({
    data: { email: 'manager.log@ecosphere.com', passwordHash, name: 'Luis Logistics', role: Role.MANAGER, departmentId: deptLog.id, totalXP: 260, totalPoints: 290 }
  });
  const rdManager = await prisma.user.create({
    data: { email: 'manager.rd@ecosphere.com', passwordHash, name: 'Rachel Research', role: Role.MANAGER, departmentId: deptRD.id, totalXP: 195, totalPoints: 210 }
  });

  // Auditor
  const auditor = await prisma.user.create({
    data: { email: 'auditor@ecosphere.com', passwordHash, name: 'Audrey Auditor', role: Role.AUDITOR, totalXP: 80, totalPoints: 60 }
  });

  // Employees
  const emp1 = await prisma.user.create({ data: { email: 'emp1.mfg@ecosphere.com', passwordHash, name: 'Emma Emily', role: Role.EMPLOYEE, departmentId: deptMfg.id, totalXP: 610, totalPoints: 540 } });
  const emp2 = await prisma.user.create({ data: { email: 'emp2.mfg@ecosphere.com', passwordHash, name: 'Ethan Evans', role: Role.EMPLOYEE, departmentId: deptMfg.id, totalXP: 430, totalPoints: 380 } });
  const emp3 = await prisma.user.create({ data: { email: 'emp3.log@ecosphere.com', passwordHash, name: 'Logan Lucas', role: Role.EMPLOYEE, departmentId: deptLog.id, totalXP: 275, totalPoints: 240 } });
  const emp4 = await prisma.user.create({ data: { email: 'emp4.corp@ecosphere.com', passwordHash, name: 'Chloe Carter', role: Role.EMPLOYEE, departmentId: deptCorp.id, totalXP: 700, totalPoints: 620 } });
  const emp5 = await prisma.user.create({ data: { email: 'emp5.corp@ecosphere.com', passwordHash, name: 'Caleb Cooper', role: Role.EMPLOYEE, departmentId: deptCorp.id, totalXP: 140, totalPoints: 110 } });
  const emp6 = await prisma.user.create({ data: { email: 'emp6.rd@ecosphere.com', passwordHash, name: 'Priya Patel', role: Role.EMPLOYEE, departmentId: deptRD.id, totalXP: 385, totalPoints: 360 } });
  console.log('Created 11 users');

  // Update Department Heads
  await prisma.department.update({ where: { id: deptMfg.id }, data: { headId: mfgManager.id } });
  await prisma.department.update({ where: { id: deptLog.id }, data: { headId: logManager.id } });
  await prisma.department.update({ where: { id: deptRD.id }, data: { headId: rdManager.id } });
  console.log('Updated department heads');

  // 8. Create Environmental Goals
  await prisma.environmentalGoal.createMany({
    data: [
      { name: 'Reduce MFG energy emissions', targetCO2: 12.00, currentCO2: 8.50, departmentId: deptMfg.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Minimize Aluminum production scrap', targetCO2: 50.00, currentCO2: 45.00, departmentId: deptMfg.id, deadline: new Date('2026-10-15'), status: GoalStatus.ACTIVE },
      { name: 'Optimize Diesel fleet consumption', targetCO2: 25.00, currentCO2: 18.00, departmentId: deptLog.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Route optimization efficiency', targetCO2: 10.00, currentCO2: 9.80, departmentId: deptLog.id, deadline: new Date('2026-09-01'), status: GoalStatus.ACTIVE },
      { name: 'Office carbon footprint reduction', targetCO2: 5.00, currentCO2: 2.10, departmentId: deptCorp.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
      { name: 'Zero-paper administrative operations', targetCO2: 2.00, currentCO2: 1.80, departmentId: deptCorp.id, deadline: new Date('2026-08-30'), status: GoalStatus.ACTIVE },
      { name: 'Lab equipment energy reduction', targetCO2: 8.00, currentCO2: 5.40, departmentId: deptRD.id, deadline: new Date('2026-11-30'), status: GoalStatus.ACTIVE },
      { name: 'Research travel emissions cap', targetCO2: 15.00, currentCO2: 11.20, departmentId: deptRD.id, deadline: new Date('2026-12-31'), status: GoalStatus.ACTIVE },
    ]
  });
  console.log('Created environmental goals');

  // 9. Create Carbon Transactions (Rich data)
  await prisma.carbonTransaction.createMany({
    data: [
      { type: CarbonTransactionType.MANUFACTURING, quantity: 10000, emissionFactorId: efElectricity.id, calculatedCO2: 8.50, departmentId: deptMfg.id, autoCalculated: true, createdAt: new Date('2026-01-10') },
      { type: CarbonTransactionType.PURCHASE, quantity: 30000, emissionFactorId: efRawMaterial.id, calculatedCO2: 45.00, departmentId: deptMfg.id, autoCalculated: true, createdAt: new Date('2026-02-15') },
      { type: CarbonTransactionType.MANUFACTURING, quantity: 4700, emissionFactorId: efNaturalGas.id, calculatedCO2: 9.45, departmentId: deptMfg.id, autoCalculated: true, createdAt: new Date('2026-05-18') },
      { type: CarbonTransactionType.FLEET, quantity: 6716, emissionFactorId: efDiesel.id, calculatedCO2: 18.00, departmentId: deptLog.id, autoCalculated: true, createdAt: new Date('2026-03-05') },
      { type: CarbonTransactionType.FLEET, quantity: 3200, emissionFactorId: efDiesel.id, calculatedCO2: 8.58, departmentId: deptLog.id, autoCalculated: true, createdAt: new Date('2026-06-12') },
      { type: CarbonTransactionType.EXPENSE, quantity: 2470, emissionFactorId: efElectricity.id, calculatedCO2: 2.10, departmentId: deptCorp.id, autoCalculated: true, createdAt: new Date('2026-04-12') },
      { type: CarbonTransactionType.EXPENSE, quantity: 1200, emissionFactorId: efAirTravel.id, calculatedCO2: 0.31, departmentId: deptCorp.id, autoCalculated: true, createdAt: new Date('2026-05-22') },
      { type: CarbonTransactionType.EXPENSE, quantity: 3600, emissionFactorId: efElectricity.id, calculatedCO2: 3.06, departmentId: deptRD.id, autoCalculated: true, createdAt: new Date('2026-04-30') },
      { type: CarbonTransactionType.EXPENSE, quantity: 2800, emissionFactorId: efAirTravel.id, calculatedCO2: 0.71, departmentId: deptRD.id, autoCalculated: true, createdAt: new Date('2026-06-05') },
    ]
  });
  console.log('Created carbon transactions');

  // 10. Create CSR Activities (Rich)
  const activity1 = await prisma.cSRActivity.create({ data: { title: 'Annual Forestation Drive', description: 'Help plant 1000 saplings in the green belt to restore biodiversity in the local watershed area.', categoryId: catEcoCSR.id, pointsReward: 150, xpReward: 200, deadline: new Date('2026-08-15'), status: ActivityStatus.ACTIVE } });
  const activity2 = await prisma.cSRActivity.create({ data: { title: 'Local School Science Mentorship', description: 'Teach local school children about carbon footprint accounting and recycling practices.', categoryId: catCSR.id, pointsReward: 100, xpReward: 120, deadline: new Date('2026-09-20'), status: ActivityStatus.ACTIVE } });
  const activity3 = await prisma.cSRActivity.create({ data: { title: 'Corporate E-Waste Collection', description: 'Clean out your desk and recycle old electronics safely with our certified partners.', categoryId: catEcoCSR.id, pointsReward: 50, xpReward: 60, deadline: new Date('2026-07-28'), status: ActivityStatus.ACTIVE } });
  const activity4 = await prisma.cSRActivity.create({ data: { title: 'Community Blood Donation Drive', description: 'Participate in our bi-annual blood donation drive held at the Corporate campus.', categoryId: catHealthCSR.id, pointsReward: 80, xpReward: 100, deadline: new Date('2026-08-30'), status: ActivityStatus.ACTIVE } });
  const activity5 = await prisma.cSRActivity.create({ data: { title: 'Urban River Cleanup', description: 'Volunteer for the city urban river cleanup to remove plastic and restore the ecosystem.', categoryId: catEcoCSR.id, pointsReward: 120, xpReward: 150, deadline: new Date('2026-10-01'), status: ActivityStatus.ACTIVE } });
  const activity6 = await prisma.cSRActivity.create({ data: { title: 'Senior Citizen Digital Literacy Camp', description: 'Teach senior citizens the basics of digital tools, online banking, and safe internet usage.', categoryId: catCSR.id, pointsReward: 90, xpReward: 110, deadline: new Date('2026-09-05'), status: ActivityStatus.COMPLETED } });
  console.log('Created CSR activities');

  // CSR Participations
  await prisma.employeeParticipation.createMany({
    data: [
      { employeeId: emp1.id, activityId: activity1.id, proofUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 150, completedAt: new Date('2026-05-12'), reviewedBy: mfgManager.id, reviewedAt: new Date('2026-05-13') },
      { employeeId: emp3.id, activityId: activity1.id, proofUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 150, completedAt: new Date('2026-05-12'), reviewedBy: logManager.id, reviewedAt: new Date('2026-05-14') },
      { employeeId: emp4.id, activityId: activity2.id, proofUrl: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45', approvalStatus: ParticipationStatus.PENDING },
      { employeeId: emp2.id, activityId: activity3.id, proofUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 50, completedAt: new Date('2026-07-01'), reviewedBy: mfgManager.id, reviewedAt: new Date('2026-07-02') },
      { employeeId: emp4.id, activityId: activity4.id, proofUrl: 'https://images.unsplash.com/photo-1584515933487-779824d29309', approvalStatus: ParticipationStatus.APPROVED, pointsEarned: 80, completedAt: new Date('2026-06-15'), reviewedBy: mfgManager.id, reviewedAt: new Date('2026-06-16') },
      { employeeId: emp6.id, activityId: activity5.id, proofUrl: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b', approvalStatus: ParticipationStatus.PENDING },
    ]
  });
  console.log('Created CSR participations');

  // 11. Create Challenges (6 total)
  const challenge1 = await prisma.challenge.create({ data: { title: 'Zero Waste Commute Week', description: 'Walk, cycle, or carpool to work for 5 consecutive days. Upload your route photo or transport receipt as proof.', categoryId: catCommute.id, xpReward: 150, difficulty: ChallengeDifficulty.MEDIUM, evidenceRequired: true, deadline: new Date('2026-07-20'), status: ChallengeStatus.ACTIVE } });
  const challenge2 = await prisma.challenge.create({ data: { title: 'Monitor & Unplug', description: 'Turn off all monitors, chargers, and workstation extensions at the end of every working day for 2 weeks.', categoryId: catEnergy.id, xpReward: 80, difficulty: ChallengeDifficulty.EASY, evidenceRequired: false, deadline: new Date('2026-07-30'), status: ChallengeStatus.ACTIVE } });
  const challenge3 = await prisma.challenge.create({ data: { title: 'Paperless Month', description: 'Go completely paperless for an entire month. All internal reports must be digital only. Submit audit log as evidence.', categoryId: catWaste.id, xpReward: 200, difficulty: ChallengeDifficulty.HARD, evidenceRequired: true, deadline: new Date('2026-08-31'), status: ChallengeStatus.ACTIVE } });
  const challenge4 = await prisma.challenge.create({ data: { title: 'Lunch Box Challenge', description: 'Bring your own reusable lunch container every day for 3 weeks instead of using single-use plastic.', categoryId: catWaste.id, xpReward: 60, difficulty: ChallengeDifficulty.EASY, evidenceRequired: false, deadline: new Date('2026-08-15'), status: ChallengeStatus.ACTIVE } });
  const challenge5 = await prisma.challenge.create({ data: { title: 'LED Lighting Audit', description: 'Perform a full audit of lighting in your work area and recommend LED replacements. Submit a written report.', categoryId: catEnergy.id, xpReward: 120, difficulty: ChallengeDifficulty.MEDIUM, evidenceRequired: true, deadline: new Date('2026-09-01'), status: ChallengeStatus.ACTIVE } });
  const challenge6 = await prisma.challenge.create({ data: { title: 'Green Team Leader', description: 'Organize and lead a team green initiative event — a local cleanup, tree planting, or awareness session with at least 10 participants.', categoryId: catCommute.id, xpReward: 300, difficulty: ChallengeDifficulty.HARD, evidenceRequired: true, deadline: new Date('2026-10-15'), status: ChallengeStatus.ACTIVE } });
  console.log('Created 6 challenges');

  // Challenge Participations
  await prisma.challengeParticipation.createMany({
    data: [
      { employeeId: emp1.id, challengeId: challenge1.id, progress: 100, proofUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e', approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 150, completedAt: new Date('2026-06-10') },
      { employeeId: emp4.id, challengeId: challenge1.id, progress: 80, proofUrl: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e', approvalStatus: ParticipationStatus.PENDING },
      { employeeId: emp2.id, challengeId: challenge2.id, progress: 100, approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 80, completedAt: new Date('2026-06-15') },
      { employeeId: emp6.id, challengeId: challenge2.id, progress: 100, approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 80, completedAt: new Date('2026-06-20') },
      { employeeId: emp3.id, challengeId: challenge4.id, progress: 100, approvalStatus: ParticipationStatus.APPROVED, xpAwarded: 60, completedAt: new Date('2026-07-05') },
      { employeeId: emp5.id, challengeId: challenge4.id, progress: 40, approvalStatus: ParticipationStatus.PENDING },
      { employeeId: emp1.id, challengeId: challenge3.id, progress: 60, approvalStatus: ParticipationStatus.PENDING },
      { employeeId: emp6.id, challengeId: challenge5.id, progress: 100, proofUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', approvalStatus: ParticipationStatus.PENDING, completedAt: new Date('2026-07-08') },
    ]
  });
  console.log('Created challenge participations');

  // 12. Create Badges
  const badgeGreenhorn = await prisma.badge.create({ data: { name: 'ESG Greenhorn', description: 'Unlocked by reaching 100 XP threshold.', unlockRule: { type: 'XP_THRESHOLD', value: 100 }, icon: 'Leaf' } });
  const badgeCarbonSlayer = await prisma.badge.create({ data: { name: 'Carbon Slayer', description: 'Unlocked by completing 1 high-difficulty challenge.', unlockRule: { type: 'CHALLENGE_COUNT', value: 1 }, icon: 'Zap' } });
  const badgeEcoChampion = await prisma.badge.create({ data: { name: 'Eco Champion', description: 'Unlocked by reaching 500 XP threshold.', unlockRule: { type: 'XP_THRESHOLD', value: 500 }, icon: 'Trophy' } });
  const badgeVolunteer = await prisma.badge.create({ data: { name: 'Community Volunteer', description: 'Unlocked after completing 2 CSR activities.', unlockRule: { type: 'CSR_COUNT', value: 2 }, icon: 'Heart' } });
  console.log('Created badges');

  await prisma.employeeBadge.createMany({
    data: [
      { employeeId: emp1.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-04-10'), autoAwarded: true },
      { employeeId: emp1.id, badgeId: badgeCarbonSlayer.id, unlockedAt: new Date('2026-06-10'), autoAwarded: true },
      { employeeId: emp1.id, badgeId: badgeEcoChampion.id, unlockedAt: new Date('2026-07-01'), autoAwarded: true },
      { employeeId: emp4.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-03-01'), autoAwarded: true },
      { employeeId: emp4.id, badgeId: badgeVolunteer.id, unlockedAt: new Date('2026-06-20'), autoAwarded: true },
      { employeeId: emp2.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-04-20'), autoAwarded: true },
      { employeeId: emp6.id, badgeId: badgeGreenhorn.id, unlockedAt: new Date('2026-05-10'), autoAwarded: true },
      { employeeId: prince.id, badgeId: badgeEcoChampion.id, unlockedAt: new Date('2026-01-01'), autoAwarded: true },
    ]
  });
  console.log('Awarded employee badges');

  // 13. Create Rewards (5 items)
  const reward1 = await prisma.reward.create({ data: { name: 'Eco-Friendly Reusable Water Bottle', description: 'Premium copper-insulated reusable water bottle branded with EcoSphere. Zero single-use plastic.', pointsRequired: 150, stock: 25, status: RewardStatus.ACTIVE } });
  const reward2 = await prisma.reward.create({ data: { name: '1 Tree Planted in Your Name', description: 'Redeem points to have a tree planted in a national reserve, with a digital certificate and GPS coordinates.', pointsRequired: 50, stock: 500, status: RewardStatus.ACTIVE } });
  const reward3 = await prisma.reward.create({ data: { name: 'Solar Power Bank 10,000mAh', description: 'A portable solar-powered power bank. Charge your devices with clean energy on the go.', pointsRequired: 300, stock: 15, status: RewardStatus.ACTIVE } });
  const reward4 = await prisma.reward.create({ data: { name: 'Organic Cotton EcoSphere Tote', description: 'Premium fair-trade organic cotton tote bag, screen-printed with the EcoSphere AI logo.', pointsRequired: 80, stock: 50, status: RewardStatus.ACTIVE } });
  const reward5 = await prisma.reward.create({ data: { name: 'EcoSphere Sustainability Course', description: 'Unlock a premium online sustainability certification course by recognized ESG training bodies.', pointsRequired: 400, stock: 100, status: RewardStatus.ACTIVE } });
  console.log('Created 5 rewards');

  await prisma.rewardRedemption.createMany({
    data: [
      { employeeId: emp1.id, rewardId: reward2.id, pointsDeducted: 50, redeemedAt: new Date('2026-06-20'), status: 'DELIVERED' },
      { employeeId: emp4.id, rewardId: reward4.id, pointsDeducted: 80, redeemedAt: new Date('2026-07-01'), status: 'DELIVERED' },
      { employeeId: emp2.id, rewardId: reward1.id, pointsDeducted: 150, redeemedAt: new Date('2026-07-05'), status: 'PENDING' },
    ]
  });
  console.log('Created reward redemptions');

  // 14. Create Policies (5 policies)
  const policy1 = await prisma.eSGBPolicy.create({ data: { title: 'Corporate Environmental Code of Conduct', content: 'All employees must minimize paper use, manage electronic waste through certified channels, and follow standard recycling procedures. Workstations must be shut down at end of day to prevent phantom energy loads.', departmentId: deptCorp.id, effectiveDate: new Date('2026-01-01'), status: PolicyStatus.ACTIVE } });
  const policy2 = await prisma.eSGBPolicy.create({ data: { title: 'Ethical Supply Chain Standard', content: 'EcoSphere mandates that all procurement teams evaluate raw material suppliers using a minimum ESG score of 60. Suppliers sourcing from conflict-risk zones must provide additional DRC compliance documentation.', departmentId: deptMfg.id, effectiveDate: new Date('2026-02-01'), status: PolicyStatus.ACTIVE } });
  const policy3 = await prisma.eSGBPolicy.create({ data: { title: 'Green Fleet Operations Policy', content: 'All fleet vehicles must undergo quarterly emissions testing. Diesel vehicles over 5 years old must be transitioned to hybrid or EV alternatives by 2027. Route optimization software must be used for all deliveries.', departmentId: deptLog.id, effectiveDate: new Date('2026-03-01'), status: PolicyStatus.ACTIVE } });
  const policy4 = await prisma.eSGBPolicy.create({ data: { title: 'R&D Sustainable Innovation Charter', content: 'All new product prototypes must include a lifecycle carbon assessment. Research teams must target at least 80% recyclability in new product designs. Lab waste disposal must follow ISO 14001 guidelines.', departmentId: deptRD.id, effectiveDate: new Date('2026-04-01'), status: PolicyStatus.ACTIVE } });
  const policy5 = await prisma.eSGBPolicy.create({ data: { title: 'Company-Wide Data Privacy & ESG Reporting Standard', content: 'ESG data must be reported monthly using verified emission factors only. Data manipulation or misreporting is a disciplinary offense. All reports must be signed off by the department head before submission.', departmentId: null, effectiveDate: new Date('2026-01-15'), status: PolicyStatus.ACTIVE } });
  console.log('Created 5 ESG policies');

  // Policy Acknowledgements
  await prisma.policyAcknowledgement.createMany({
    data: [
      { employeeId: emp4.id, policyId: policy1.id, acknowledgedAt: new Date('2026-01-15'), ipAddress: '192.168.1.55' },
      { employeeId: emp5.id, policyId: policy1.id, acknowledgedAt: new Date('2026-01-16'), ipAddress: '192.168.1.60' },
      { employeeId: emp1.id, policyId: policy2.id, acknowledgedAt: new Date('2026-02-15'), ipAddress: '192.168.1.102' },
      { employeeId: emp2.id, policyId: policy2.id, acknowledgedAt: new Date('2026-02-18'), ipAddress: '192.168.1.103' },
      { employeeId: emp3.id, policyId: policy3.id, acknowledgedAt: new Date('2026-03-10'), ipAddress: '192.168.1.80' },
      { employeeId: emp6.id, policyId: policy4.id, acknowledgedAt: new Date('2026-04-10'), ipAddress: '192.168.1.120' },
    ]
  });
  console.log('Created policy acknowledgements');

  // 15. Create Audits (3 audits)
  const audit1 = await prisma.audit.create({
    data: { title: 'Q1 ESG Compliance Audit — Manufacturing', departmentId: deptMfg.id, auditorId: auditor.id, date: new Date('2026-03-20'), status: AuditStatus.COMPLETED, findings: [
      { id: 1, finding: 'High carbon footprint observed in aluminum sourcing — exceeds Scope 3 threshold.', status: 'OPEN' },
      { id: 2, finding: 'Policy acknowledgement rate for procurement policy is below 75%.', status: 'RESOLVED' }
    ]}
  });
  const audit2 = await prisma.audit.create({
    data: { title: 'Q2 Logistics Operational Audit', departmentId: deptLog.id, auditorId: auditor.id, date: new Date('2026-06-25'), status: AuditStatus.IN_PROGRESS, findings: [
      { id: 1, finding: 'Fleet emissions reports submitted late for Q1.', status: 'OPEN' },
    ]}
  });
  const audit3 = await prisma.audit.create({
    data: { title: 'Q2 Corporate Office ESG Review', departmentId: deptCorp.id, auditorId: auditor.id, date: new Date('2026-07-05'), status: AuditStatus.SCHEDULED, findings: [] }
  });
  console.log('Created 3 audits');

  // 16. Compliance Issues
  await prisma.complianceIssue.createMany({
    data: [
      { auditId: audit1.id, severity: ComplianceSeverity.CRITICAL, description: 'Sourcing carbon footprint exceeded acceptable Scope 3 threshold by 23%.', ownerId: mfgManager.id, dueDate: new Date('2026-04-30'), status: ComplianceStatus.OPEN, createdAt: new Date('2026-03-21') },
      { auditId: audit1.id, severity: ComplianceSeverity.HIGH, description: 'Incomplete employee training on toxic waste disposal procedures.', ownerId: mfgManager.id, dueDate: new Date('2026-05-15'), status: ComplianceStatus.RESOLVED, createdAt: new Date('2026-03-21') },
      { auditId: audit2.id, severity: ComplianceSeverity.MEDIUM, description: 'Fleet emissions reports for Q1 submitted 14 days past deadline.', ownerId: logManager.id, dueDate: new Date('2026-07-31'), status: ComplianceStatus.IN_PROGRESS, createdAt: new Date('2026-06-26') },
      { auditId: audit2.id, severity: ComplianceSeverity.LOW, description: 'Two vehicles missing current VIN emissions certification stickers.', ownerId: logManager.id, dueDate: new Date('2026-08-15'), status: ComplianceStatus.OPEN, createdAt: new Date('2026-06-26') },
    ]
  });
  console.log('Created compliance issues');

  // 17. Create Department Scores (History for 4 depts)
  const scoreData = [
    // May scores
    { departmentId: deptMfg.id, environmentalScore: 65, socialScore: 80, governanceScore: 70, totalScore: 71.0, period: '2026-05' },
    { departmentId: deptLog.id, environmentalScore: 55, socialScore: 75, governanceScore: 80, totalScore: 68.5, period: '2026-05' },
    { departmentId: deptCorp.id, environmentalScore: 85, socialScore: 90, governanceScore: 95, totalScore: 89.5, period: '2026-05' },
    { departmentId: deptRD.id, environmentalScore: 78, socialScore: 82, governanceScore: 88, totalScore: 82.2, period: '2026-05' },
    // June scores
    { departmentId: deptMfg.id, environmentalScore: 72, socialScore: 85, governanceScore: 75, totalScore: 76.8, period: '2026-06' },
    { departmentId: deptLog.id, environmentalScore: 60, socialScore: 78, governanceScore: 85, totalScore: 72.9, period: '2026-06' },
    { departmentId: deptCorp.id, environmentalScore: 88, socialScore: 92, governanceScore: 95, totalScore: 91.3, period: '2026-06' },
    { departmentId: deptRD.id, environmentalScore: 82, socialScore: 86, governanceScore: 90, totalScore: 85.8, period: '2026-06' },
  ];

  for (const s of scoreData) {
    await prisma.departmentScore.create({
      data: { departmentId: s.departmentId, environmentalScore: s.environmentalScore, socialScore: s.socialScore, governanceScore: s.governanceScore, totalScore: s.totalScore, period: s.period, calculatedAt: new Date(`${s.period}-28`) }
    });
  }

  await prisma.department.update({ where: { id: deptMfg.id }, data: { envScore: 72, socialScore: 85, govScore: 75, totalScore: 76.8, employeeCount: 4 } });
  await prisma.department.update({ where: { id: deptLog.id }, data: { envScore: 60, socialScore: 78, govScore: 85, totalScore: 72.9, employeeCount: 3 } });
  await prisma.department.update({ where: { id: deptCorp.id }, data: { envScore: 88, socialScore: 92, govScore: 95, totalScore: 91.3, employeeCount: 2 } });
  await prisma.department.update({ where: { id: deptRD.id }, data: { envScore: 82, socialScore: 86, govScore: 90, totalScore: 85.8, employeeCount: 2 } });
  console.log('Created department scores');

  // 18. Create Notifications
  await prisma.notification.createMany({
    data: [
      { userId: mfgManager.id, type: 'COMPLIANCE', title: 'Critical Compliance Action Required', message: 'Sourcing carbon footprint compliance issue is unresolved and overdue.', link: '/governance' },
      { userId: emp4.id, type: 'CSR', title: 'Participation Under Review', message: 'Your proof upload for Annual Forestation Drive is pending review.', link: '/social' },
      { userId: emp6.id, type: 'CHALLENGE', title: 'Challenge Submission Pending', message: 'Your LED Lighting Audit submission is awaiting approval.', link: '/gamification' },
      { userId: prince.id, type: 'COMPLIANCE', title: 'New Audit Scheduled', message: 'Q2 Corporate Office ESG Review is scheduled for July 5.', link: '/governance' },
      { userId: logManager.id, type: 'COMPLIANCE', title: 'Fleet Report Compliance Issue', message: 'Fleet emissions report submission compliance issue is in progress.', link: '/governance' },
    ]
  });
  console.log('Created notifications');

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\n📋 Login Credentials (all passwords: password123):');
  console.log('  👑 Admin:    admin@ecosphere.com (Prince)');
  console.log('  ⚡ Manager:  manager.mfg@ecosphere.com (Maria Manufacturing)');
  console.log('  ⚡ Manager:  manager.log@ecosphere.com (Luis Logistics)');
  console.log('  ⚡ Manager:  manager.rd@ecosphere.com (Rachel Research)');
  console.log('  🔍 Auditor:  auditor@ecosphere.com (Audrey Auditor)');
  console.log('  👤 Employee: emp1.mfg@ecosphere.com (Emma Emily)');
  console.log('  👤 Employee: emp2.mfg@ecosphere.com (Ethan Evans)');
  console.log('  👤 Employee: emp3.log@ecosphere.com (Logan Lucas)');
  console.log('  👤 Employee: emp4.corp@ecosphere.com (Chloe Carter)');
  console.log('  👤 Employee: emp5.corp@ecosphere.com (Caleb Cooper)');
  console.log('  👤 Employee: emp6.rd@ecosphere.com (Priya Patel)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
