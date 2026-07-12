'use client';

import React, { useState } from 'react';
import { generateSimulationRoadmapAction } from '@/actions/ai-actions';
import { Sparkles, Zap, Loader2, X, Trophy } from 'lucide-react';

interface DashboardInsightsProps {
  initialInsights: string[];
}

export default function DashboardInsights({ initialInsights }: DashboardInsightsProps) {
  const [roadmap, setRoadmap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleRunSimulation = async () => {
    setLoading(true);
    setRoadmap(null);
    setModalOpen(true);

    const res = await generateSimulationRoadmapAction();
    if (res.success) {
      setRoadmap(res.data);
    } else {
      setRoadmap(`Simulation Error: ${res.error || 'Failed to generate roadmap.'}`);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 bg-slate-50 backdrop-blur-md flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-600">
                EcoSphere AI Insights
              </h3>
            </div>
            
            <button
              onClick={handleRunSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[10px] font-bold uppercase text-white tracking-wider transition-all shadow-md shadow-emerald-500/15"
            >
              Simulate 100 Score Roadmap
            </button>
          </div>

          <ul className="space-y-4">
            {initialInsights.map((insight, idx) => (
              <li key={idx} className="flex gap-3 text-xs text-slate-800 leading-relaxed items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-500" />
            AI advice updated 5m ago based on current department metrics
          </div>
        </div>
      </div>

      {/* Simulation Overlay Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#f8fafc] border border-slate-200 shadow-2xl relative overflow-hidden">
            {/* Crown decoration blob */}
            <div className="absolute top-[-40px] right-[-40px] w-28 h-28 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500 animate-bounce" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Roadmap to 100 ESG Score
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-1 rounded-md transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-xs text-slate-600 font-semibold animate-pulse">Running ESG projection simulation...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {roadmap}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-xs font-semibold text-slate-900 border border-slate-200 transition-all"
                  >
                    Close Simulation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
