'use server';

import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function updateProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: 'Unauthorized' };

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!name?.trim() || !email?.trim()) {
    return { error: 'Name and email are required.' };
  }

  try {
    // Check if email already taken by another user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.userId) {
      return { error: 'This email is already in use by another account.' };
    }

    const updateData: any = { name: name.trim(), email: email.trim() };

    // Handle password change if provided
    if (newPassword) {
      if (!currentPassword) return { error: 'Current password is required to set a new password.' };
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (!user) return { error: 'User not found.' };
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) return { error: 'Current password is incorrect.' };
      if (newPassword.length < 8) return { error: 'New password must be at least 8 characters.' };
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true };
  } catch (e: any) {
    console.error('Profile update error:', e);
    return { error: 'Failed to update profile. Please try again.' };
  }
}
