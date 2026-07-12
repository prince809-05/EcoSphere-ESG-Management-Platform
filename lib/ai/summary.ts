import { generateAIContent } from './index';

export async function generateReportSummary(reportData: {
  environmentalCount: number;
  socialCount: number;
  governanceCount: number;
  metrics: {
    totalCO2: number;
    approvedCSR: number;
    pendingCSR: number;
    unresolvedGov: number;
  };
}): Promise<string> {
  const { environmentalCount, socialCount, governanceCount, metrics } = reportData;

  const dataSummary = `Report Stats:
- Carbon Transactions: ${environmentalCount} logs, totaling ${metrics.totalCO2.toFixed(2)} tons of CO2.
- CSR Activites: ${socialCount} records, with ${metrics.approvedCSR} approved, and ${metrics.pendingCSR} pending approval.
- Governance Audits/Issues: ${governanceCount} items, with ${metrics.unresolvedGov} unresolved compliance issues.`;

  const prompt = `You are EcoSphere AI, an expert ESG auditor. Review the following report data details:

${dataSummary}

Provide a concise, professional 2-3 sentence executive summary highlighting key achievements and main areas of concern. Do not use conversational intro/outro text.`;

  try {
    return await generateAIContent(prompt);
  } catch (error) {
    console.error('Error generating AI report summary:', error);
    return 'Summary temporarily unavailable due to AI connectivity issue.';
  }
}
