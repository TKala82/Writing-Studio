import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { sha256 } from "./anonymize";
import type { EvalScenario } from "./types";

const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  draft: z.string().min(1),
  writerContext: z.string().optional(),
  customPurpose: z.string().optional(),
  constraints: z.array(z.string()).optional(),
  subgroup: z.string().optional(),
  burned: z.boolean().optional(),
});

const scenarioFileSchema = z.union([
  z.array(scenarioSchema),
  z.object({ scenarios: z.array(scenarioSchema) }),
]);

export interface LoadedScenarioSet {
  vaultDir: string;
  sourcePath: string;
  raw: string;
  scenarios: EvalScenario[];
  judgeInstructions: string;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

export async function resolveVaultDir(): Promise<string> {
  const candidates = [
    process.env.EVAL_VAULT_DIR,
    path.resolve(process.cwd(), "..", "..", "scenarios-vault"),
    path.resolve(process.cwd(), "..", "scenarios-vault"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await readdir(candidate);
      return candidate;
    } catch {
      // Try the next conventional location.
    }
  }
  throw new Error(
    "Evaluation vault not found. Set EVAL_VAULT_DIR to the separately permissioned scenarios vault.",
  );
}

function parseBurnedMarkdown(raw: string): EvalScenario[] {
  const sections = raw.split(/^##\s+/m).slice(1);
  return sections.flatMap((section) => {
    const [heading = "", ...bodyLines] = section.split("\n");
    const match = heading.match(/^([A-Za-z0-9-]+)\s+[—-]\s+(.+)$/);
    if (!match) return [];
    const body = bodyLines.join("\n");
    const startingPoint =
      body.match(
        /\*\*Starting point:\*\*\s*([\s\S]*?)(?=\n\*\*What the writer does:\*\*)/,
      )?.[1]?.trim() ?? body.trim();
    const writerContext = body
      .match(
        /\*\*What the writer does:\*\*\s*([\s\S]*?)(?=\n\*\*What should happen:\*\*)/,
      )?.[1]
      ?.trim();
    return [
      {
        id: match[1],
        title: match[2].trim(),
        draft: startingPoint,
        writerContext,
        customPurpose: "Fellowship motivation statement",
        subgroup: "burned-example",
        burned: true,
      },
    ];
  });
}

async function loadJudgeInstructions(
  vaultDir: string,
  required: boolean,
): Promise<string> {
  const judgePath = path.join(vaultDir, "PAIRWISE_JUDGE_PROMPT.md");
  try {
    const instructions = await readFile(judgePath, "utf8");
    if (instructions.length > 20_000) {
      throw new Error("External pairwise judge prompt exceeds 20,000 characters");
    }
    return instructions;
  } catch {
    if (required) {
      throw new Error(
        "Live evaluation requires PAIRWISE_JUDGE_PROMPT.md in the external vault",
      );
    }
    return "Keep generator and judge roles strictly separated.";
  }
}

function validateFormalScenarios(scenarios: EvalScenario[]): void {
  const ids = scenarios.map((scenario) => scenario.id);
  const contentHashes = scenarios.map((scenario) =>
    sha256(
      JSON.stringify({
        draft: scenario.draft,
        writerContext: scenario.writerContext,
        constraints: scenario.constraints,
      }),
    ),
  );
  if (new Set(ids).size !== ids.length) {
    throw new Error("Formal scenario IDs must be unique");
  }
  if (new Set(contentHashes).size !== contentHashes.length) {
    throw new Error("Formal scenarios must contain unique source material");
  }
  if (
    scenarios.some(
      (scenario) =>
        scenario.burned !== false || !scenario.subgroup?.trim(),
    )
  ) {
    throw new Error(
      "Every formal scenario must declare burned: false and a non-empty subgroup",
    );
  }
}

export async function loadScenarioSet(
  setName: string,
  allowBurned: boolean,
): Promise<LoadedScenarioSet> {
  const vaultDir = await resolveVaultDir();
  const jsonCandidates = [
    path.join(vaultDir, `${setName}.scenarios.json`),
    path.join(vaultDir, "writing-studio", `${setName}.scenarios.json`),
  ];

  for (const sourcePath of jsonCandidates) {
    if (!(await pathExists(sourcePath))) continue;
    const raw = await readFile(sourcePath, "utf8");
    const parsed = scenarioFileSchema.parse(JSON.parse(raw));
    const scenarios = Array.isArray(parsed) ? parsed : parsed.scenarios;
    if (scenarios.length === 0) throw new Error("Scenario set is empty");
    if (!allowBurned) validateFormalScenarios(scenarios);
    return {
      vaultDir,
      sourcePath,
      raw,
      scenarios,
      judgeInstructions: await loadJudgeInstructions(vaultDir, !allowBurned),
    };
  }

  if (!allowBurned) {
    throw new Error(
      `No live JSON scenario set named "${setName}" was found in the external vault.`,
    );
  }

  const files = await readdir(vaultDir, { recursive: true });
  const burnedRelative = files.find((file) =>
    /\.burned[-.]example\.md$/i.test(String(file)),
  );
  if (!burnedRelative) {
    throw new Error("No JSON scenario set or burned rehearsal pack was found");
  }
  const sourcePath = path.join(vaultDir, String(burnedRelative));
  const raw = await readFile(sourcePath, "utf8");
  const scenarios = parseBurnedMarkdown(raw);
  if (scenarios.length === 0) {
    throw new Error("The burned rehearsal pack could not be parsed");
  }
  return {
    vaultDir,
    sourcePath,
    raw,
    scenarios,
    judgeInstructions: await loadJudgeInstructions(vaultDir, false),
  };
}
