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
      whileHover={{ y: -4, scale: 1.01 }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <Card className={`bg-slate-900/60 border-slate-800 backdrop-blur-md overflow-hidden relative group hover:shadow-lg ${borderClass} hover:border-slate-700 transition-all`}>
        {/* Glow overlay */}
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none ${glowClass}`} />
        
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">{title}</span>
            <div className={`p-2 rounded-lg bg-slate-950 border border-slate-800 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {value.toFixed(1)}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">/ 100</span>
          </div>

          <p className="text-xs text-slate-400 mt-2 font-medium">{description}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
