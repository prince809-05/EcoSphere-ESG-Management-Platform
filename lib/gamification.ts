import { prisma } from './prisma';

export async function checkAndAwardBadges(employeeId: string) {
  try {
    // 1. Fetch employee current stats
    const employee = await prisma.user.findUnique({
      where: { id: employeeId },
      include: {
        badges: true,
      },
    });

    if (!employee) return;

    // 2. Fetch all badges
    const badges = await prisma.badge.findMany();

    // 3. Filter badges that the employee doesn't have yet
    const ownedBadgeIds = employee.badges.map((eb) => eb.badgeId);
    const lockedBadges = badges.filter((b) => !ownedBadgeIds.includes(b.id));

    if (lockedBadges.length === 0) return;

    // 4. Calculate total completed challenges
    const completedChallengesCount = await prisma.challengeParticipation.count({
      where: {
        employeeId,
        approvalStatus: 'APPROVED',
      },
    });

    // 5. Evaluate rules and award
    for (const badge of lockedBadges) {
      const rule = badge.unlockRule as any;
      let shouldUnlock = false;

      if (rule.type === 'XP_THRESHOLD') {
        shouldUnlock = employee.totalXP >= Number(rule.value);
      } else if (rule.type === 'CHALLENGE_COUNT') {
        shouldUnlock = completedChallengesCount >= Number(rule.value);
      }

      if (shouldUnlock) {
        // Award badge
        await prisma.employeeBadge.create({
          data: {
            employeeId,
            badgeId: badge.id,
            autoAwarded: true,
          },
        });

        // Trigger notification
        await prisma.notification.create({
          data: {
            userId: employeeId,
            type: 'BADGE',
            title: `Badge Unlocked: ${badge.name}`,
            message: `Congratulations! You unlocked the "${badge.name}" badge. Rule: ${badge.description}`,
            link: '/gamification',
          },
        });

        console.log(`Auto-awarded badge "${badge.name}" to employee ${employee.name}`);
      }
    }
  } catch (error) {
    console.error(`Error checking badges for employee ${employeeId}:`, error);
  }
}
