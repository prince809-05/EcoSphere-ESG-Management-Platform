'use client';

import React, { useState } from 'react';
import { 
  joinChallengeAction, 
  updateChallengeProgressAction, 
  approveChallengeParticipationAction, 
  redeemRewardAction, 
  createChallengeAction,
  createRewardAction
} from '@/actions/gamification';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge as BadgeUi } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trophy, 
  Zap, 
  Award, 
  Sparkles, 
  Loader2, 
  Check, 
  ShoppingBag,
  ExternalLink,
  Filter,
  Flame,
  Star,
  Gift
} from 'lucide-react';

interface GamificationClientProps {
  session: { userId: string; role: string; departmentId: string | null; name: string };
  challenges: any[];
  myChallengeParticipations: any[];
  pendingChallengeReviews: any[];
  rewards: any[];
  redemptions: any[];
  badges: any[];
  leaderboard: any[];
  departments: any[];
  categories: any[];
}

export default function GamificationClient({
  session,
  challenges,
  myChallengeParticipations,
  pendingChallengeReviews,
  rewards,
  redemptions,
  badges,
  leaderboard,
  departments,
  categories,
}: GamificationClientProps) {
  const [activeTab, setActiveTab] = useState<'challenges' | 'leaderboard' | 'rewards' | 'history'>('challenges');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  // Modals
  const [challengeModalOpen, setChallengeModalOpen] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // States for updating progress
  const [progressInput, setProgressInput] = useState<{ [key: string]: number }>({});
  const [proofInput, setProofInput] = useState<{ [key: string]: string }>({});

  const handleJoinChallenge = async (challengeId: string) => {
    const res = await joinChallengeAction(challengeId);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleUpdateProgress = async (partId: string, finalProgress: number) => {
    const proofUrl = proofInput[partId] || '';
    const res = await updateChallengeProgressAction(partId, finalProgress, proofUrl);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Progress updated!');
      window.location.reload();
    }
  };

  const handleApproval = async (partId: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await approveChallengeParticipationAction(partId, status);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (confirm('Are you sure you want to redeem this reward?')) {
      const res = await redeemRewardAction(rewardId);
      if ('error' in res) {
        alert(res.error);
      } else {
        alert('Reward redeemed successfully!');
        window.location.reload();
      }
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      categoryId: formData.get('categoryId') as string,
      xpReward: Number(formData.get('xpReward')),
      difficulty: formData.get('difficulty') as string,
      evidenceRequired: formData.get('evidenceRequired') === 'true',
      deadline: formData.get('deadline') as string,
      status: 'ACTIVE',
    };

    const res = await createChallengeAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setChallengeModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateReward = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      pointsRequired: Number(formData.get('pointsRequired')),
      stock: Number(formData.get('stock')),
    };

    const res = await createRewardAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setRewardModalOpen(false);
      window.location.reload();
    }
  };

  // Filter leaderboard
  const filteredLeaderboard = deptFilter === 'ALL' 
    ? leaderboard 
    : leaderboard.filter((u) => u.departmentId === deptFilter);

  const getParticipation = (challengeId: string) => {
    return myChallengeParticipations.find((p) => p.challengeId === challengeId);
  };

  // Find current user's profile stats from leaderboard
  const currentUserStats = leaderboard.find((u) => u.id === session.userId) || { totalXP: 0, totalPoints: 0 };

  const isEmployee = session.role === 'EMPLOYEE';
  const showReviewQueue = session.role === 'ADMIN' || session.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* 1. Header Profile Stats */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-[-50%] left-[-10%] w-[30%] h-[150%] rounded-full bg-violet-500/5 blur-[80px] pointer-events-none" />
        
        {/* Left Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Level Progress</p>
              <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{currentUserStats.totalXP} XP</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Star className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Points Balance</p>
              <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{currentUserStats.totalPoints} Points</h2>
            </div>
          </div>
        </div>

        {/* Right Badges */}
        <div className="flex-1 max-w-sm">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Unlocked Badges ({badges.length})</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((eb) => (
              <BadgeUi key={eb.id} className="bg-slate-50 hover:bg-white border-slate-200 text-[10px] font-bold text-slate-800 flex items-center gap-1.5 px-2.5 py-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                {eb.badge.name}
              </BadgeUi>
            ))}
            {badges.length === 0 && (
              <span className="text-xs text-slate-500 italic">No badges unlocked yet. Join challenges to earn them!</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'challenges' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Challenges
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'leaderboard' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          XP Leaderboard
        </button>
        <button
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'rewards' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Redeem Rewards
        </button>
        {isEmployee && (
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            My Redemptions
          </button>
        )}
      </div>

      {/* --- 1. CHALLENGES TAB --- */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-600">Sustainability Challenges</h3>
            {session.role === 'ADMIN' && (
              <button
                onClick={() => setChallengeModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-semibold text-white transition-all shadow-md shadow-violet-500/10"
              >
                <Plus className="w-4 h-4" />
                Add Challenge
              </button>
            )}
          </div>

          {/* Manager approval queue inside challenges view */}
          {showReviewQueue && pendingChallengeReviews.length > 0 && (
            <Card className="bg-white border-slate-200 text-slate-900 mb-6">
              <CardHeader className="pb-2 border-b border-slate-200">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400 animate-pulse" />
                  Challenge Submissions Awaiting Approval ({pendingChallengeReviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold text-[10px]">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Challenge Title</th>
                      <th className="p-3">Evidence Submitted</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {pendingChallengeReviews.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-50/20 text-slate-800">
                        <td className="p-3 font-semibold">{part.employee.name}</td>
                        <td className="p-3 font-medium text-violet-400">{part.challenge.title}</td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">
                          {part.proofUrl ? (
                            <a href={part.proofUrl} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline flex items-center gap-1">
                              View Evidence
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : 'No proof'}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleApproval(part.id, 'APPROVED')} className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-[10px] font-bold text-white transition-all">Approve</button>
                            <button onClick={() => handleApproval(part.id, 'REJECTED')} className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-[10px] font-bold text-white transition-all">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((c) => {
              const part = getParticipation(c.id);
              const isDeadlinePassed = new Date(c.deadline) < new Date();

              return (
                <div key={c.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 backdrop-blur-md flex flex-col justify-between hover:border-zinc-700 transition-all">
                  <div>
                    <div className="flex justify-between items-start">
                      <BadgeUi className={`${
                        c.difficulty === 'HARD' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        c.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      } text-[9px] border font-bold uppercase`}>
                        {c.difficulty}
                      </BadgeUi>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {c.category.name}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="flex gap-4 mt-4 text-[10px] font-bold text-slate-500">
                      <span className="text-violet-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-violet-400/20 text-violet-400" />
                        +{c.xpReward} XP
                      </span>
                      <span>Till {new Date(c.deadline).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  {/* Participation status / controls */}
                  {isEmployee && (
                    <div className="mt-5 pt-4 border-t border-slate-200">
                      {!part ? (
                        <button
                          onClick={() => handleJoinChallenge(c.id)}
                          disabled={isDeadlinePassed}
                          className="w-full py-2 px-3 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-semibold text-white transition-all disabled:opacity-50"
                        >
                          Join Challenge
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-600">Progress: {part.progress}%</span>
                            <BadgeUi className={`${
                              part.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              part.approvalStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            } text-[9px] border font-bold uppercase`}>
                              {part.approvalStatus}
                            </BadgeUi>
                          </div>
                          <Progress value={part.progress} className="h-1 bg-slate-50" />

                          {part.approvalStatus === 'PENDING' && part.progress < 100 && (
                            <div className="space-y-2 mt-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  placeholder="Progress %"
                                  max="100"
                                  min="0"
                                  value={progressInput[part.id] || ''}
                                  onChange={(e) => setProgressInput({ ...progressInput, [part.id]: Number(e.target.value) })}
                                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-[11px] placeholder-zinc-600 focus:outline-none"
                                />
                                {c.evidenceRequired && (
                                  <input
                                    type="text"
                                    placeholder="Link to proof..."
                                    value={proofInput[part.id] || ''}
                                    onChange={(e) => setProofInput({ ...proofInput, [part.id]: e.target.value })}
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-[11px] placeholder-zinc-600 focus:outline-none"
                                  />
                                )}
                                <button
                                  onClick={() => handleUpdateProgress(part.id, progressInput[part.id] || 0)}
                                  className="px-2.5 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-[10px] font-bold text-white transition-all"
                                >
                                  Update
                                </button>
                              </div>
                            </div>
                          )}

                          {part.progress >= 100 && part.approvalStatus === 'PENDING' && (
                            <p className="text-[10px] text-slate-500 italic text-center">100% complete! Awaiting review.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 2. LEADERBOARD TAB --- */}
      {activeTab === 'leaderboard' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <Trophy className="w-4.5 h-4.5 text-slate-500" />
              XP Leaderboard Ranking
            </CardTitle>
            
            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-600" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="p-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold text-[10px] uppercase">
                  <th className="p-4 text-center w-16">Rank</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Department</th>
                  <th className="p-4 text-right">Points Balance</th>
                  <th className="p-4 text-right pr-6">Level / Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredLeaderboard.map((user, idx) => (
                  <tr key={user.id} className={`hover:bg-slate-50/25 transition-all text-slate-800 ${
                    user.id === session.userId ? 'bg-violet-950/10 border-l-2 border-violet-500' : ''
                  }`}>
                    <td className="p-4 text-center font-extrabold text-slate-600">
                      {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : idx + 1}
                    </td>
                    <td className="p-4 font-semibold flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-50 border border-slate-100 text-[10px] text-slate-600">
                        {user.name.slice(0, 2)}
                      </div>
                      {user.name}{' '}
                      {user.role === 'ADMIN' && <span className="text-[10px] text-emerald-500 font-bold">👑 Admin</span>}
                      {user.role === 'MANAGER' && <span className="text-[10px] text-violet-400 font-bold">⚡ Mgr</span>}
                      {user.role === 'AUDITOR' && <span className="text-[10px] text-amber-400 font-bold">🔍</span>}
                      {user.id === session.userId && <span className="text-[10px] text-blue-400 font-bold">(You)</span>}
                    </td>
                    <td className="p-4 text-slate-600">{user.department?.name || 'Corporate'}</td>
                    <td className="p-4 text-right text-amber-400 font-bold">{user.totalPoints} pts</td>
                    <td className="p-4 text-right pr-6 font-extrabold text-violet-400">{user.totalXP} XP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- 3. REWARDS SHOP TAB --- */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-600">Rewards Catalog</h3>
            {session.role === 'ADMIN' && (
              <button
                onClick={() => setRewardModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-semibold text-white transition-all shadow-md shadow-violet-500/10"
              >
                <Plus className="w-4 h-4" />
                Add Reward
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((rew) => {
              const outOfStock = rew.stock <= 0;
              const insPoints = currentUserStats.totalPoints < rew.pointsRequired;
              
              return (
                <div key={rew.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 backdrop-blur-md flex flex-col justify-between hover:border-zinc-700 transition-all">
                  <div>
                    <div className="flex justify-between items-center">
                      <BadgeUi className={`${
                        outOfStock ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      } text-[9px] border font-bold uppercase`}>
                        {outOfStock ? 'Out of stock' : `${rew.stock} available`}
                      </BadgeUi>
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                        <Star className="w-3.5 h-3.5 fill-amber-400/20" />
                        {rew.pointsRequired} pts
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-3 leading-snug">{rew.name}</h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {rew.description}
                    </p>
                  </div>

                  {isEmployee && (
                    <button
                      onClick={() => handleRedeemReward(rew.id)}
                      disabled={outOfStock || insPoints}
                      className="w-full flex items-center justify-center gap-1.5 mt-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-zinc-850 disabled:to-zinc-850 text-slate-900 text-xs font-semibold shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Redeem Reward
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 4. REDEMPTIONS HISTORY TAB --- */}
      {activeTab === 'history' && isEmployee && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="border-b border-slate-200 pb-4">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <Gift className="w-4.5 h-4.5 text-slate-500" />
              Redemption History Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold uppercase text-[10px]">
                  <th className="p-4">Redeemed Item</th>
                  <th className="p-4">Points Deducted</th>
                  <th className="p-4">Redemption Date</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {redemptions.map((red) => (
                  <tr key={red.id} className="hover:bg-slate-50 transition-all text-slate-800">
                    <td className="p-4 font-semibold">{red.reward.name}</td>
                    <td className="p-4 font-bold text-rose-400">-{red.pointsDeducted} pts</td>
                    <td className="p-4 text-slate-600">{new Date(red.redeemedAt).toLocaleDateString('en-US')}</td>
                    <td className="p-4 text-center">
                      <BadgeUi className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] border font-bold uppercase">
                        {red.status}
                      </BadgeUi>
                    </td>
                  </tr>
                ))}
                {redemptions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      No rewards redeemed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- ADD CHALLENGE MODAL --- */}
      {challengeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Add Challenge</h3>
            <form onSubmit={handleCreateChallenge} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Challenge Title</label>
                <input name="title" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Clean commutes only" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Description</label>
                <textarea name="description" required rows={3} className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs resize-none" placeholder="e.g. Walk or bicycle to work for 5 days. Must upload photos or logs of routes..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Difficulty</label>
                  <select name="difficulty" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">XP Reward</label>
                  <input name="xpReward" type="number" required defaultValue="100" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Category</label>
                  <select name="categoryId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Deadline</label>
                  <input name="deadline" type="date" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Evidence Required</label>
                <select name="evidenceRequired" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                  <option value="false">No (Honest System)</option>
                  <option value="true">Yes (Proof link required)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setChallengeModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD REWARD MODAL --- */}
      {rewardModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Add Reward Catalog</h3>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Reward Name</label>
                <input name="name" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Recycled Notebook and Pen set" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Description</label>
                <textarea name="description" required rows={3} className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs resize-none" placeholder="e.g. Crafted completely from post-consumer waste, branded with EcoSphere..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Points Required</label>
                  <input name="pointsRequired" type="number" required defaultValue="100" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Starting Stock</label>
                  <input name="stock" type="number" required defaultValue="10" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setRewardModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
