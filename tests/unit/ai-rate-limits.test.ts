import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const ACTIONS = [
  {
    file: "convex/selectionActions.ts",
    name: "legalLens",
    operation: "legal-lens",
  },
  {
    file: "convex/rubricActions.ts",
    name: "deriveFromReferences",
    operation: "derive-rubric",
  },
  {
    file: "convex/voiceActions.ts",
    name: "addSample",
    operation: "voice-sample",
  },
] as const;

describe("public AI action rate limits", () => {
  for (const action of ACTIONS) {
    it(`${action.file}:${action.name} reserves and releases usage`, () => {
      const source = readFileSync(join(ROOT, action.file), "utf8");
      expect(source).toContain(`export const ${action.name} = action(`);
      expect(source).toContain("aiUsage.reserve");
      expect(source).toContain("aiUsage.release");
      expect(source).toContain(`operation: "${action.operation}"`);
    });
  }

  it("registers daily limits for the new operations", () => {
    const source = readFileSync(join(ROOT, "convex/aiUsage.ts"), "utf8");
    expect(source).toContain('"legal-lens": 60');
    expect(source).toContain('"derive-rubric": 20');
    expect(source).toContain('"voice-sample": 40');
  });
});
