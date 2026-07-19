import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("grounding provenance boundaries", () => {
  it("requires analysis facts to quote the draft or writer answers", () => {
    const source = readFileSync(
      join(ROOT, "convex/pipelineActions.ts"),
      "utf8",
    );
    expect(source).toContain("assertAnalysisFactsSupported(analysis.facts");
    expect(source).toContain(
      "The analysis model returned a fact without exact source provenance",
    );
  });

  it("validates source angle and draft fact identifiers", () => {
    const source = readFileSync(join(ROOT, "convex/sourceActions.ts"), "utf8");
    expect(source).toContain("A suggested angle cited an invalid source fact");
    expect(source).toContain(
      "The selected writing angle cited an invalid source fact",
    );
    expect(source).toContain("The source-backed draft cited an invalid fact");
  });

  it("prevents unsupported grounding copy in delivery briefings", () => {
    const source = readFileSync(join(ROOT, "convex/coachActions.ts"), "utf8");
    expect(source).toContain("getDeliveryContextByToken");
    expect(source).toContain("assertNoUnsupportedGroundingCopy");
  });

  it("guards every profile-aware prose generation path", () => {
    const expectedGuards: Array<[string, number]> = [
      ["convex/pipelineActions.ts", 1],
      ["convex/ideationActions.ts", 1],
      ["convex/coachActions.ts", 1],
      ["convex/sourceActions.ts", 2],
    ];
    for (const [file, minimum] of expectedGuards) {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(
        source.match(/assertNoUnsupportedGroundingCopy\(\{/g)?.length ?? 0,
        file,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });
});
