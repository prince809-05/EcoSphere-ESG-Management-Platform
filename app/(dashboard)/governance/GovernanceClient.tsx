'use client';

import React, { useState } from 'react';
import { 
  createESGBPolicyAction, 
  acknowledgePolicyAction, 
  createAuditAction, 
  createComplianceIssueAction, 
  resolveComplianceIssueAction 
} from '@/actions/governance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Scale, 
  CheckCircle, 
  BookOpen, 
  FileWarning, 
  FileSpreadsheet, 
  Loader2, 
  User as UserIcon,
  AlertTriangle
} from 'lucide-react';

interface GovernanceClientProps {
  session: { userId: string; role: string; departmentId: string | null; name: string };
  policies: any[];
  myAcknowledgements: string[]; // List of policy IDs this user acknowledged
  audits: any[];
  complianceIssues: any[];
  departments: any[];
  users: any[]; // List of employees for owner assignment
}

export default function GovernanceClient({
  session,
  policies,
  myAcknowledgements,
  audits,
  complianceIssues,
  departments,
  users,
}: GovernanceClientProps) {
  const [activeTab, setActiveTab] = useState<'policies' | 'audits' | 'compliance'>('policies');
  
  // Modals
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Selected audit for viewing details
  const [selectedAudit, setSelectedAudit] = useState<any | null>(null);

  const handleAcknowledge = async (policyId: string) => {
    // Generate dummy IP address or retrieve if possible, let's use a standard mock IP
    const ipAddress = '192.168.1.' + Math.floor(Math.random() * 254 + 1);
    const res = await acknowledgePolicyAction(policyId, ipAddress);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Policy acknowledged successfully!');
      window.location.reload();
    }
  };

  const handleResolveIssue = async (id: string) => {
    const res = await resolveComplianceIssueAction(id);
    if (res.error) {
      alert(res.error);
    } else {
      alert('Compliance issue resolved!');
      window.location.reload();
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      departmentId: formData.get('departmentId') as string || null,
      status: 'ACTIVE',
    };

    const res = await createESGBPolicyAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setPolicyModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateAudit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      departmentId: formData.get('departmentId') as string,
      auditorId: formData.get('auditorId') as string,
      date: formData.get('date') as string,
      findings: '[]',
      status: 'SCHEDULED',
    };

    const res = await createAuditAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setAuditModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateCompliance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      auditId: formData.get('auditId') as string,
      severity: formData.get('severity') as string,
      description: formData.get('description') as string,
      ownerId: formData.get('ownerId') as string,
      dueDate: formData.get('dueDate') as string,
      status: 'OPEN',
    };

    const res = await createComplianceIssueAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setComplianceModalOpen(false);
      window.location.reload();
    }
  };

  const isEmployee = session.role === 'EMPLOYEE';
  const isAuditorOrAdmin = session.role === 'ADMIN' || session.role === 'AUDITOR';
  const canScheduleAudit = true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-400" />
            Governance Module
          </h1>
          <p className="text-xs text-slate-600 mt-1">Oversee regulatory compliance audits, raise issues, and distribute ESG policies.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'policies' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Company Policies
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'audits' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Compliance Audits
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'compliance' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Compliance Issues
        </button>
      </div>

      {/* --- 1. POLICIES TAB --- */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          {session.role === 'ADMIN' && (
            <div className="flex justify-end">
              <button
                onClick={() => setPolicyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Publish Policy
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {policies.map((policy) => {
              const isAcknowledged = myAcknowledgements.includes(policy.id);
              const ack = policy.acknowledgements?.find((a: any) => a.employeeId === session.userId);

              return (
                <div key={policy.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 backdrop-blur-md flex flex-col justify-between hover:border-zinc-700 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {policy.department ? `Dept: ${policy.department.name}` : 'Company-Wide'}
                      </span>
                      <Badge className={`${
                        isAcknowledged ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      } text-[9px] border font-bold uppercase`}>
                        {isAcknowledged ? 'Acknowledged' : 'Pending Action'}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-2 leading-snug">{policy.title}</h3>
                    <p className="text-xs text-slate-700 mt-3 whitespace-pre-line leading-relaxed">
                      {policy.content}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>Effective: {new Date(policy.effectiveDate).toLocaleDateString('en-US')}</span>
                    {isEmployee && !isAcknowledged && (
                      <button
                        onClick={() => handleAcknowledge(policy.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
                      >
                        Acknowledge Policy
                      </button>
                    )}
                    {isAcknowledged && ack && (
                      <span className="text-emerald-400 italic">
                        Acknowledged on {new Date(ack.acknowledgedAt).toLocaleDateString('en-US')} (IP: {ack.ipAddress || 'Unknown'})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- 2. COMPLIANCE AUDITS TAB --- */}
      {activeTab === 'audits' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <FileSpreadsheet className="w-4.5 h-4.5 text-slate-500" />
              Audits Database
            </CardTitle>
            {canScheduleAudit && (
              <button
                onClick={() => setAuditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Schedule Audit
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Audit Title</th>
                  <th className="p-4">Audited Department</th>
                  <th className="p-4">Auditor</th>
                  <th className="p-4 text-center">Findings Count</th>
                  <th className="p-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {audits.map((audit) => {
                  const findingsList = Array.isArray(audit.findings) ? audit.findings : [];
                  return (
                    <tr
                      key={audit.id}
                      onClick={() => setSelectedAudit(audit)}
                      className="hover:bg-slate-50 cursor-pointer transition-all text-slate-800"
                    >
                      <td className="p-4">{new Date(audit.date).toLocaleDateString('en-US')}</td>
                      <td className="p-4 font-semibold text-blue-400 hover:underline">{audit.title}</td>
                      <td className="p-4">{audit.department.name} ({audit.department.code})</td>
                      <td className="p-4 text-slate-600">{audit.auditor.name}</td>
                      <td className="p-4 text-center font-bold text-slate-700">{findingsList.length} items</td>
                      <td className="p-4 text-center">
                        <Badge className={`${
                          audit.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          audit.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-slate-100 text-slate-600'
                        } text-[9px] border font-bold uppercase`}>
                          {audit.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- 3. COMPLIANCE ISSUES TAB --- */}
      {activeTab === 'compliance' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <FileWarning className="w-4.5 h-4.5 text-slate-500" />
              Compliance Log
            </CardTitle>
            {isAuditorOrAdmin && (
              <button
                onClick={() => setComplianceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Raise Compliance Issue
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-4">Audit Source</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Assignee (Owner)</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {complianceIssues.map((issue) => {
                  const isOverdue = issue.status === 'OPEN' && new Date(issue.dueDate) < new Date();
                  const isOwner = issue.ownerId === session.userId;
                  const isManager = session.role === 'MANAGER' && session.departmentId === issue.audit.departmentId;
                  const canResolve = isOwner || isManager || session.role === 'ADMIN';

                  return (
                    <tr key={issue.id} className="hover:bg-slate-50 transition-all text-slate-800">
                      <td className="p-4 font-semibold text-slate-600">{issue.audit.title}</td>
                      <td className="p-4 font-medium">{issue.description}</td>
                      <td className="p-4">
                        <Badge className={`${
                          issue.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                          issue.severity === 'HIGH' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          issue.severity === 'MEDIUM' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                          'bg-slate-100 text-slate-600'
                        } text-[9px] border font-bold uppercase`}>
                          {issue.severity}
                        </Badge>
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 border border-slate-200">
                          <UserIcon className="w-3 h-3 text-slate-600" />
                        </div>
                        {issue.owner.name}
                      </td>
                      <td className="p-4">
                        <span className={isOverdue ? 'text-rose-400 font-bold flex items-center gap-1' : 'text-slate-600'}>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                          {new Date(issue.dueDate).toLocaleDateString('en-US')}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={`${
                          issue.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          isOverdue || issue.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        } text-[9px] border font-bold uppercase`}>
                          {isOverdue ? 'OVERDUE' : issue.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        {issue.status !== 'RESOLVED' && canResolve ? (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="px-2 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-[10px] font-bold text-white transition-all"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. View Audit Findings Details Modal */}
      {selectedAudit && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Audit Findings Details</h3>
            <p className="text-xs text-slate-600 mb-4">{selectedAudit.title} - Audited Dept: {selectedAudit.department.name}</p>
            
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {Array.isArray(selectedAudit.findings) && selectedAudit.findings.map((f: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-blue-400">Finding #{idx + 1}</span>
                    <Badge className="text-[8px] bg-slate-100 text-slate-600 uppercase">{f.status || 'OPEN'}</Badge>
                  </div>
                  <p className="text-slate-700 leading-relaxed mt-1">{f.finding || f}</p>
                </div>
              ))}
              {(!selectedAudit.findings || selectedAudit.findings.length === 0) && (
                <p className="text-xs text-slate-500 italic text-center py-6">No specific findings logged for this audit.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedAudit(null)} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Publish ESG Policy</h3>
            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Policy Title</label>
                <input name="title" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Green Procurement Standards" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Policy Content</label>
                <textarea name="content" required rows={6} className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs resize-none" placeholder="Enter policy details, clauses, and guidelines for staff..." />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Target Department (Optional)</label>
                <select name="departmentId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                  <option value="">Company-Wide (All Staff)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setPolicyModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Publish Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Schedule Audit Modal */}
      {auditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Schedule Audit</h3>
            <form onSubmit={handleCreateAudit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Audit Title</label>
                <input name="title" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Q3 Energy Efficiency Audit" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Department</label>
                  <select name="departmentId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Auditor</label>
                  <select name="auditorId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {users.filter(u => u.role === 'AUDITOR' || u.role === 'ADMIN').map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Scheduled Date</label>
                <input name="date" type="date" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setAuditModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Raise Compliance Issue Modal */}
      {complianceModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Raise Compliance Issue</h3>
            <form onSubmit={handleCreateCompliance} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Description / Violation</label>
                <input name="description" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Scrapped machinery material disposed of without ethical verification" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Associated Audit</label>
                  <select name="auditId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {audits.map((a) => (
                      <option key={a.id} value={a.id}>{a.title} ({a.department.code})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Severity</label>
                  <select name="severity" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Assignee (Owner)</label>
                  <select name="ownerId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Due Date</label>
                  <input name="dueDate" type="date" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setComplianceModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Raise Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
