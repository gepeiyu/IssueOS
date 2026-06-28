export const DIMENSION_WEIGHTS: Record<string, number> = {
  security: 0.30,
  architecture: 0.25,
  tests: 0.20,
  code_quality: 0.15,
  performance: 0.10,
};

export const DIMENSION_ORDER = ['tests', 'code_quality', 'security', 'performance', 'architecture'] as const;

export interface DimensionResult {
  name: string;
  score: number;
  findings?: string[];
  suggestions?: string[];
  unassessed?: boolean;
}

export interface RiskResult {
  dimensions: DimensionResult[];
  weightedAvg: number;
  riskScore: number;
  riskLabel: 'Low' | 'Medium' | 'High';
}

export function computeRisk(dimensions: DimensionResult[]): RiskResult {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of dimensions) {
    const weight = DIMENSION_WEIGHTS[dim.name];
    if (weight === undefined) continue;
    if (dim.unassessed) continue;
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const riskScore = Math.min(100, Math.max(0, Math.round(100 - weightedAvg)));

  let riskLabel: 'Low' | 'Medium' | 'High';
  if (riskScore <= 30) riskLabel = 'Low';
  else if (riskScore <= 60) riskLabel = 'Medium';
  else riskLabel = 'High';

  return { dimensions, weightedAvg, riskScore, riskLabel };
}
