export interface DecisionInput {
  title: string;
  context: string;
  options: string[];
  priorities: string[];
  riskTolerance: 'low' | 'moderate' | 'high';
  timeHorizon: 'immediate' | '1-2 years' | '5+ years';
}

export interface ProItem {
  id: string;
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  category: string;
  score: number; // 1 to 5
  explanation: string;
}

export interface ConItem {
  id: string;
  title: string;
  impact: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  category: string;
  score: number; // -1 to -5
  mitigation: string;
  explanation: string;
}

export interface OptionProCon {
  id: string;
  optionTitle: string;
  summary: string;
  pros: ProItem[];
  cons: ConItem[];
  netScore: number;
}

export interface ComparisonCriterion {
  id: string;
  name: string;
  weight: number; // 1 to 10
  description: string;
}

export interface ComparisonRow {
  criteriaId: string;
  criteriaName: string;
  scores: Record<string, number>; // optionTitle -> score (1 to 10)
  notes: Record<string, string>; // optionTitle -> justification
  optionScores?: Array<{
    optionTitle: string;
    score: number;
    note: string;
  }>;
}

export interface ComparisonTable {
  criteria: ComparisonCriterion[];
  matrix: ComparisonRow[];
  keyTradeoffs: string[];
}

export interface SWOTAnalysis {
  optionTitle: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CognitiveBias {
  bias: string;
  warning: string;
  reflectionQuestion: string;
}

export interface SecondOrderEffect {
  phase: string;
  effect: string;
}

export interface PreMortem {
  worstCaseScenario: string;
  warningSigns: string[];
  preventionTactics: string[];
}

export interface BlindSpots {
  cognitiveBiases: CognitiveBias[];
  secondOrderEffects: SecondOrderEffect[];
  preMortem: PreMortem;
}

export interface ActionStep {
  stepNumber: number;
  task: string;
  timeframe: string;
  completed?: boolean;
}

export interface Recommendation {
  primaryVerdict: string;
  confidenceScore: number; // 0 to 100
  rationale: string;
  whenToPickAlternative: string;
  actionPlan: ActionStep[];
  reversalPlan: string;
  decisionClass: 'Reversible (Type 2)' | 'Irreversible (Type 1)' | 'Conditional Pivot' | string;
}

export interface FullDecisionAnalysis {
  id: string;
  createdAt: string;
  input: DecisionInput;
  prosAndCons: OptionProCon[];
  comparison: ComparisonTable;
  swots: SWOTAnalysis[];
  blindSpots: BlindSpots;
  recommendation: Recommendation;
  customWeights?: Record<string, number>;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isError?: boolean;
  retryableText?: string;
}
