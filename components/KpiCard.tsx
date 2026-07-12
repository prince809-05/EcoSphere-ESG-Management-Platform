'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/card';
import { Leaf, Users, Scale, Award } from 'lucide-react';

const iconMap = {
  leaf: Leaf,
  users: Users,
  scale: Scale,
  award: Award,
};

interface KpiCardProps {
  title: string;
  value: number;
  iconName: 'leaf' | 'users' | 'scale' | 'award';
  colorClass: string;
  glowClass: string;
  borderClass: string;
  description: string;
}

export default function KpiCard({
  title,
  value,
  iconName,
  colorClass,
  glowClass,
  borderClass,
  description,
}: KpiCardProps) {
  const Icon = iconMap[iconName] || Leaf;
  return (
    <motion.div
      whileHover={{ y: -2 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card className="bg-white/60 border-slate-100 backdrop-blur-md overflow-hidden relative group hover:border-zinc-750 transition-all shadow-xl">
        {/* Top colored accent line */}
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${
          iconName === 'leaf' ? 'bg-emerald-500/80' :
          iconName === 'users' ? 'bg-amber-500/80' :
          iconName === 'scale' ? 'bg-blue-500/80' :
          'bg-violet-500/80'
        }`} />
        
        <CardContent className="p-7">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold tracking-wider text-slate-600 uppercase">{title}</span>
            <div className={`p-2 rounded-xl bg-slate-50/60 border border-slate-100 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {value.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-bold">/ 100</span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-700 group-hover:text-slate-800 transition-colors">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
