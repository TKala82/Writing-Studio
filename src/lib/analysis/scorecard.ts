export interface ScorecardCriterion {
  id: string;
  kind: "judgment" | "measurable";
}

export interface ScorecardCritiqueItem {
  criterionId: string;
  passed: boolean;
}

export interface ScorecardFinding {
  passed: boolean;
}

/**
 * Aggregate pass-rate used by the rubric scorecard UI.
 * Missing judgment critiques count as failed assessments.
 */
export function computeScorecardPercent(input: {
  criteria: readonly ScorecardCriterion[];
  critique: readonly ScorecardCritiqueItem[];
  findings: readonly ScorecardFinding[];
}): number {
  const judgmentItems = input.criteria
    .filter((criterion) => criterion.kind === "judgment")
    .map(
      (criterion) =>
        input.critique.find((item) => item.criterionId === criterion.id) ?? {
          criterionId: criterion.id,
          passed: false,
        },
    );
  const passed =
    judgmentItems.filter((item) => item.passed).length +
    input.findings.filter((finding) => finding.passed).length;
  const total = judgmentItems.length + input.findings.length;
  return total === 0 ? 0 : Math.round((passed / total) * 100);
}
