import { describe, expect, it } from "vitest";

import { computeScorecardPercent } from "@/lib/analysis/scorecard";

describe("computeScorecardPercent", () => {
  it("treats missing judgment critiques as failures", () => {
    const score = computeScorecardPercent({
      criteria: [
        { id: "specificity", kind: "judgment" },
        { id: "evidence", kind: "judgment" },
        { id: "word-count", kind: "measurable" },
      ],
      critique: [{ criterionId: "specificity", passed: true }],
      findings: [{ passed: true }],
    });
    // 1 judgment pass + 1 finding pass out of 3 total = 67
    expect(score).toBe(67);
  });

  it("returns 100 when every assessed item passes", () => {
    const score = computeScorecardPercent({
      criteria: [
        { id: "specificity", kind: "judgment" },
        { id: "evidence", kind: "judgment" },
      ],
      critique: [
        { criterionId: "specificity", passed: true },
        { criterionId: "evidence", passed: true },
      ],
      findings: [{ passed: true }, { passed: true }],
    });
    expect(score).toBe(100);
  });

  it("returns 0 for empty criteria and findings", () => {
    expect(
      computeScorecardPercent({
        criteria: [],
        critique: [],
        findings: [],
      }),
    ).toBe(0);
  });
});
