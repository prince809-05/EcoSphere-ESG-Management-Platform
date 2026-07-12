'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface ChartData {
  month: string;
  emissions: number;
}

interface DeptRankData {
  name: string;
  environmental: number;
  social: number;
  governance: number;
  overall: number;
}

export default function DashboardCharts({
  trendData,
  rankData,
}: {
  trendData: ChartData[];
  rankData: DeptRankData[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Emissions Trend Chart */}
      <Card className="bg-white border-slate-200 text-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600">
            Emissions Trend (12 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="emissions"
                  name="CO2 (Tons)"
                  stroke="#10b981"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                  dot={{ strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Department Rankings Chart */}
      <Card className="bg-white border-slate-200 text-slate-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-600">
            Department ESG Score Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="environmental" name="Env Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="social" name="Social Score" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="governance" name="Gov Score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
