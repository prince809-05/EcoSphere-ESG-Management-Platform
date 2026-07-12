import { generateAIContent } from './index';

interface CarbonTx {
  type: string;
  quantity: number;
  calculatedCO2: number;
  emissionFactor: {
    name: string;
    unit: string;
  };
  notes?: string | null;
  createdAt: Date;
}

export async function generateCarbonSuggestions(recentTransactions: CarbonTx[]): Promise<string> {
  if (recentTransactions.length === 0) {
    return 'Add scope transactions to receive customized AI carbon reduction suggestions.';
  }

  const logsText = recentTransactions
    .slice(0, 10)
    .map(
      (tx) =>
        `- Date: ${tx.createdAt.toLocaleDateString()}, Scope: ${tx.type}, Quantity: ${tx.quantity} ${
          tx.emissionFactor.unit
        } of ${tx.emissionFactor.name}, CO2 Impact: ${Number(tx.calculatedCO2).toFixed(2)} tons. Notes: ${
          tx.notes || 'None'
        }`
    )
    .join('\n');

  const prompt = `You are EcoSphere AI, a senior environmental engineer. Review the following recent carbon transactions:

${logsText}

Provide exactly 3 bullet-point, high-impact suggestions on how this department can reduce its emissions footprint based on the scoped logs above. Keep recommendations extremely specific and actionable. Limit response to 3 sentences total.`;

  try {
    return await generateAIContent(prompt);
  } catch (error) {
    console.error('Error generating AI carbon suggestions:', error);
    return 'Carbon reduction recommendations are temporarily unavailable.';
  }
}
