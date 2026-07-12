'use client';

import React, { useState } from 'react';
import { updateSettingsAction } from '@/actions/settings';
import { Save, SlidersHorizontal, Loader2, AlertCircle } from 'lucide-react';

interface ESGScoreConfigCardProps {
  initialConfig: any;
}

export default function ESGScoreConfigCard({ initialConfig }: ESGScoreConfigCardProps) {
  const [envWeight, setEnvWeight] = useState(Number(initialConfig?.envWeight ?? initialConfig?.weights?.env ?? 0.4));
  const [socialWeight, setSocialWeight] = useState(Number(initialConfig?.socialWeight ?? initialConfig?.weights?.social ?? 0.3));
  const [govWeight, setGovWeight] = useState(Number(initialConfig?.govWeight ?? initialConfig?.weights?.gov ?? 0.3));
  const [loading, setLoading] = useState(false);

  const totalWeight = envWeight + socialWeight + govWeight;
  const weightsValid = Math.abs(totalWeight - 1) < 0.001;

  const saveConfig = async () => {
    if (!weightsValid) return;

    setLoading(true);
    const res = await updateSettingsAction({
      envWeight,
      socialWeight,
      govWeight,
      autoEmissionCalculation: initialConfig?.autoEmissionCalculation ?? true,
      requireEvidenceForCSR: initialConfig?.requireEvidenceForCSR ?? true,
      autoAwardBadges: initialConfig?.autoAwardBadges ?? true,
      emailNotifications: initialConfig?.emailNotifications ?? true,
    });
    setLoading(false);

    if (res.error) {
      alert(res.error);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-700 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-violet-500" />
            ESG Score Configuration
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">Admin testing controls for weighted score simulation.</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded border ${weightsValid ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-rose-600 border-rose-200 bg-rose-50'}`}>
          Total {totalWeight.toFixed(2)}
        </span>
      </div>

      <div className="space-y-4">
        <WeightSlider label="Environmental" color="emerald" value={envWeight} onChange={setEnvWeight} />
        <WeightSlider label="Social" color="amber" value={socialWeight} onChange={setSocialWeight} />
        <WeightSlider label="Governance" color="blue" value={govWeight} onChange={setGovWeight} />
      </div>

      {!weightsValid && (
        <div className="mt-4 flex items-center gap-2 text-[11px] text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          Weights must add up to exactly 1.00 before saving.
        </div>
      )}

      <button
        onClick={saveConfig}
        disabled={loading || !weightsValid}
        className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-semibold text-white transition-all"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save & Recalculate Scores
      </button>
    </div>
  );
}

function WeightSlider({
  label,
  color,
  value,
  onChange,
}: {
  label: string;
  color: 'emerald' | 'amber' | 'blue';
  value: number;
  onChange: (value: number) => void;
}) {
  const accent = {
    emerald: 'accent-emerald-500 text-emerald-600',
    amber: 'accent-amber-500 text-amber-600',
    blue: 'accent-blue-500 text-blue-600',
  }[color];

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold">
        <span className={accent}>{label}</span>
        <span className="text-slate-800">{(value * 100).toFixed(0)}%</span>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${accent}`}
      />
    </div>
  );
}
