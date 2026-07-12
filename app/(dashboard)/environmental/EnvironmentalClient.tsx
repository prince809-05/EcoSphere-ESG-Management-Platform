'use client';

import React, { useState } from 'react';
import { 
  createEmissionFactorAction, 
  updateEmissionFactorAction, 
  deleteEmissionFactorAction,
  createCarbonTransactionAction,
  deleteCarbonTransactionAction,
  createEnvironmentalGoalAction,
  updateEnvironmentalGoalAction,
  deleteEnvironmentalGoalAction,
  getAISuggestionsAction
} from '@/actions/environmental';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Loader2, 
  Leaf, 
  Target, 
  Coins, 
  Settings, 
  AlertCircle 
} from 'lucide-react';

interface EnvironmentalClientProps {
  session: { userId: string; role: string; departmentId: string | null; name: string };
  transactions: any[];
  factors: any[];
  goals: any[];
  departments: any[];
}

export default function EnvironmentalClient({
  session,
  transactions,
  factors,
  goals,
  departments,
}: EnvironmentalClientProps) {
  const [activeTab, setActiveTab] = useState<'transactions' | 'factors' | 'goals'>('transactions');
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Modal Open States
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [factorModalOpen, setFactorModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  // Form Loading States
  const [formLoading, setFormLoading] = useState(false);

  // Form State for Log Carbon
  const [autoCalculated, setAutoCalculated] = useState(true);

  // Check permissions
  const canModifyFactors = session.role === 'ADMIN';
  const canModifyDeptsData = session.role === 'ADMIN' || session.role === 'MANAGER';

  // Get AI Suggestions handler
  const handleGetAISuggestions = async () => {
    // Determine which department to query
    const targetDeptId = session.departmentId || (departments.length > 0 ? departments[0].id : null);
    if (!targetDeptId) return;

    setAiLoading(true);
    setAiSuggestions(null);

    const result = await getAISuggestionsAction(targetDeptId);

    if (result && result.error) {
      setAiSuggestions(`Error: ${result.error}`);
    } else if (result) {
      setAiSuggestions(result.suggestions || 'No recommendations generated.');
    }
    setAiLoading(false);
  };

  // Submit handlers
  const handleLogTx = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      type: formData.get('type') as string,
      quantity: Number(formData.get('quantity')),
      emissionFactorId: formData.get('emissionFactorId') as string,
      departmentId: formData.get('departmentId') as string,
      autoCalculated: autoCalculated,
      manualCO2: !autoCalculated ? Number(formData.get('manualCO2') || 0) : undefined,
    };

    const res = await createCarbonTransactionAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setTxModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateFactor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as string,
      factorValue: Number(formData.get('factorValue')),
      source: formData.get('source') as string,
    };

    const res = await createEmissionFactorAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setFactorModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      targetCO2: Number(formData.get('targetCO2')),
      currentCO2: Number(formData.get('currentCO2')),
      departmentId: formData.get('departmentId') as string,
      deadline: formData.get('deadline') as string,
      status: 'ACTIVE',
    };

    const res = await createEnvironmentalGoalAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setGoalModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteTx = async (id: string, deptId: string) => {
    if (confirm('Are you sure you want to delete this carbon transaction?')) {
      const res = await deleteCarbonTransactionAction(id, deptId);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    }
  };

  const handleDeleteGoal = async (id: string, deptId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      const res = await deleteEnvironmentalGoalAction(id, deptId);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Subpage Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Leaf className="w-6 h-6 text-emerald-400" />
            Environmental Module
          </h1>
          <p className="text-xs text-slate-600 mt-1">Manage carbon footprint accounting, emission factors, and sustainability targets.</p>
        </div>

        {/* AI suggestions action button */}
        {session.departmentId && (
          <button
            onClick={handleGetAISuggestions}
            disabled={aiLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all disabled:opacity-50"
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            )}
            Get AI Suggestions
          </button>
        )}
      </div>

      {/* AI Suggestions Display */}
      {aiSuggestions && (
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-[-30px] right-[-30px] w-20 h-20 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            AI Carbon Reduction Suggestions
          </h3>
          <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line space-y-2">
            {aiSuggestions}
          </div>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'transactions' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Carbon Transactions
        </button>
        <button
          onClick={() => setActiveTab('factors')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'factors' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Emission Factors
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'goals' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Environmental Goals
        </button>
      </div>

      {/* --- 1. CARBON TRANSACTIONS TAB --- */}
      {activeTab === 'transactions' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <Coins className="w-4 h-4 text-slate-500" />
              Transactions Log
            </CardTitle>
            {canModifyDeptsData && (
              <button
                onClick={() => setTxModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                Log Carbon Data
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Factor</th>
                  <th className="p-4 text-right">Calculated CO2</th>
                  {canModifyDeptsData && <th className="p-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-all text-slate-800">
                    <td className="p-4">{new Date(tx.createdAt).toLocaleDateString('en-US')}</td>
                    <td className="p-4 font-medium">{tx.department.name} ({tx.department.code})</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-4">{Number(tx.quantity).toLocaleString()} {tx.emissionFactor.unit}</td>
                    <td className="p-4 text-slate-600">{tx.emissionFactor.name}</td>
                    <td className="p-4 text-right font-extrabold text-emerald-400">
                      {Number(tx.calculatedCO2).toFixed(2)} tons
                    </td>
                    {canModifyDeptsData && (
                      <td className="p-4 text-center">
                        {(session.role === 'ADMIN' || session.departmentId === tx.departmentId) && (
                          <button
                            onClick={() => handleDeleteTx(tx.id, tx.departmentId)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete Transaction"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={canModifyDeptsData ? 7 : 6} className="p-8 text-center text-slate-500">
                      No carbon transactions logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- 2. EMISSION FACTORS TAB --- */}
      {activeTab === 'factors' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              Factors Database
            </CardTitle>
            {canModifyFactors && (
              <button
                onClick={() => setFactorModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                Add Factor
              </button>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-white/80 text-slate-600 border-b border-slate-200 font-semibold">
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Unit</th>
                  <th className="p-4 text-right">Value (CO2/Unit)</th>
                  <th className="p-4">Source</th>
                  {canModifyFactors && <th className="p-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {factors.map((ef) => (
                  <tr key={ef.id} className="hover:bg-slate-50 transition-all text-slate-800">
                    <td className="p-4 font-semibold">{ef.name}</td>
                    <td className="p-4">{ef.category}</td>
                    <td className="p-4 text-slate-600">{ef.unit}</td>
                    <td className="p-4 text-right font-mono text-emerald-400">{Number(ef.factorValue).toFixed(5)}</td>
                    <td className="p-4 text-slate-600 truncate max-w-xs">{ef.source}</td>
                    {canModifyFactors && (
                      <td className="p-4 text-center">
                        <button
                          onClick={async () => {
                            if (confirm('Delete this factor?')) {
                              await deleteEmissionFactorAction(ef.id);
                              window.location.reload();
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* --- 3. ENVIRONMENTAL GOALS TAB --- */}
      {activeTab === 'goals' && (
        <Card className="bg-white border-slate-200 text-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600 flex items-center gap-2">
              <Target className="w-4 h-4 text-slate-500" />
              Sustainability Goals
            </CardTitle>
            {canModifyDeptsData && (
              <button
                onClick={() => setGoalModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                Set Goal
              </button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {goals.map((goal) => {
                const ratio = Math.min(100, Math.max(0, (Number(goal.currentCO2) / Number(goal.targetCO2)) * 100));
                return (
                  <div key={goal.id} className="p-5 rounded-xl bg-white/80 border border-slate-200 relative group">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{goal.name}</h4>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Department: {goal.department.name} ({goal.department.code})
                        </span>
                      </div>
                      <Badge className={`${
                        goal.status === 'ACHIEVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        goal.status === 'EXPIRED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      } text-[9px] border font-bold uppercase`}>
                        {goal.status}
                      </Badge>
                    </div>

                    {/* Progress details */}
                    <div className="mt-4">
                      <div className="flex justify-between items-baseline text-[10px] text-slate-600 mb-1">
                        <span>Current: {Number(goal.currentCO2).toFixed(1)} tons</span>
                        <span className="font-bold text-slate-900">Target: {Number(goal.targetCO2).toFixed(1)} tons</span>
                      </div>
                      <Progress value={ratio} className="h-1.5 bg-white" />
                      <div className="flex justify-between items-center text-[9px] text-slate-500 mt-2">
                        <span>Deadline: {new Date(goal.deadline).toLocaleDateString('en-US')}</span>
                        <span>{ratio.toFixed(0)}% reached</span>
                      </div>
                    </div>

                    {/* Delete actions */}
                    {canModifyDeptsData && (session.role === 'ADMIN' || session.departmentId === goal.departmentId) && (
                      <button
                        onClick={() => handleDeleteGoal(goal.id, goal.departmentId)}
                        className="absolute right-4 bottom-4 p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                  No sustainability goals defined.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- MODAL DIALOGS --- */}

      {/* 1. Log Carbon Transaction Dialog */}
      {txModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Log Carbon Transaction</h3>
            <form onSubmit={handleLogTx} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Transaction Type</label>
                  <select name="type" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    <option value="MANUFACTURING">Manufacturing</option>
                    <option value="PURCHASE">Purchase</option>
                    <option value="FLEET">Fleet</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Department</label>
                  <select name="departmentId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {session.role === 'ADMIN' ? (
                      departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                    ) : (
                      departments.filter(d => d.id === session.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Quantity</label>
                <input name="quantity" type="number" step="any" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. 5000" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Emission Factor Link</label>
                <select name="emissionFactorId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                  {factors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.factorValue} CO2/{f.unit})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="autoCalculated"
                  checked={autoCalculated}
                  onChange={(e) => setAutoCalculated(e.target.checked)}
                  className="rounded border-slate-200 bg-slate-50 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="autoCalculated" className="text-xs font-medium text-slate-700">Auto-calculate CO2 (Quantity × Factor)</label>
              </div>

              {!autoCalculated && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Manual CO2 Entry (Tons)</label>
                  <input name="manualCO2" type="number" step="any" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. 12.5" />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setTxModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Emission Factor Dialog */}
      {factorModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Add Emission Factor</h3>
            <form onSubmit={handleCreateFactor} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Factor Name</label>
                <input name="name" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Natural Gas combustion" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Category</label>
                  <input name="category" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Heating" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Unit</label>
                  <input name="unit" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Therms" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Factor Value (CO2 per Unit)</label>
                <input name="factorValue" type="number" step="any" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. 0.0053" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Source / Methodology</label>
                <input name="source" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Greenhouse Gas Protocol 2024" />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setFactorModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Set Goal Dialog */}
      {goalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white border border-slate-200 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Set Environmental Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-600 uppercase">Goal Title</label>
                <input name="name" type="text" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. Reduce corporate paper waste by 50%" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Target (Tons CO2)</label>
                  <input name="targetCO2" type="number" step="any" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" placeholder="e.g. 5.0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Current (Tons CO2)</label>
                  <input name="currentCO2" type="number" step="any" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" defaultValue="0" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Department</label>
                  <select name="departmentId" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs">
                    {session.role === 'ADMIN' ? (
                      departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)
                    ) : (
                      departments.filter(d => d.id === session.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    )}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-600 uppercase">Deadline</label>
                  <input name="deadline" type="date" required className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setGoalModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 text-xs font-semibold text-slate-600 transition-all">Cancel</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold text-white flex items-center gap-1.5 transition-all">
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Set Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
