'use client';

import React, { useState } from 'react';
import { 
  createCSRActivityAction, 
  deleteCSRActivityAction,
  joinCSRActivityAction, 
  uploadProofCSRAction, 
  approveParticipationAction 
} from '@/actions/social';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Users, 
  Clock, 
  FileCheck, 
  ArrowRight, 
  ExternalLink,
  Loader2, 
  Heart,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SocialClientProps {
  session: { userId: string; role: string; departmentId: string | null; name: string };
  activities: any[];
  myParticipations: any[];
  pendingParticipations: any[];
  categories: any[];
}

export default function SocialClient({
  session,
  activities,
  myParticipations,
  pendingParticipations,
  categories,
}: SocialClientProps) {
  const [activeTab, setActiveTab] = useState<'activities' | 'queue' | 'history'>('activities');
  
  // Modals
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // States for proof uploads
  const [proofInputs, setProofInputs] = useState<{ [key: string]: string }>({});

  const handleJoin = async (activityId: string) => {
    const res = await joinCSRActivityAction(activityId);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleUploadProof = async (participationId: string) => {
    const proofUrl = proofInputs[participationId];
    if (!proofUrl || !proofUrl.trim()) {
      alert('Please enter a valid proof URL or description');
      return;
    }

    const res = await uploadProofCSRAction(participationId, proofUrl);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Proof uploaded successfully! Awaiting review.');
      window.location.reload();
    }
  };

  const handleApproval = async (participationId: string, status: 'APPROVED' | 'REJECTED') => {
    const res = await approveParticipationAction(participationId, status);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleCreateActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      categoryId: formData.get('categoryId') as string,
      pointsReward: Number(formData.get('pointsReward')),
      xpReward: Number(formData.get('xpReward')),
      deadline: formData.get('deadline') as string,
      status: 'ACTIVE',
    };

    const res = await createCSRActivityAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setActivityModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteActivity = async (id: string) => {
    if (confirm('Are you sure you want to delete this CSR activity?')) {
      const res = await deleteCSRActivityAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    }
  };

  // Helper check if employee is already participating
  const getParticipation = (activityId: string) => {
    return myParticipations.find((p) => p.activityId === activityId);
  };

  const isEmployee = session.role === 'EMPLOYEE';
  const showQueue = session.role === 'ADMIN' || session.role === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            Social (CSR) Module
          </h1>
          <p className="text-xs text-slate-400 mt-1">Engage in Corporate Social Responsibility (CSR), log participation, and award volunteer rewards.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('activities')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'activities' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Activities Catalog
        </button>
        {showQueue && (
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all relative ${
              activeTab === 'queue' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Approval Queue
            {pendingParticipations.length > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold animate-pulse">
                {pendingParticipations.length}
              </span>
            )}
          </button>
        )}
        {isEmployee && (
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'history' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            My CSR History
          </button>
        )}
      </div>

      {/* --- 1. ACTIVITIES CATALOG TAB --- */}
      {activeTab === 'activities' && (
        <div className="space-y-6">
          {session.role === 'ADMIN' && (
            <div className="flex justify-end">
              <button
                onClick={() => setActivityModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white transition-all shadow-md shadow-amber-500/10"
              >
                <Plus className="w-4 h-4" />
                Add CSR Activity
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((act) => {
              const part = getParticipation(act.id);
              const isDeadlinePassed = new Date(act.deadline) < new Date();

              return (
                <div key={act.id} className="flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative group hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {act.category.name}
                      </span>
                      {session.role === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-2 leading-snug">{act.title}</h3>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                      {act.description}
                    </p>

                    {/* Rewards indicators */}
                    <div className="flex gap-4 mt-4 text-[10px] font-bold">
                      <span className="text-amber-400">+{act.pointsReward} Points</span>
                      <span className="text-violet-400">+{act.xpReward} XP</span>
                      <span className="text-slate-500">Till {new Date(act.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Employee actions block */}
                  {isEmployee && (
                    <div className="mt-5 pt-4 border-t border-slate-800/60">
                      {!part ? (
                        <button
                          onClick={() => handleJoin(act.id)}
                          disabled={isDeadlinePassed}
                          className="w-full flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white transition-all disabled:opacity-50"
                        >
                          Register Activity
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Registration status:</span>
                            <Badge className={`${
                              part.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              part.approvalStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            } text-[9px] border font-bold uppercase`}>
                              {part.approvalStatus}
                            </Badge>
                          </div>

                          {part.approvalStatus === 'PENDING' && !part.proofUrl && (
                            <div className="space-y-2">
                              <label className="text-[10px] text-slate-400 font-semibold uppercase block">Submit Proof (URL or description)</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Link to photos or write description..."
                                  value={proofInputs[part.id] || ''}
                                  onChange={(e) => setProofInputs({ ...proofInputs, [part.id]: e.target.value })}
                                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-[11px] placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                                <button
                                  onClick={() => handleUploadProof(part.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white transition-all"
                                >
                                  Submit
                                </button>
                              </div>
                            </div>
                          )}

                          {part.proofUrl && part.approvalStatus === 'PENDING' && (
                            <p className="text-[10px] text-slate-500 italic text-center">Proof submitted. Awaiting manager review.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {activities.length === 0 && (
              <p className="col-span-3 text-center text-slate-500 py-8 text-xs">No active CSR activities catalog.</p>
            )}
          </div>
        </div>
      )}

      {/* --- 2. MANAGER APPROVAL QUEUE TAB --- */}
      {activeTab === 'queue' && showQueue && (
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
              <FileCheck className="w-4.5 h-4.5 text-slate-500" />
              Pending Approvals Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Activity Title</th>
                  <th className="p-4">Proof Submitted</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingParticipations.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-800/25 transition-all text-slate-200">
                    <td className="p-4 font-semibold">{part.employee.name}</td>
                    <td className="p-4">{part.employee.department?.name || 'Corporate'}</td>
                    <td className="p-4 font-medium text-amber-400">{part.activity.title}</td>
                    <td className="p-4 text-slate-400 max-w-xs truncate">
                      {part.proofUrl && part.proofUrl.startsWith('http') ? (
                        <a
                          href={part.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-1.5"
                        >
                          View evidence URL
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        part.proofUrl || 'No proof provided'
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleApproval(part.id, 'APPROVED')}
                          className="p-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(part.id, 'REJECTED')}
                          className="p-1 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-bold flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingParticipations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No pending participations for review.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- 3. EMPLOYEE HISTORY TAB --- */}
      {activeTab === 'history' && isEmployee && (
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-slate-500" />
              My CSR Activities History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-semibold">
                  <th className="p-4">Activity Title</th>
                  <th className="p-4">Points Earned</th>
                  <th className="p-4">Completion Date</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myParticipations.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-800/25 transition-all text-slate-200">
                    <td className="p-4 font-semibold">{part.activity.title}</td>
                    <td className="p-4 font-bold text-amber-400">+{part.pointsEarned} pts</td>
                    <td className="p-4 text-slate-400">
                      {part.completedAt ? new Date(part.completedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`${
                        part.approvalStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        part.approvalStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      } text-[9px] border font-bold uppercase`}>
                        {part.approvalStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {myParticipations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-500">
                      You haven&apos;t joined any CSR activities yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- ADD CSR ACTIVITY MODAL --- */}
      {activityModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Add CSR Activity</h3>
            <form onSubmit={handleCreateActivity} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Activity Title</label>
                <input name="title" type="text" required className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs" placeholder="e.g. Annual Reforestation drive" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase">Description</label>
                <textarea name="description" required rows={3} className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs resize-none" placeholder="e.g. Join the manufacturing and logistics departments to plant over 500 saplings in the local forest belt..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Points Reward</label>
                  <input name="pointsReward" type="number" required defaultValue="100" className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">XP Reward</label>
                  <input name="xpReward" type="number" required defaultValue="150" className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Category</label>
                  <select name="categoryId" className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs">
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase">Deadline</label>
                  <input name="deadline" type="date" required className="w-full p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setActivityModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-850 hover:bg-slate-800 text-xs font-semibold text-slate-400 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
