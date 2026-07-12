import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateAIContent } from '@/lib/ai';

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

    // Fetch department scores
    let deptInfo = null;
    let carbonInfo = null;

    if (session.departmentId) {
      deptInfo = await prisma.department.findUnique({
        where: { id: session.departmentId },
      });

      carbonInfo = await prisma.carbonTransaction.findMany({
        where: { departmentId: session.departmentId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          emissionFactor: true,
        },
      });
    }

    // Aggregate overall company score data for reference
    const companyDepartments = await prisma.department.findMany({
      select: {
        name: true,
        totalScore: true,
        envScore: true,
        socialScore: true,
        govScore: true,
      },
    });

    const systemPrompt = `You are EcoSphere AI, an ESG (Environmental, Social, Governance) expert assistant. 
Answer questions about sustainability, carbon reduction, and company ESG data.

Current User: ${session.name} (Role: ${session.role})
Current Department: ${deptInfo ? `${deptInfo.name} (${deptInfo.code})` : 'Corporate Office'}

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
            `- ${t.type} of ${t.quantity} ${t.emissionFactor.unit} (${t.emissionFactor.name}): ${t.calculatedCO2} tons of CO2`
        )
        .join('\n')
    : 'No recent transactions recorded.'
}

Company-wide Department Rankings:
${companyDepartments
  .map(
    (d) =>
      `- ${d.name}: Overall ${d.totalScore} (E: ${d.envScore}, S: ${d.socialScore}, G: ${d.govScore})`
  )
  .join('\n')}

Guidelines:
1. Provide practical, data-driven suggestions for reducing emissions and improving ESG scores.
2. Be professional, highly informative, and encouraging.
3. Be concise and format your answers cleanly using Markdown.
4. Keep the context in mind but do not dump it word-for-word unless asked.`;

    const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}\n\nAssistant Response:`;

    const responseText = await generateAIContent(fullPrompt);

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process AI chat request' }, { status: 500 });
  }
}
