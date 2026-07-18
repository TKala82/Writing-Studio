import { describe, expect, it } from "vitest";

import {
  applyHunkDecisions,
  countChangedHunks,
  createSemanticDiff,
} from "@/lib/diff/semantic-diff";

describe("semantic diff", () => {
  it("creates changed hunks for paragraph rewrites", () => {
    const original =
      "I am passionate about AI.\n\nThis programme would help me learn more.";
    const revised =
      "In a seminar I compared three accountability frameworks.\n\nI want the clinics to turn that comparison into a public memo.";
    const hunks = createSemanticDiff(original, revised);
    expect(countChangedHunks(hunks)).toBeGreaterThan(0);
  });

  it("applies accept and reject decisions", () => {
    const hunks = createSemanticDiff(
      "Keep this sentence. Change this one.",
      "Keep this sentence. Replace this one.",
    );
    const changed = hunks.filter((hunk) => hunk.changed);
    expect(changed.length).toBeGreaterThan(0);
    const decisions = Object.fromEntries(
      changed.map((hunk, index) => [
        hunk.id,
        index === 0 ? ("rejected" as const) : ("accepted" as const),
      ]),
    );
    const text = applyHunkDecisions(hunks, decisions);
    expect(text).toContain("Keep this sentence");
  });
});
