import { describe, expect, test } from "vitest";

import {
  disallowedExperimentPaths,
  isAllowedExperimentPath,
} from "../../scripts/research/allowlist";

describe("prompt research diff allowlist", () => {
  test("allows only production prompts and genre rubric files", () => {
    expect(isAllowedExperimentPath("convex/lib/prompts.ts")).toBe(true);
    expect(
      isAllowedExperimentPath("src/lib/genres/motivation-statement.ts"),
    ).toBe(true);
    expect(isAllowedExperimentPath("scripts/eval/scoring.ts")).toBe(false);
    expect(isAllowedExperimentPath("research/program.md")).toBe(false);
  });

  test("normalizes Windows paths and reports protected files", () => {
    expect(
      disallowedExperimentPaths([
        "src\\lib\\genres\\index.ts",
        "convex\\lib\\prompts.ts",
        "scripts\\eval\\judge.ts",
      ]),
    ).toEqual(["scripts/eval/judge.ts"]);
  });
});
