'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function submitFeedbackAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const subject = formData.get('subject') as string;
  const message = formData.get('message') as string;
  const category = formData.get('category') as string;
  const rating = Number(formData.get('rating') || 0);

  if (!subject?.trim() || !message?.trim()) {
    return { error: 'Subject and message are required.' };
  }

  try {
    await prisma.feedback.create({
      data: {
        userId: session.userId,
        subject: subject.trim(),
        message: message.trim(),
        category: category as any,
        rating,
        status: 'OPEN',
      },
    });

    revalidatePath('/feedback');
    return { success: true };
  } catch (e: any) {
    console.error('Feedback submit error:', e);
    return { error: 'Failed to submit feedback. Please try again.' };
  }
}

export async function updateFeedbackStatusAction(feedbackId: string, status: string, adminNote: string) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { error: 'Unauthorized' };

  try {
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status: status as any,
        adminNote: adminNote.trim() || null,
      },
    });

    revalidatePath('/feedback');
    return { success: true };
  } catch (e: any) {
    return { error: 'Failed to update feedback.' };
  }
}
