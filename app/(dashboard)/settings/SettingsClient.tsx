'use client';

import React, { useState } from 'react';
import { 
  updateSettingsAction, 
  createDepartmentAction, 
  updateDepartmentAction, 
  deleteDepartmentAction, 
  createCategoryAction, 
  deleteCategoryAction 
} from '@/actions/settings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Sliders, 
  SlidersHorizontal,
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle,
  FolderTree
} from 'lucide-react';

interface SettingsClientProps {
  initialSettings: any;
  departments: any[];
  categories: any[];
}

export default function SettingsClient({
  initialSettings,
  departments,
  categories,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'departments' | 'categories'>('config');
  const [formLoading, setFormLoading] = useState(false);

  // ESG config form states
  const config = initialSettings?.config || {
    weights: { env: 0.4, social: 0.3, gov: 0.3 },
    autoEmissionCalculation: true,
    requireEvidenceForCSR: true,
    autoAwardBadges: true,
    emailNotifications: true,
  };

  const [envWeight, setEnvWeight] = useState(config.weights?.env ?? 0.4);
  const [socialWeight, setSocialWeight] = useState(config.weights?.social ?? 0.3);
  const [govWeight, setGovWeight] = useState(config.weights?.gov ?? 0.3);

  const [autoEmission, setAutoEmission] = useState(config.autoEmissionCalculation ?? true);
  const [requireEvidence, setRequireEvidence] = useState(config.requireEvidenceForCSR ?? true);
  const [autoBadges, setAutoBadges] = useState(config.autoAwardBadges ?? true);
  const [emailNotif, setEmailNotif] = useState(config.emailNotifications ?? true);

  const totalWeight = Number(envWeight) + Number(socialWeight) + Number(govWeight);
  const weightsValid = Math.abs(totalWeight - 1.0) < 0.001;

  const handleSaveConfig = async () => {
    if (!weightsValid) {
      alert('Error: The sum of E, S, and G weights must equal 1.0 (current sum: ' + totalWeight.toFixed(2) + ')');
      return;
    }

    setFormLoading(true);
    const updatedConfig = {
      weights: {
        env: Number(envWeight),
        social: Number(socialWeight),
        gov: Number(govWeight),
      },
      autoEmissionCalculation: autoEmission,
      requireEvidenceForCSR: requireEvidence,
      autoAwardBadges: autoBadges,
      emailNotifications: emailNotif,
    };

    const res = await updateSettingsAction(updatedConfig);
    setFormLoading(false);

    if (res.error) {
      alert(res.error);
    } else {
      alert('ESG Configuration saved successfully! Department scores will be updated on the next carbon/CSR transaction.');
    }
  };

  // Departments CRUD handlers
  const handleCreateDept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      status: 'ACTIVE',
    };

    const res = await createDepartmentAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (confirm('Delete this department? Users and logs linked to it will be affected.')) {
      const res = await deleteDepartmentAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    }
  };

  // Categories CRUD handlers
  const handleCreateCat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
    };

    const res = await createCategoryAction(data);
    setFormLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      window.location.reload();
    }
  };

  const handleDeleteCat = async (id: string) => {
    if (confirm('Delete this category? Ensure no activities or challenges are linked to it.')) {
      const res = await deleteCategoryAction(id);
      if (res.error) {
        alert(res.error);
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-400" />
          Settings & Configurations
        </h1>
        <p className="text-xs text-slate-400 mt-1">Configure global ESG weights, toggle system flags, manage departments and categories.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'config' ? 'border-slate-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          ESG Score Configuration
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'departments' ? 'border-slate-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Departments Management
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'categories' ? 'border-slate-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Activity Categories
        </button>
      </div>

      {/* --- 1. ESG SCORE CONFIGURATION TAB --- */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weight Adjustments */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <SlidersHorizontal className="w-4.5 h-4.5 text-slate-500" />
                  Pillar Weightings Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  {/* Env Weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-emerald-400">Environmental Weight (E)</span>
                      <span>{(Number(envWeight) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={envWeight}
                      onChange={(e) => setEnvWeight(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>

                  {/* Social Weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-amber-400">Social Weight (S)</span>
                      <span>{(Number(socialWeight) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={socialWeight}
                      onChange={(e) => setSocialWeight(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Gov Weight */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-blue-400">Governance Weight (G)</span>
                      <span>{(Number(govWeight) * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={govWeight}
                      onChange={(e) => setGovWeight(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                </div>

                {/* Validation Info */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`w-4.5 h-4.5 ${weightsValid ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className="font-semibold">Sum of Weights: {totalWeight.toFixed(2)}</span>
                  </div>
                  <Badge className={`${
                    weightsValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  } border text-[9px] font-bold uppercase`}>
                    {weightsValid ? 'Valid Allocation' : 'Invalid Allocation (Must equal 1.0)'}
                  </Badge>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800/60">
                  <button
                    onClick={handleSaveConfig}
                    disabled={formLoading || !weightsValid}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-850 text-xs font-semibold text-white transition-all shadow-md shadow-emerald-500/10"
                  >
                    {formLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Configuration
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engine Config Toggles */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  ESG Calculation Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">Auto Emission Calculation</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Derive CO2 from factor values automatically</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoEmission}
                    onChange={(e) => setAutoEmission(e.target.checked)}
                    className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">Require Evidence for CSR</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Block approvals without proof file link</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireEvidence}
                    onChange={(e) => setRequireEvidence(e.target.checked)}
                    className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">Badge Auto-Awarding</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Award badges instantly when rule threshold matches</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoBadges}
                    onChange={(e) => setAutoBadges(e.target.checked)}
                    className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-bold text-slate-200">Email Notifications</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Send alerts for compliance/CSR actions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotif}
                    onChange={(e) => setEmailNotif(e.target.checked)}
                    className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- 2. DEPARTMENTS TAB --- */}
      {activeTab === 'departments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Table */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                      <th className="p-4">Name</th>
                      <th className="p-4">Code</th>
                      <th className="p-4 text-center">Employees</th>
                      <th className="p-4 text-center">ESG Score</th>
                      <th className="p-4 text-center font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-850/25 transition-all text-slate-200">
                        <td className="p-4 font-semibold">{dept.name}</td>
                        <td className="p-4 text-slate-400">{dept.code}</td>
                        <td className="p-4 text-center font-bold">{dept.employeeCount} staff</td>
                        <td className="p-4 text-center font-extrabold text-violet-400">
                          {Number(dept.totalScore).toFixed(1)} / 100
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteDept(dept.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete Department"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Create Form */}
          <div>
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <FolderTree className="w-4.5 h-4.5 text-slate-500" />
                  Add Department
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateDept} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Department Name</label>
                    <input name="name" type="text" required className="w-full p-2.5 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs" placeholder="e.g. Quality Assurance" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Department Code</label>
                    <input name="code" type="text" required className="w-full p-2.5 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs" placeholder="e.g. QA" />
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
                  >
                    {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create Department
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* --- 3. CATEGORIES TAB --- */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List Table */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                      <th className="p-4">Category Name</th>
                      <th className="p-4">Pillar type</th>
                      <th className="p-4 text-center font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-850/25 transition-all text-slate-200">
                        <td className="p-4 font-semibold">{cat.name}</td>
                        <td className="p-4">
                          <Badge className={`${
                            cat.type === 'CSR_ACTIVITY' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          } text-[9px] border font-bold uppercase`}>
                            {cat.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteCat(cat.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Create Form */}
          <div>
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="pb-4 border-b border-slate-800">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-slate-500" />
                  Add Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleCreateCat} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Category Name</label>
                    <input name="name" type="text" required className="w-full p-2.5 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs" placeholder="e.g. Energy Reduction" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase">Category Type</label>
                    <select name="type" className="w-full p-2.5 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs">
                      <option value="CSR_ACTIVITY">CSR Activity Category</option>
                      <option value="CHALLENGE">Challenge Category</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/10"
                  >
                    {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create Category
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
