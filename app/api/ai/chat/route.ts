import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAIContent } from '@/lib/ai';

function countByStatus<T extends string>(items: Array<{ status: T }>) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] || 0) + 1;
    return counts;
  }, {});
}

function countByApprovalStatus<T extends string>(items: Array<{ approvalStatus: T }>) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.approvalStatus] = (counts[item.approvalStatus] || 0) + 1;
    return counts;
  }, {});
}

function matchesQuestion(question: string, terms: string[]) {
  const normalized = question.toLowerCase().replace(/[^\w\s]/g, ' ');
  return terms.every((term) => normalized.includes(term));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const userQuestion = String(message).trim();
    const questionFocus = userQuestion.toLowerCase().includes('governance') || userQuestion.toLowerCase().includes('policy') || userQuestion.toLowerCase().includes('audit') || userQuestion.toLowerCase().includes('compliance')
      ? 'Governance'
      : userQuestion.toLowerCase().includes('social') || userQuestion.toLowerCase().includes('csr') || userQuestion.toLowerCase().includes('volunteer') || userQuestion.toLowerCase().includes('participation')
        ? 'Social'
        : userQuestion.toLowerCase().includes('environment') || userQuestion.toLowerCase().includes('carbon') || userQuestion.toLowerCase().includes('emission') || userQuestion.toLowerCase().includes('co2')
          ? 'Environmental'
          : 'General ESG';

    const deptInfo = session.departmentId
      ? await prisma.department.findUnique({ where: { id: session.departmentId } })
      : null;

    const departmentScope = session.role === 'ADMIN' || session.role === 'AUDITOR'
      ? {}
      : session.departmentId
        ? { departmentId: session.departmentId }
        : {};

    const [
      carbonInfo,
      environmentalGoals,
      companyDepartments,
      activeActivities,
      myParticipations,
      pendingCSRReviews,
      activeChallenges,
      myChallengeParticipations,
      policies,
      myAcknowledgements,
      audits,
      complianceIssues,
      myOwnedComplianceIssues,
    ] = await Promise.all([
      prisma.carbonTransaction.findMany({
        where: departmentScope,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { emissionFactor: true, department: true },
      }),
      prisma.environmentalGoal.findMany({
        where: departmentScope,
        orderBy: { deadline: 'asc' },
        take: 5,
        include: { department: true },
      }),
      prisma.department.findMany({
        select: {
          name: true,
          totalScore: true,
          envScore: true,
          socialScore: true,
          govScore: true,
        },
        orderBy: { totalScore: 'desc' },
      }),
      prisma.cSRActivity.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { deadline: 'asc' },
        take: 5,
        include: { category: true },
      }),
      prisma.employeeParticipation.findMany({
        where: { employeeId: session.userId },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: { activity: true },
      }),
      session.role === 'ADMIN' || session.role === 'MANAGER'
        ? prisma.employeeParticipation.count({
            where: {
              approvalStatus: 'PENDING',
              ...(session.role === 'MANAGER' && session.departmentId
                ? { employee: { departmentId: session.departmentId } }
                : {}),
            },
          })
        : Promise.resolve(0),
      prisma.challenge.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { deadline: 'asc' },
        take: 5,
        include: { category: true },
      }),
      prisma.challengeParticipation.findMany({
        where: { employeeId: session.userId },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: { challenge: true },
      }),
      prisma.eSGBPolicy.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { effectiveDate: 'desc' },
        take: 8,
        include: { department: true },
      }),
      prisma.policyAcknowledgement.findMany({
        where: { employeeId: session.userId },
        select: { policyId: true },
      }),
      prisma.audit.findMany({
        orderBy: { date: 'desc' },
        take: 6,
        include: { department: true, auditor: true },
      }),
      prisma.complianceIssue.findMany({
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        take: 10,
        include: { audit: true, owner: true },
      }),
      prisma.complianceIssue.findMany({
        where: { ownerId: session.userId },
        orderBy: { dueDate: 'asc' },
        include: { audit: true },
      }),
    ]);

    const participationCounts = countByApprovalStatus(myParticipations);
    const challengeParticipationCounts = countByApprovalStatus(myChallengeParticipations);
    const complianceCounts = countByStatus(complianceIssues);
    const auditCounts = countByStatus(audits);
    const acknowledgedPolicyIds = new Set(myAcknowledgements.map((ack) => ack.policyId));
    const unacknowledgedPolicies = policies.filter((policy) => !acknowledgedPolicyIds.has(policy.id));

    if (matchesQuestion(userQuestion, ['improve', 'social', 'participation'])) {
      const nextActivity = activeActivities[0];
      const nextChallenge = activeChallenges[0];
      return NextResponse.json({
        response: `To improve social participation, focus on getting more employees into CSR activities and challenges.\n\nRight now the platform has ${activeActivities.length} active CSR activities and ${activeChallenges.length} active challenges. Start with ${nextActivity ? `"${nextActivity.title}"` : 'the nearest CSR activity'} and ${nextChallenge ? `"${nextChallenge.title}"` : 'one easy challenge'} because they are already available in the Social and Gamification modules.\n\nBest actions:\n- Ask department managers to promote one CSR activity this week.\n- Approve pending CSR submissions quickly so employees get points.\n- Use XP/rewards to motivate repeat participation.`,
      });
    }

    if ((matchesQuestion(userQuestion, ['governance', 'issues', 'attention']) || matchesQuestion(userQuestion, ['government', 'issue', 'attention']))) {
      const priorityIssue = complianceIssues.find((issue) => issue.status !== 'RESOLVED');
      return NextResponse.json({
        response: `The governance items needing attention are policy acknowledgements and open compliance issues.\n\nCurrent status:\n- Unacknowledged active policies: ${unacknowledgedPolicies.length}\n- Compliance issues: ${JSON.stringify(complianceCounts)}\n- Audits: ${JSON.stringify(auditCounts)}\n\nPriority action: ${priorityIssue ? `resolve "${priorityIssue.description}" assigned to ${priorityIssue.owner.name} before ${priorityIssue.dueDate.toISOString().slice(0, 10)}.` : 'keep audits moving and make sure all policies are acknowledged.'}\n\nUse the Governance page to review audits, assign issue owners, and close resolved items.`,
      });
    }

    if (matchesQuestion(userQuestion, ['environmental', 'score'])) {
      const latestCarbon = carbonInfo[0];
      const nextGoal = environmentalGoals[0];
      return NextResponse.json({
        response: `Your environmental score is ${deptInfo?.envScore ?? '85.00'} / 100.\n\nWhat it means: this score is mainly affected by carbon transactions, emission factors, and environmental goals.\n\nBest next action: ${latestCarbon ? `review the latest ${latestCarbon.type.toLowerCase()} entry for ${latestCarbon.department.name}, which produced ${latestCarbon.calculatedCO2} tons CO2.` : 'add recent carbon transactions so the score reflects current activity.'}\n${nextGoal ? `Also track the goal "${nextGoal.name}" because it is due on ${nextGoal.deadline.toISOString().slice(0, 10)}.` : ''}`,
      });
    }

    const systemPrompt = `You are EcoSphere AI, an ESG (Environmental, Social, Governance) expert assistant. 
Answer questions about sustainability, social responsibility, governance, compliance, carbon reduction, and company ESG data.

Current User: ${session.name} (Role: ${session.role})
Current Department: ${deptInfo ? `${deptInfo.name} (${deptInfo.code})` : 'Corporate Office'}
Question Focus: ${questionFocus}

Department ESG Scores:
- Environmental: ${deptInfo?.envScore ?? '85.00'}
- Social: ${deptInfo?.socialScore ?? '90.00'}
- Governance: ${deptInfo?.govScore ?? '95.00'}
- Overall: ${deptInfo?.totalScore ?? '89.50'}

Recent Carbon Transactions in user's department:
${
  carbonInfo && carbonInfo.length > 0
    ? carbonInfo
        .map(
          (t) =>
            `- ${t.department.name}: ${t.type} of ${t.quantity} ${t.emissionFactor.unit} (${t.emissionFactor.name}): ${t.calculatedCO2} tons of CO2`
        )
        .join('\n')
    : 'No recent transactions recorded.'
}

Environmental Goals:
${
  environmentalGoals.length > 0
    ? environmentalGoals
        .map((goal) => `- ${goal.department.name}: ${goal.name}, ${goal.currentCO2}/${goal.targetCO2} tons CO2, status ${goal.status}, due ${goal.deadline.toISOString().slice(0, 10)}`)
        .join('\n')
    : 'No active environmental goals found for this scope.'
}

Social / CSR Context:
- Active CSR activities available: ${activeActivities.length}
- My CSR participation counts: ${JSON.stringify(participationCounts)}
- Pending CSR reviews for my role: ${pendingCSRReviews}
- Active challenges available: ${activeChallenges.length}
- My challenge participation counts: ${JSON.stringify(challengeParticipationCounts)}
Upcoming CSR activities:
${
  activeActivities.length > 0
    ? activeActivities.map((activity) => `- ${activity.title} (${activity.category.name}): ${activity.pointsReward} points, ${activity.xpReward} XP, due ${activity.deadline.toISOString().slice(0, 10)}`).join('\n')
    : 'No active CSR activities found.'
}
Active challenges:
${
  activeChallenges.length > 0
    ? activeChallenges.map((challenge) => `- ${challenge.title} (${challenge.category.name}, ${challenge.difficulty}): ${challenge.xpReward} XP, due ${challenge.deadline.toISOString().slice(0, 10)}`).join('\n')
    : 'No active challenges found.'
}

Governance / Compliance Context:
- Active policies: ${policies.length}
- Policies I have not acknowledged: ${unacknowledgedPolicies.length}
- Audit status counts: ${JSON.stringify(auditCounts)}
- Compliance issue status counts: ${JSON.stringify(complianceCounts)}
- Compliance issues owned by me: ${myOwnedComplianceIssues.length}
Unacknowledged policies:
${
  unacknowledgedPolicies.length > 0
    ? unacknowledgedPolicies.map((policy) => `- ${policy.title}${policy.department ? ` (${policy.department.name})` : ' (company-wide)'}`).join('\n')
    : 'None.'
}
Recent audits:
${
  audits.length > 0
    ? audits.map((audit) => `- ${audit.title}: ${audit.status}, ${audit.department.name}, auditor ${audit.auditor.name}, date ${audit.date.toISOString().slice(0, 10)}`).join('\n')
    : 'No audits found.'
}
Priority compliance issues:
${
  complianceIssues.length > 0
    ? complianceIssues.map((issue) => `- ${issue.severity} ${issue.status}: ${issue.description} (owner ${issue.owner.name}, due ${issue.dueDate.toISOString().slice(0, 10)})`).join('\n')
    : 'No compliance issues found.'
}

Company-wide Department Rankings:
${companyDepartments
  .map(
    (d) =>
      `- ${d.name}: Overall ${d.totalScore} (E: ${d.envScore}, S: ${d.socialScore}, G: ${d.govScore})`
  )
  .join('\n')}

Guidelines:
1. Use the Question Focus and User Question to answer the topic asked. Do not default to environmental advice for social or governance questions.
2. Do not answer by only giving scores. Explain what the user can do, what site data supports it, and what module/page they should use next.
3. Use the live context above when it is relevant. Mention exact counts, policies, audits, issues, activities, challenges, scores, or goals when helpful.
4. For governance questions, prioritize policy acknowledgements, audits, compliance issue status, owners, severity, and due dates.
5. For social questions, prioritize CSR activities, participations, pending reviews, challenges, rewards, XP, and employee engagement.
6. For environmental questions, prioritize scores, carbon transactions, emission factors, goals, and reduction actions.
7. If the user's request is vague, answer with a short recommendation and ask one useful follow-up question.
8. Be professional, concise, and format answers cleanly using Markdown.
9. Keep the context in mind but do not dump it word-for-word unless asked.`;

    const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}\n\nAssistant Response:`;

    const responseText = await generateAIContent(fullPrompt);

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process AI chat request' }, { status: 500 });
  }
}
