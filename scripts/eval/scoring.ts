import { sha256 } from "./anonymize";
import {
  dimensionWeights,
  type Condition,
  type ConditionScore,
  type EvalSummary,
  type JudgeResult,
  type JudgedOutput,
  type ScenarioResult,
} from "./types";

function weightedOutputScore(output: JudgedOutput): number {
  const expected = Object.keys(
    dimensionWeights,
  ) as Array<keyof typeof dimensionWeights>;
  const actual = output.dimensions.map((dimension) => dimension.dimension);
  if (
    new Set(actual).size !== expected.length ||
    expected.some((dimension) => !actual.includes(dimension))
  ) {
    throw new Error("Judge output must score every dimension exactly once");
  }
  const weighted = output.dimensions.reduce((total, dimension) => {
    return (
      total +
      (dimension.score / 5) * dimensionWeights[dimension.dimension] * 100
    );
  }, 0);
  return output.factualFidelityFailure ? Math.min(59, weighted) : weighted;
}

export function scoreCondition(
  condition: Condition,
  judges: JudgeResult[],
  labelToCondition: Record<"A" | "B", Condition>,
): ConditionScore {
  const label = labelToCondition.A === condition ? "A" : "B";
  const outputs = judges.map((judge) =>
    label === "A" ? judge.outputA : judge.outputB,
  );
  return {
    condition,
    score:
      outputs.reduce((sum, output) => sum + weightedOutputScore(output), 0) /
      outputs.length,
    factualFidelityFailure: outputs.some(
      (output) => output.factualFidelityFailure,
    ),
  };
}

function createRandom(seed: string): () => number {
  let state = Number.parseInt(sha256(seed).slice(0, 8), 16) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function quantile(sorted: number[], probability: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return (
    sorted[lower] +
    (sorted[upper] - sorted[lower]) * (position - lower)
  );
}

export function bootstrapConfidenceInterval(
  deltas: number[],
  seed: string,
  iterations = 2_000,
): [number, number] {
  if (deltas.length === 0) return [0, 0];
  const random = createRandom(seed);
  const means = Array.from({ length: iterations }, () => {
    let sum = 0;
    for (let index = 0; index < deltas.length; index += 1) {
      sum += deltas[Math.floor(random() * deltas.length)];
    }
    return sum / deltas.length;
  }).sort((left, right) => left - right);
  return [quantile(means, 0.025), quantile(means, 0.975)];
}

function mean(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function summarizeResults(
  results: ScenarioResult[],
  seed: string,
): EvalSummary {
  const deltas = results.map((result) => result.delta);
  const subgroupEntries = new Map<string, number[]>();
  for (const result of results) {
    const subgroup = result.scenario.subgroup ?? "unclassified";
    subgroupEntries.set(subgroup, [
      ...(subgroupEntries.get(subgroup) ?? []),
      result.delta,
    ]);
  }
  const subgroupDeltas = Object.fromEntries(
    [...subgroupEntries].map(([subgroup, values]) => [subgroup, mean(values)]),
  );
  const confidenceInterval95 = bootstrapConfidenceInterval(deltas, seed);
  const treatmentFidelityFailures = results.filter(
    (result) => result.treatmentScore.factualFidelityFailure,
  ).length;
  const controlFidelityFailures = results.filter(
    (result) => result.controlScore.factualFidelityFailure,
  ).length;
  const wins = results.filter((result) => result.winner === "treatment").length;
  const ties = results.filter((result) => result.winner === "tie").length;
  const losses = results.filter((result) => result.winner === "control").length;
  const meanDelta = mean(deltas);
  const agreementEligible = results.filter(
    (result) => result.judges.length >= 2,
  );
  const judgeAgreement =
    agreementEligible.length === 0
      ? 0
      : agreementEligible.filter(
          (result) =>
            result.judges[0].winner === result.judges[1].winner,
        ).length / agreementEligible.length;
  const passesRule =
    meanDelta >= 5 &&
    confidenceInterval95[0] > 0 &&
    treatmentFidelityFailures <= controlFidelityFailures &&
    wins > losses &&
    Object.values(subgroupDeltas).every((delta) => delta >= -3);

  return {
    treatmentMean: mean(
      results.map((result) => result.treatmentScore.score),
    ),
    controlMean: mean(results.map((result) => result.controlScore.score)),
    meanDelta,
    confidenceInterval95,
    wins,
    ties,
    losses,
    treatmentFidelityFailures,
    controlFidelityFailures,
    judgeAgreement,
    subgroupDeltas,
    decision:
      results.length < 20 ? "exploratory" : passesRule ? "pass" : "fail",
  };
}
