import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { sha256 } from "./anonymize";

const frozenBriefSchema = z.object({
  status: z.literal("frozen"),
  evaluationId: z.string().min(1),
  frozenCommitSha: z.string().min(7),
  seed: z.string().min(1),
  scenarioSet: z.literal("holdout"),
  scenarioSetHash: z.string().length(64),
  promptHash: z.string().length(64),
  rubricHash: z.string().length(64),
  harnessHash: z.string().length(64),
  configurationHash: z.string().length(64),
  generatorModel: z.string().min(1),
  judgeModels: z.array(z.string().min(1)).min(2),
  maxOutputTokens: z.number().positive(),
  maxTotalTokens: z.number().positive(),
  maxUsd: z.number().positive(),
});

export interface FrozenBriefExpectation {
  commitSha: string;
  seed: string;
  scenarioSetHash: string;
  promptHash: string;
  rubricHash: string;
  harnessHash: string;
  configurationHash: string;
  generatorModel: string;
  judgeModels: string[];
}

export async function verifyFrozenBrief(args: {
  briefPath?: string;
  vaultDir: string;
  expected: FrozenBriefExpectation;
}): Promise<{ evaluationId: string; briefHash: string }> {
  const briefPath =
    args.briefPath ?? path.join(args.vaultDir, "holdout.brief.json");
  const raw = await readFile(briefPath, "utf8");
  const brief = frozenBriefSchema.parse(JSON.parse(raw));
  const expected = args.expected;
  const mismatches = [
    brief.frozenCommitSha === expected.commitSha ? null : "commit SHA",
    brief.seed === expected.seed ? null : "randomization seed",
    brief.scenarioSetHash === expected.scenarioSetHash
      ? null
      : "scenario-set hash",
    brief.promptHash === expected.promptHash ? null : "production prompt hash",
    brief.rubricHash === expected.rubricHash ? null : "rubric hash",
    brief.harnessHash === expected.harnessHash ? null : "harness hash",
    brief.configurationHash === expected.configurationHash
      ? null
      : "configuration hash",
    brief.generatorModel === expected.generatorModel ? null : "generator model",
    JSON.stringify(brief.judgeModels) === JSON.stringify(expected.judgeModels)
      ? null
      : "judge models",
    brief.maxOutputTokens ===
    Number(process.env.EVAL_MAX_OUTPUT_TOKENS ?? 2_500)
      ? null
      : "output-token limit",
    brief.maxTotalTokens ===
    Number(process.env.EVAL_MAX_TOTAL_TOKENS ?? 250_000)
      ? null
      : "total-token limit",
    brief.maxUsd === Number(process.env.EVAL_MAX_USD ?? 25)
      ? null
      : "cost limit",
  ].filter((item): item is string => item !== null);
  if (mismatches.length > 0) {
    throw new Error(`Frozen evaluation brief mismatch: ${mismatches.join(", ")}`);
  }
  return { evaluationId: brief.evaluationId, briefHash: sha256(raw) };
}
