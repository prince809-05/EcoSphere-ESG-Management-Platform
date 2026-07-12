'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function markAsReadAction(id: string) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { error: 'Failed to update notification' };
  }
}

export async function markAllAsReadAction() {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  try {
    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { error: 'Failed to update notifications' };
  }
}
