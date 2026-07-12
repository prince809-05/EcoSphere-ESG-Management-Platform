'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { ApiResponse } from '@/types/api';

const notificationIdSchema = z.string().uuid('Invalid notification ID');
const limitSchema = z.number().int().min(1).max(100).optional().default(20);

// --- SERVER ACTIONS ---

export async function markAsRead(notificationId: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    }

    const id = notificationIdSchema.parse(notificationId);

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return { success: false, error: 'Notification not found', code: 'NTF_001' };
    }

    if (notification.userId !== session.userId) {
      return { success: false, error: 'Forbidden: Insufficient privileges', code: 'AUTH_002' };
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[markAsRead]', error);
    return { success: false, error: 'Failed to update notification', code: 'SRV_001' };
  }
}

export async function markAllAsRead(): Promise<ApiResponse<null>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    }

    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });

    revalidatePath('/');
    return { success: true, data: null };
  } catch (error: any) {
    console.error('[markAllAsRead]', error);
    return { success: false, error: 'Failed to update notifications', code: 'SRV_001' };
  }
}

export async function getUnreadCount(): Promise<ApiResponse<number>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    }

    const count = await prisma.notification.count({
      where: { userId: session.userId, read: false },
    });

    return { success: true, data: count };
  } catch (error: any) {
    console.error('[getUnreadCount]', error);
    return { success: false, error: 'Failed to fetch unread count', code: 'SRV_001' };
  }
}

export async function listNotifications(limitInput: unknown): Promise<ApiResponse<any[]>> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Unauthorized', code: 'AUTH_001' };
    }

    const limit = limitSchema.parse(limitInput);

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input: ' + error.issues[0].message, code: 'VAL_001' };
    }
    console.error('[listNotifications]', error);
    return { success: false, error: 'Failed to list notifications', code: 'SRV_001' };
  }
}

// --- INTERNAL UTILITY (NOT EXPOSED DIRECTLY AS CLIENT ACTION) ---

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        read: false,
      },
    });
    return notification;
  } catch (error: any) {
    console.error('[createNotification - Internal]', error);
    // Graceful error logging for notifications to not block core transactions
    return null;
  }
}

export async function markAsReadAction(id: string) {
  const res = await markAsRead(id);
  if (!res.success) return { error: res.error };
  return { success: true };
}

export async function markAllAsReadAction() {
  const res = await markAllAsRead();
  if (!res.success) return { error: res.error };
  return { success: true };
}

