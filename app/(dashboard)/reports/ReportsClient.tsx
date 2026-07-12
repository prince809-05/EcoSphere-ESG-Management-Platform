'use client';

import React, { useState } from 'react';
import { runReportAction } from '@/actions/reports';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Sparkles, 
  Download, 
  Loader2, 
  Calendar, 
  Briefcase, 
  Layers, 
  Filter, 
  CheckCircle,
  TrendingDown
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface ReportsClientProps {
  session: { userId: string; role: string; departmentId: string | null; name: string };
  departments: any[];
  employees: any[];
}

export default function ReportsClient({
  session,
  departments,
  employees,
}: ReportsClientProps) {
  const [loading, setLoading] = useState(false);
  const [reportResults, setReportResults] = useState<any | null>(null);
  
  // Form filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [moduleId, setModuleId] = useState<'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE' | 'ALL'>('ALL');
  const [employeeId, setEmployeeId] = useState('');

  const handleRunReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setReportResults(null);

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      departmentId: departmentId || undefined,
      moduleId,
      employeeId: employeeId || undefined,
    };

    const res = await runReportAction(filters);
    setLoading(false);

    if (res.error) {
      alert(res.error);
    } else {
      setReportResults(res);
    }
  };

  const runPresetReport = async (moduleType: 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE' | 'ALL') => {
    setModuleId(moduleType);
    setStartDate('');
    setEndDate('');
    setDepartmentId('');
    setEmployeeId('');

    // Wait a brief tick for state updates, then run
    setLoading(true);
    const res = await runReportAction({ moduleId: moduleType });
    setLoading(false);
    
    if (res.error) {
      alert(res.error);
    } else {
      setReportResults(res);
    }
  };

  // --- EXPORTS ---

  const getCombinedDataForExport = () => {
    if (!reportResults) return [];
    
    const rows: any[] = [];
    if (reportResults.environmental?.length > 0) {
      reportResults.environmental.forEach((item: any) => {
        rows.push({
          Pillar: 'Environmental',
          Date: item.date,
          Details: `${item.type} quantity of ${item.quantity} (${item.factor})`,
          Department: item.department,
          Metric: `${item.co2} tons CO2`,
          Status: 'Active',
        });
      });
    }
    if (reportResults.social?.length > 0) {
      reportResults.social.forEach((item: any) => {
        rows.push({
          Pillar: 'Social',
          Date: item.date,
          Details: `CSR Activity: ${item.activity} completed by ${item.employee}`,
          Department: item.department,
          Metric: `+${item.points} Points`,
          Status: item.status,
        });
      });
    }
    if (reportResults.governance?.length > 0) {
      reportResults.governance.forEach((item: any) => {
        rows.push({
          Pillar: 'Governance',
          Date: item.date,
          Details: `${item.audit}: ${item.description} (Severity: ${item.severity}, Assignee: ${item.owner})`,
          Department: item.department,
          Metric: 'Compliance Action',
          Status: item.status,
        });
      });
    }

    return rows;
  };

  const handleExportCSV = () => {
    const data = getCombinedDataForExport();
    if (data.length === 0) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `EcoSphere_ESG_Report_${moduleId}.csv`);
    link.click();
  };

  const handleExportExcel = () => {
    const data = getCombinedDataForExport();
    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ESG Report');
    XLSX.writeFile(workbook, `EcoSphere_ESG_Report_${moduleId}.xlsx`);
  };

  const handleExportPDF = () => {
    const data = getCombinedDataForExport();
    if (data.length === 0) return;

    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // Emerald Green
    doc.text('EcoSphere AI - ESG Executive Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Pillar Module: ${moduleId} | Date Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // AI Summary Box
    if (reportResults.aiSummary) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(245, 158, 11); // Amber
      doc.text('AI EXECUTIVE REPORT SUMMARY', 14, 40);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      const splitSummary = doc.splitTextToSize(reportResults.aiSummary, 182);
      doc.text(splitSummary, 14, 46);
    }

    // Table Data
    let y = 70;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Pillar', 14, y);
    doc.text('Date', 40, y);
    doc.text('Details', 70, y);
    doc.text('Department', 130, y);
    doc.text('Metric', 165, y);
    doc.text('Status', 185, y);
    doc.line(14, y + 2, 196, y + 2);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    y += 8;

    data.forEach((row) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(row.Pillar), 14, y);
      doc.text(String(row.Date), 40, y);
      
      const detailsSnippet = String(row.Details).substring(0, 32) + '...';
      doc.text(detailsSnippet, 70, y);
      doc.text(String(row.Department).substring(0, 16), 130, y);
      doc.text(String(row.Metric), 165, y);
      doc.text(String(row.Status), 185, y);
      y += 6;
    });

    doc.save(`EcoSphere_ESG_Report_${moduleId}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-rose-400" />
          ESG Auditing & Reports
        </h1>
        <p className="text-xs text-slate-400 mt-1">Generate dynamic compliance logs, export executive documents, and audit ESG balances.</p>
      </div>

      {/* Preset Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => runPresetReport('ENVIRONMENTAL')} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-emerald-500/30 text-left hover:bg-slate-900/60 transition-all group">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] uppercase font-bold">Environmental</Badge>
          <h4 className="text-xs font-bold text-white mt-2">Carbon Balances</h4>
          <p className="text-[10px] text-slate-500 mt-1">Carbon transactions and grid factor calculations log.</p>
        </button>
        <button onClick={() => runPresetReport('SOCIAL')} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-amber-500/30 text-left hover:bg-slate-900/60 transition-all group">
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] uppercase font-bold">Social</Badge>
          <h4 className="text-xs font-bold text-white mt-2">CSR Volunteering</h4>
          <p className="text-[10px] text-slate-500 mt-1">CSR approvals queue and employee engagement metrics.</p>
        </button>
        <button onClick={() => runPresetReport('GOVERNANCE')} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-blue-500/30 text-left hover:bg-slate-900/60 transition-all group">
          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] uppercase font-bold">Governance</Badge>
          <h4 className="text-xs font-bold text-white mt-2">Compliance & Audits</h4>
          <p className="text-[10px] text-slate-500 mt-1">Audit compliance status, open issues, and policies.</p>
        </button>
        <button onClick={() => runPresetReport('ALL')} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-violet-500/30 text-left hover:bg-slate-900/60 transition-all group">
          <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 text-[9px] uppercase font-bold">ESG Summary</Badge>
          <h4 className="text-xs font-bold text-white mt-2">Executive Summary</h4>
          <p className="text-[10px] text-slate-500 mt-1">A consolidated breakdown of all E, S, and G metrics.</p>
        </button>
      </div>

      {/* Custom Report Builder Card */}
      <Card className="bg-slate-900 border-slate-800 text-white">
        <CardHeader className="pb-4 border-b border-slate-800">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            Custom Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleRunReport} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                Module / Pillar
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value as any)}
                className="w-full p-2 rounded-lg border border-slate-850 bg-slate-950 text-white text-xs"
              >
                <option value="ALL">All (Summary)</option>
                <option value="ENVIRONMENTAL">Environmental</option>
                <option value="SOCIAL">Social</option>
                <option value="GOVERNANCE">Governance</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-xs font-semibold text-white transition-all shadow-md shadow-rose-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  Run Report
                </>
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* --- REPORT OUTPUT RESULTS --- */}
      {reportResults && (
        <div className="space-y-6">
          {/* AI report summary */}
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/15 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-[-30px] right-[-30px] w-20 h-20 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              AI Executive Report Summary
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {reportResults.aiSummary}
            </p>
          </div>

          {/* Export tools */}
          <div className="flex flex-wrap gap-3 items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/30">
            <span className="text-xs text-slate-400 font-medium">Report generated successfully. Ready to export:</span>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:text-white text-slate-400 text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:text-white text-slate-400 text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:text-white text-slate-400 text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Table Results */}
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="pb-4 border-b border-slate-800">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Report Ledger Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
                    <th className="p-4">Pillar</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Details</th>
                    <th className="p-4 text-right">Metric Value</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {getCombinedDataForExport().map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/25 transition-all text-slate-200">
                      <td className="p-4">
                        <Badge className={`${
                          row.Pillar === 'Environmental' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          row.Pillar === 'Social' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        } text-[9px] border font-bold uppercase`}>
                          {row.Pillar}
                        </Badge>
                      </td>
                      <td className="p-4 text-slate-400">{row.Date}</td>
                      <td className="p-4 font-semibold">{row.Department}</td>
                      <td className="p-4 max-w-sm truncate text-slate-300">{row.Details}</td>
                      <td className="p-4 text-right font-extrabold text-white">{row.Metric}</td>
                      <td className="p-4 text-center">
                        <Badge className="bg-slate-950 border-slate-850 text-slate-400 text-[8px] font-bold uppercase">
                          {row.Status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {getCombinedDataForExport().length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No logs match the chosen filter constraints.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
