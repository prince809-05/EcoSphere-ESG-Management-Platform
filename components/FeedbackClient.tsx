'use client';

import React, { useState } from 'react';
import { submitFeedbackAction, updateFeedbackStatusAction } from '@/actions/feedback';
import {
  MessageSquarePlus, Star, Send, Loader2, CheckCircle,
  AlertCircle, Eye, Filter, Clock, CheckCheck, XCircle,
  Inbox, Shield, ChevronDown, ChevronUp, User, Building2
} from 'lucide-react';

const categoryOptions = [
  { value: 'GENERAL', label: 'General Feedback', emoji: '💬' },
  { value: 'BUG_REPORT', label: 'Bug Report', emoji: '🐛' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request', emoji: '✨' },
  { value: 'ESG_DATA', label: 'ESG Data Issue', emoji: '📊' },
  { value: 'UI_UX', label: 'UI / UX Feedback', emoji: '🎨' },
];

const statusColors: Record<string, string> = {
  OPEN: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  REVIEWED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const statusIcon: Record<string, React.ComponentType<any>> = {
  OPEN: Clock,
  REVIEWED: Eye,
  RESOLVED: CheckCheck,
};

interface FeedbackClientProps {
  session: { userId: string; role: string; name: string };
  feedbacks: any[];
}

export default function FeedbackClient({ session, feedbacks }: FeedbackClientProps) {
  const isAdmin = session.role === 'ADMIN';

  // Form state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin filter
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState<Record<string, string>>({});
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormMsg(null);

    const fd = new FormData();
    fd.append('subject', subject);
    fd.append('message', message);
    fd.append('category', category);
    fd.append('rating', String(rating));

    const res = await submitFeedbackAction(fd);
    setFormLoading(false);
    if (res?.success) {
      setFormMsg({ type: 'success', text: 'Feedback submitted! Thank you for helping improve EcoSphere AI.' });
      setSubject(''); setMessage(''); setCategory('GENERAL'); setRating(0);
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setFormMsg({ type: 'error', text: res?.error || 'Something went wrong.' });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdateLoading(id);
    const res = await updateFeedbackStatusAction(id, status, adminNote[id] || '');
    setUpdateLoading(null);
    if (res?.success) window.location.reload();
    else alert(res?.error);
  };

  const filteredFeedbacks = statusFilter === 'ALL'
    ? feedbacks
    : feedbacks.filter((f) => f.status === statusFilter);

  const openCount = feedbacks.filter((f) => f.status === 'OPEN').length;
  const resolvedCount = feedbacks.filter((f) => f.status === 'RESOLVED').length;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-emerald-500" />
            {isAdmin ? 'Feedback Inbox' : 'Submit Feedback'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Review and respond to all user feedback submissions.'
              : 'Share your thoughts, report bugs, or request features to help improve the platform.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center min-w-[80px]">
              <p className="text-lg font-extrabold text-amber-600">{openCount}</p>
              <p className="text-[9px] font-bold text-amber-500 uppercase">Open</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[80px]">
              <p className="text-lg font-extrabold text-emerald-600">{resolvedCount}</p>
              <p className="text-[9px] font-bold text-emerald-500 uppercase">Resolved</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center min-w-[80px]">
              <p className="text-lg font-extrabold text-slate-700">{feedbacks.length}</p>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Total</p>
            </div>
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${isAdmin ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* ── Submit Form (All users) ── */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm h-fit">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-500" />
            {isAdmin ? 'Submit Admin Feedback' : 'New Feedback'}
          </h2>

          {formMsg && (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-xs font-semibold mb-4 ${formMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'}`}>
              {formMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {formMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Category</label>
              <div className="grid grid-cols-1 gap-1.5">
                {categoryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      category === opt.value
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.emoji}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Star Rating */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Overall Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-xs text-slate-500 ml-2 self-center">
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Brief summary of your feedback..."
                className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all"
              />
            </div>

            {/* Message */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500 uppercase">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                placeholder="Describe your feedback in detail..."
                className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={formLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {formLoading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>

        {/* ── Submissions List ── */}
        <div className={`space-y-4 ${isAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-500" />
              {isAdmin ? 'All Submissions' : 'My Submissions'}
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-slate-50 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl bg-white border border-slate-200">
              <Inbox className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No feedback yet</p>
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin ? 'No submissions match this filter.' : 'Use the form to submit your first feedback!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFeedbacks.map((f) => {
                const StatusIcon = statusIcon[f.status] || Clock;
                const catInfo = categoryOptions.find((c) => c.value === f.category);
                const isExpanded = expandedId === f.id;

                return (
                  <div key={f.id} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                    {/* Card Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      className="w-full flex items-start justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-slate-900 truncate">{f.subject}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColors[f.status]}`}>
                            <StatusIcon className="w-2.5 h-2.5" />
                            {f.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                          <span>{catInfo?.emoji} {catInfo?.label}</span>
                          {isAdmin && f.user && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {f.user.name}
                              {f.user.department && (
                                <span className="flex items-center gap-0.5">
                                  <Building2 className="w-2.5 h-2.5" />
                                  {f.user.department.name}
                                </span>
                              )}
                            </span>
                          )}
                          {f.rating > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500">
                              {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                            </span>
                          )}
                          <span>{new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                        <p className="text-xs text-slate-700 leading-relaxed mt-3">{f.message}</p>

                        {/* Admin Note */}
                        {f.adminNote && (
                          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Admin Response
                            </p>
                            <p className="text-xs text-slate-700">{f.adminNote}</p>
                          </div>
                        )}

                        {/* Admin Controls */}
                        {isAdmin && (
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Admin Response & Status</p>
                            <textarea
                              rows={2}
                              placeholder="Write a response or note for this feedback..."
                              value={adminNote[f.id] || f.adminNote || ''}
                              onChange={(e) => setAdminNote({ ...adminNote, [f.id]: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none"
                            />
                            <div className="flex gap-2 flex-wrap">
                              {['REVIEWED', 'RESOLVED'].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusUpdate(f.id, s)}
                                  disabled={updateLoading === f.id || f.status === s}
                                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all disabled:opacity-50 ${
                                    s === 'RESOLVED'
                                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                                  }`}
                                >
                                  {updateLoading === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  Mark {s.charAt(0) + s.slice(1).toLowerCase()}
                                </button>
                              ))}
                              {f.status !== 'OPEN' && (
                                <button
                                  onClick={() => handleStatusUpdate(f.id, 'OPEN')}
                                  disabled={updateLoading === f.id}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white transition-all disabled:opacity-50"
                                >
                                  Reopen
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
