import { afterEach, describe, expect, test } from "vitest";

import { anonymizePair } from "../../scripts/eval/anonymize";
import { BudgetTracker } from "../../scripts/eval/budget";
import {
  bootstrapConfidenceInterval,
  scoreCondition,
} from "../../scripts/eval/scoring";
import {
  dimensionWeights,
  type GeneratedCondition,
  type JudgeResult,
} from "../../scripts/eval/types";

const originalMaxTokens = process.env.EVAL_MAX_TOTAL_TOKENS;

afterEach(() => {
  if (originalMaxTokens === undefined) {
    delete process.env.EVAL_MAX_TOTAL_TOKENS;
  } else {
    process.env.EVAL_MAX_TOTAL_TOKENS = originalMaxTokens;
  }
});

function generated(
  condition: "treatment" | "control",
  text: string,
): GeneratedCondition {
  return {
    condition,
    text,
    model: "mock",
    usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
  };
}

describe("evaluation harness primitives", () => {
  test("anonymization is seeded, stable, and strips condition metadata", () => {
    const treatment = generated("treatment", "Treatment: hidden label\nStrong copy");
    const control = generated("control", "Control: hidden label\nGeneric copy");
    const first = anonymizePair("scenario-1", treatment, control, "seed");
    const second = anonymizePair("scenario-1", treatment, control, "seed");

    expect(first).toEqual(second);
    expect(`${first.outputA}\n${first.outputB}`).not.toMatch(
      /Treatment:|Control:/,
    );
    expect(new Set(Object.values(first.labelToCondition))).toEqual(
      new Set(["treatment", "control"]),
    );
  });

  test("seeded randomization does not pin treatment to one label", () => {
    const treatment = generated("treatment", "Strong copy");
    const control = generated("control", "Generic copy");
    const treatmentInA = Array.from({ length: 200 }, (_, index) =>
      anonymizePair(`scenario-${index}`, treatment, control, "balanced-seed"),
    ).filter((pair) => pair.labelToCondition.A === "treatment").length;

    expect(treatmentInA).toBeGreaterThan(70);
    expect(treatmentInA).toBeLessThan(130);
  });

  test("factual-fidelity failures cap an otherwise perfect score at 59", () => {
    const dimensions = Object.keys(dimensionWeights).map((dimension) => ({
      dimension: dimension as keyof typeof dimensionWeights,
      score: 5,
      evidence: "Exact evidence",
      confidence: 1,
    }));
    const judge: JudgeResult = {
      judgeIndex: 1,
      model: "mock",
      outputA: {
        dimensions,
        factualFidelityFailure: true,
        factualFidelityExplanation: "Invented a result",
      },
      outputB: {
        dimensions,
        factualFidelityFailure: false,
        factualFidelityExplanation: "No failure",
      },
      winner: "B",
      rationale: "B remains factual",
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    };

    expect(
      scoreCondition("treatment", [judge], {
        A: "treatment",
        B: "control",
      }).score,
    ).toBe(59);
  });

  test("bootstrap interval is deterministic for a fixed seed", () => {
    expect(bootstrapConfidenceInterval([10, 10, 10], "fixed", 200)).toEqual([
      10, 10,
    ]);
  });

  test("rejects duplicate judge dimensions before scoring", () => {
    const duplicateDimensions = Array.from(
      { length: Object.keys(dimensionWeights).length },
      () => ({
        dimension: "specificityAuthenticity" as const,
        score: 5,
        evidence: "Exact evidence",
        confidence: 1,
      }),
    );
    const judge: JudgeResult = {
      judgeIndex: 1,
      model: "mock",
      outputA: {
        dimensions: duplicateDimensions,
        factualFidelityFailure: false,
        factualFidelityExplanation: "None",
      },
      outputB: {
        dimensions: duplicateDimensions,
        factualFidelityFailure: false,
        factualFidelityExplanation: "None",
      },
      winner: "tie",
      rationale: "Malformed",
      usage: { inputTokens: 1, outputTokens: 1, estimatedCostUsd: 0 },
    };
    expect(() =>
      scoreCondition("treatment", [judge], {
        A: "treatment",
        B: "control",
      }),
    ).toThrow(/exactly once/i);
  });

  test("budget guard blocks a call before exceeding its hard token cap", () => {
    process.env.EVAL_MAX_TOTAL_TOKENS = "10";
    const budget = new BudgetTracker();
    expect(() => budget.assertCanCall("A long prompt", 20)).toThrow(
      /token budget/i,
    );
  });

  test("invalid budget configuration fails closed", () => {
    process.env.EVAL_MAX_TOTAL_TOKENS = "NaN";
    expect(() => new BudgetTracker()).toThrow(/finite positive/i);
  });
});
