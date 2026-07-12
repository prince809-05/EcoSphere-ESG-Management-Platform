import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { 
  generateEnvironmentalReport, 
  generateSocialReport, 
  generateGovernanceReport, 
  generateESGSummaryReport, 
  generateCustomReport 
} from '@/actions/reports';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.role !== 'ADMIN' && session.role !== 'AUDITOR' && session.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { format, reportType, filters = {} } = body;

    if (!format || !reportType) {
      return NextResponse.json({ error: 'Format and reportType are required parameters' }, { status: 400 });
    }

    let reportData: any;
    
    // Fetch data using backend report action functions
    if (reportType === 'environmental') {
      const res = await generateEnvironmentalReport(filters);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      reportData = res.data.transactions;
    } else if (reportType === 'social') {
      const res = await generateSocialReport(filters);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      reportData = res.data.participations;
    } else if (reportType === 'governance') {
      const res = await generateGovernanceReport(filters);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      reportData = res.data.issues;
    } else if (reportType === 'summary') {
      const res = await generateESGSummaryReport();
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      reportData = res.data.departments;
    } else {
      const res = await generateCustomReport(filters);
      if (!res.success) return NextResponse.json({ error: res.error }, { status: 400 });
      // Map custom report list to a flat structure
      const rows: any[] = [];
      if (res.data.environmental) {
        res.data.environmental.forEach((row: any) => rows.push({ Module: 'Environmental', Date: row.date, Dept: row.department, Details: `${row.type} - Quantity: ${row.quantity}`, CO2_Tons: row.co2 }));
      }
      if (res.data.social) {
        res.data.social.forEach((row: any) => rows.push({ Module: 'Social', Date: row.date, Dept: row.department, Details: `${row.activity} (${row.employee})`, Points: row.points }));
      }
      if (res.data.governance) {
        res.data.governance.forEach((row: any) => rows.push({ Module: 'Governance', Date: row.date, Dept: row.department, Details: `${row.audit} - ${row.description}`, Severity: row.severity }));
      }
      reportData = rows;
    }

    // --- CSV FORMAT EXPORT ---
    if (format === 'csv') {
      const csvString = Papa.unparse(reportData);
      return new Response(csvString, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=EcoSphere_Export_${reportType}.csv`,
        },
      });
    }

    // --- EXCEL FORMAT EXPORT ---
    if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ESG Data');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
      return new Response(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename=EcoSphere_Export_${reportType}.xlsx`,
        },
      });
    }

    // --- PDF FORMAT EXPORT ---
    if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129); // Emerald Green
      doc.text('EcoSphere AI - ESG Platform Export', 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Report Type: ${reportType.toUpperCase()} | Date: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.line(14, 32, 196, 32);

      let y = 42;
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      reportData.forEach((row: any, index: number) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const textRow = `#${index + 1}: ` + Object.entries(row)
          .map(([key, val]) => `${key}: ${val}`)
          .join(' | ');

        const splitText = doc.splitTextToSize(textRow, 182);
        doc.text(splitText, 14, y);
        y += splitText.length * 5;
      });

      const pdfBuffer = doc.output('arraybuffer');
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=EcoSphere_Export_${reportType}.pdf`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format requested' }, { status: 400 });
  } catch (error: any) {
    console.error('[Route - reports/export]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
