'use client';

import React, { useState } from 'react';
import { updateProfileAction } from '@/actions/profile';
import {
  User, Mail, Shield, Building2, Zap, Star,
  Trophy, Leaf, Heart, Lock, Save, Loader2, CheckCircle, AlertCircle,
  Calendar, Award, ShoppingBag, Target
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  Leaf, Zap, Trophy, Heart, Star, Award, Shield,
};

const roleColors: Record<string, string> = {
  ADMIN: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  MANAGER: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  AUDITOR: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  EMPLOYEE: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const roleIcon: Record<string, string> = {
  ADMIN: '👑',
  MANAGER: '⚡',
  AUDITOR: '🔍',
  EMPLOYEE: '👤',
};

interface ProfileClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    totalXP: number;
    totalPoints: number;
    createdAt: string;
    department: { name: string; code: string } | null;
    badges: { id: string; unlockedAt: string; badge: { name: string; description: string; icon: string } }[];
    csrCount: number;
    challengeCount: number;
    redemptionCount: number;
    pointsSpent: number;
  };
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    if (currentPassword) fd.append('currentPassword', currentPassword);
    if (newPassword) fd.append('newPassword', newPassword);

    const res = await updateProfileAction(fd);
    setLoading(false);

    if (res?.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage({ type: 'error', text: res?.error || 'Something went wrong.' });
    }
  };

  const xpLevel = Math.floor(user.totalXP / 100) + 1;
  const xpProgress = user.totalXP % 100;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-slate-50 to-violet-500/5 border border-slate-200">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 text-2xl font-extrabold text-emerald-600 shrink-0">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900">{user.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleColors[user.role] || roleColors.EMPLOYEE}`}>
                {roleIcon[user.role]} {user.role}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            {user.department && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                {user.department.name} ({user.department.code})
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Member since {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: `${user.totalXP} XP`, icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20' },
          { label: 'Points Balance', value: `${user.totalPoints} pts`, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'ESG Level', value: `Level ${xpLevel}`, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Badges Earned', value: `${user.badges.length} Badges`, icon: Award, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`p-4 rounded-xl border ${stat.bg} flex flex-col gap-2`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-extrabold text-slate-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Profile Form */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-500" />
            Edit Profile
          </h2>

          {message && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold mb-4 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Change Password (optional)
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
                <input
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Activity & Badges Panel */}
        <div className="space-y-4">
          {/* Activity Summary */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              Activity Summary
            </h2>
            <div className="space-y-3">
              {[
                { label: 'CSR Activities Completed', value: user.csrCount, icon: Heart, color: 'text-rose-500' },
                { label: 'Challenges Completed', value: user.challengeCount, icon: Zap, color: 'text-violet-500' },
                { label: 'Rewards Redeemed', value: user.redemptionCount, icon: ShoppingBag, color: 'text-amber-500' },
                { label: 'Points Spent', value: `${user.pointsSpent} pts`, icon: Star, color: 'text-emerald-500' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                      {item.label}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-500" />
              Unlocked Badges ({user.badges.length})
            </h2>
            {user.badges.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No badges earned yet. Join challenges to unlock your first badge!</p>
            ) : (
              <div className="space-y-3">
                {user.badges.map((eb) => {
                  const Icon = iconMap[eb.badge.icon] || Award;
                  return (
                    <div key={eb.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Icon className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{eb.badge.name}</p>
                        <p className="text-[10px] text-slate-500">{eb.badge.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Unlocked {new Date(eb.unlockedAt).toLocaleDateString('en-US')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
