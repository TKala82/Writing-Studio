export const dimensionWeights = {
  specificityAuthenticity: 0.2,
  evidenceMeaning: 0.2,
  narrativeCausality: 0.15,
  programmeFit: 0.15,
  agencyContribution: 0.1,
  voiceRestraint: 0.1,
  constraintFidelity: 0.1,
} as const;

export type DimensionId = keyof typeof dimensionWeights;
export type OutputLabel = "A" | "B";
export type Condition = "treatment" | "control";

export interface EvalScenario {
  id: string;
  title: string;
  draft: string;
  writerContext?: string;
  customPurpose?: string;
  constraints?: string[];
  subgroup?: string;
  burned?: boolean;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface GeneratedCondition {
  condition: Condition;
  text: string;
  model: string;
  usage: ModelUsage;
}

export interface AnonymizedPair {
  scenarioId: string;
  seed: string;
  outputA: string;
  outputB: string;
  labelToCondition: Record<OutputLabel, Condition>;
}

export interface DimensionScore {
  dimension: DimensionId;
  score: number;
  evidence: string;
  confidence: number;
}

export interface JudgedOutput {
  dimensions: DimensionScore[];
  factualFidelityFailure: boolean;
  factualFidelityExplanation: string;
}

export interface JudgeResult {
  judgeIndex: number;
  model: string;
  outputA: JudgedOutput;
  outputB: JudgedOutput;
  winner: OutputLabel | "tie";
  rationale: string;
  usage: ModelUsage;
}

export interface ConditionScore {
  condition: Condition;
  score: number;
  factualFidelityFailure: boolean;
}

export interface ScenarioResult {
  scenario: EvalScenario;
  treatment: GeneratedCondition;
  control: GeneratedCondition;
  anonymized: AnonymizedPair;
  judges: JudgeResult[];
  treatmentScore: ConditionScore;
  controlScore: ConditionScore;
  delta: number;
  winner: Condition | "tie";
}

export interface EvalSummary {
  treatmentMean: number;
  controlMean: number;
  meanDelta: number;
  confidenceInterval95: [number, number];
  wins: number;
  ties: number;
  losses: number;
  treatmentFidelityFailures: number;
  controlFidelityFailures: number;
  judgeAgreement: number;
  subgroupDeltas: Record<string, number>;
  decision: "pass" | "fail" | "exploratory";
}

export interface EvalRun {
  evaluationId: string;
  createdAt: string;
  commitSha: string;
  scenarioSet: string;
  scenarioSetHash: string;
  promptHash: string;
  rubricHash: string;
  harnessHash: string;
  configurationHash: string;
  briefHash?: string;
  seed: string;
  mock: boolean;
  generatorModel: string;
  judgeModel: string;
  results: ScenarioResult[];
  summary: EvalSummary;
  usage: ModelUsage;
  runtimeMs: number;
}
