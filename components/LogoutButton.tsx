'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/actions/auth';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-rose-400 border border-transparent hover:border-slate-200 transition-all focus:outline-none"
      title="Sign Out"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
    </button>
  );
}
