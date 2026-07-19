import { execFileSync } from "node:child_process";
import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { anonymizePair, sha256 } from "./anonymize";
import { verifyFrozenBrief } from "./brief";
import { BudgetTracker } from "./budget";
import { generatePair } from "./generator";
import { judgePair, needsTieBreaker } from "./judge";
import { loadEvalModels } from "./models";
import { writeEvalReports } from "./report";
import { scoreCondition, summarizeResults } from "./scoring";
import type { EvalRun, ScenarioResult } from "./types";
import { loadScenarioSet } from "./vault";

interface CliOptions {
  setName: string;
  seed: string;
  mock: boolean;
  limit?: number;
  output?: string;
  brief?: string;
  prepareBrief: boolean;
}

function parseCli(args: string[]): CliOptions {
  const values = new Map<string, string>();
  let mock = process.env.EVAL_MOCK === "1";
  let prepareBrief = false;
  const valuedFlags = new Set([
    "--set",
    "--seed",
    "--limit",
    "--output",
    "--brief",
  ]);
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--mock") {
      mock = true;
      continue;
    }
    if (argument === "--prepare-brief") {
      prepareBrief = true;
      continue;
    }
    if (!valuedFlags.has(argument)) {
      throw new Error(`Unknown evaluation argument: ${argument}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }
    values.set(argument, value);
    index += 1;
  }
  const limitValue = values.get("--limit");
  const limit = limitValue === undefined ? undefined : Number(limitValue);
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1)
  ) {
    throw new Error("--limit must be a positive integer");
  }
  return {
    setName: values.get("--set") ?? "dev",
    seed: values.get("--seed") ?? process.env.EVAL_SEED ?? "lede-eval-v1",
    mock,
    limit,
    output: values.get("--output"),
    brief: values.get("--brief"),
    prepareBrief,
  };
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function evaluationId(setName: string, mock: boolean): string {
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  return `${timestamp}-${setName}${mock ? "-mock" : ""}`;
}

async function hashFiles(relativePaths: string[]): Promise<string> {
  const contents = await Promise.all(
    relativePaths.map(async (relativePath) => {
      const content = await readFile(path.resolve(process.cwd(), relativePath));
      return `${relativePath}\0${content.toString("utf8")}`;
    }),
  );
  return sha256(contents.join("\0"));
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const options = parseCli(process.argv.slice(2));
  if (options.mock && options.setName === "holdout") {
    throw new Error(
      "Mock runs cannot use the reserved holdout set. Use --set dev.",
    );
  }
  const formal = !options.mock && options.setName === "holdout";
  if (formal && git(["status", "--porcelain"])) {
    throw new Error(
      "Formal evaluation requires a clean working tree at the frozen commit.",
    );
  }
  const loaded = await loadScenarioSet(options.setName, options.mock);
  const scenarios = options.limit
    ? loaded.scenarios.slice(0, options.limit)
    : loaded.scenarios;
  if (formal && options.limit !== undefined) {
    throw new Error("Formal holdout evaluation does not allow --limit");
  }
  if (formal && scenarios.length < 20) {
    throw new Error(
      "Formal evaluations require at least 20 unseen scenarios. Use --mock for orchestration rehearsal.",
    );
  }

  const models = options.mock ? null : loadEvalModels();
  const currentCommit = git(["rev-parse", "HEAD"]);
  const scenarioSetHash = sha256(loaded.raw);
  const promptHash = await hashFiles([
    "convex/lib/prompts.ts",
    "src/lib/genres/motivation-statement.ts",
  ]);
  const rubricHash = sha256(
    `${await readFile(path.resolve(process.cwd(), "docs", "EVAL_WORKFLOW.md"), "utf8")}\0${loaded.judgeInstructions}`,
  );
  const harnessHash = await hashFiles([
    "scripts/eval/anonymize.ts",
    "scripts/eval/brief.ts",
    "scripts/eval/budget.ts",
    "scripts/eval/generator.ts",
    "scripts/eval/index.ts",
    "scripts/eval/judge.ts",
    "scripts/eval/models.ts",
    "scripts/eval/report.ts",
    "scripts/eval/scoring.ts",
    "scripts/eval/types.ts",
    "scripts/eval/vault.ts",
    "package-lock.json",
  ]);
  const configurationHash = sha256(
    JSON.stringify({
      maxOutputTokens: Number(process.env.EVAL_MAX_OUTPUT_TOKENS ?? 2_500),
      judgeMaxOutputTokens: Number(
        process.env.EVAL_JUDGE_MAX_OUTPUT_TOKENS ?? 3_500,
      ),
      judgeTemperature: Number(
        process.env.EVAL_JUDGE_TEMPERATURE ?? 0.2,
      ),
      maxTotalTokens: Number(
        process.env.EVAL_MAX_TOTAL_TOKENS ?? 250_000,
      ),
      maxUsd: Number(process.env.EVAL_MAX_USD ?? 25),
      inputUsdPerMillion: Number(
        process.env.EVAL_INPUT_USD_PER_MILLION ?? 15,
      ),
      outputUsdPerMillion: Number(
        process.env.EVAL_OUTPUT_USD_PER_MILLION ?? 75,
      ),
    }),
  );
  const generatorModel = models
    ? `${models.generator.provider}:${models.generator.id}`
    : "mock-generator";
  const judgeModels = models
    ? models.judges.map((model) => `${model.provider}:${model.id}`)
    : ["mock-judge", "mock-judge"];
  if (options.prepareBrief) {
    if (!formal) {
      throw new Error("--prepare-brief requires a live --set holdout run");
    }
    const draftPath = path.join(loaded.vaultDir, "holdout.brief.draft.json");
    await writeFile(
      draftPath,
      `${JSON.stringify(
        {
          status: "draft",
          evaluationId: evaluationId("holdout", false),
          frozenCommitSha: currentCommit,
          seed: options.seed,
          scenarioSet: "holdout",
          scenarioSetHash,
          promptHash,
          rubricHash,
          harnessHash,
          configurationHash,
          generatorModel,
          judgeModels,
          maxOutputTokens: Number(
            process.env.EVAL_MAX_OUTPUT_TOKENS ?? 2_500,
          ),
          maxTotalTokens: Number(
            process.env.EVAL_MAX_TOTAL_TOKENS ?? 250_000,
          ),
          maxUsd: Number(process.env.EVAL_MAX_USD ?? 25),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    console.log(
      `[eval] Draft manifest written outside the repository: ${draftPath}`,
    );
    console.log(
      "[eval] Review it, set status to frozen, and save as holdout.brief.json before generation.",
    );
    return;
  }
  const frozenBrief = formal
    ? await verifyFrozenBrief({
        briefPath: options.brief,
        vaultDir: loaded.vaultDir,
        expected: {
          commitSha: currentCommit,
          seed: options.seed,
          scenarioSetHash,
          promptHash,
          rubricHash,
          harnessHash,
          configurationHash,
          generatorModel,
          judgeModels,
        },
      })
    : undefined;
  const consumedPath = path.join(
    loaded.vaultDir,
    "consumed",
    `${scenarioSetHash}.json`,
  );
  if (formal) {
    await mkdir(path.dirname(consumedPath), { recursive: true });
    try {
      const reservation = await open(consumedPath, "wx");
      await reservation.writeFile(
        `${JSON.stringify(
          {
            status: "reserved",
            evaluationId: frozenBrief?.evaluationId,
            reservedAt: new Date().toISOString(),
            commitSha: currentCommit,
            scenarioSetHash,
            briefHash: frozenBrief?.briefHash,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      await reservation.close();
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "EEXIST") {
        throw new Error(
          "This holdout scenario set is already reserved or consumed and must be replaced.",
        );
      }
      throw error;
    }
  }

  const budget = new BudgetTracker();
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    const generated = await generatePair({
      scenario,
      model: models?.generator ?? null,
      budget,
      mock: options.mock,
    });
    const anonymized = anonymizePair(
      scenario.id,
      generated.treatment,
      generated.control,
      options.seed,
    );
    const judges = [];
    for (let judgeIndex = 1; judgeIndex <= 2; judgeIndex += 1) {
      const judgeModel = models
        ? models.judges[judgeIndex - 1]
        : null;
      judges.push(
        await judgePair({
          scenario,
          pair: anonymized,
          judgeIndex,
          model: judgeModel,
          budget,
          mock: options.mock,
          judgeInstructions: loaded.judgeInstructions,
        }),
      );
    }
    if (needsTieBreaker(judges)) {
      const tieBreakerModel = models
        ? (models.judges[2] ?? models.judges[0])
        : null;
      judges.push(
        await judgePair({
          scenario,
          pair: anonymized,
          judgeIndex: 3,
          model: tieBreakerModel,
          budget,
          mock: options.mock,
          judgeInstructions: loaded.judgeInstructions,
        }),
      );
    }
    const treatmentScore = scoreCondition(
      "treatment",
      judges,
      anonymized.labelToCondition,
    );
    const controlScore = scoreCondition(
      "control",
      judges,
      anonymized.labelToCondition,
    );
    const delta = treatmentScore.score - controlScore.score;
    results.push({
      scenario,
      ...generated,
      anonymized,
      judges,
      treatmentScore,
      controlScore,
      delta,
      winner:
        Math.abs(delta) < 0.01
          ? "tie"
          : delta > 0
            ? "treatment"
            : "control",
    });
    console.log(
      `[eval] ${scenario.id}: treatment ${treatmentScore.score.toFixed(1)}, control ${controlScore.score.toFixed(1)}, delta ${delta.toFixed(1)}`,
    );
  }

  const summary = summarizeResults(results, options.seed);
  const run: EvalRun = {
    evaluationId:
      frozenBrief?.evaluationId ??
      evaluationId(options.setName, options.mock),
    createdAt: new Date().toISOString(),
    commitSha: currentCommit,
    scenarioSet: options.setName,
    scenarioSetHash,
    promptHash,
    rubricHash,
    harnessHash,
    configurationHash,
    briefHash: frozenBrief?.briefHash,
    seed: options.seed,
    mock: options.mock,
    generatorModel,
    judgeModel: judgeModels.join(", "),
    results,
    summary:
      formal
        ? summary
        : { ...summary, decision: "exploratory" },
    usage: budget.snapshot(),
    runtimeMs: Date.now() - startedAt,
  };
  const paths = await writeEvalReports(
    run,
    options.output ? path.resolve(options.output) : undefined,
    path.join(loaded.vaultDir, "results"),
  );
  if (formal) {
    await writeFile(
      consumedPath,
      `${JSON.stringify(
        {
          status: "complete",
          evaluationId: run.evaluationId,
          consumedAt: run.createdAt,
          commitSha: run.commitSha,
          scenarioSetHash,
          briefHash: run.briefHash,
          decision: run.summary.decision,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
  console.log(
    `[eval] ${run.summary.decision.toUpperCase()} — report: ${paths.markdownPath}`,
  );
  if (formal && run.summary.decision === "fail") {
    process.exitCode = 2;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
