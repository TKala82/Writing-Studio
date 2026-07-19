import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFile,
  cp,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

function valueAfter(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function git(args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

function runNpm(args) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error(
      "npm_execpath is unavailable. Start the runner with npm run research:experiment.",
    );
  }
  run(process.execPath, [npmCli, ...args]);
}

async function findEvaluationJson(root) {
  const entries = await readdir(root, { recursive: true });
  const match = entries.find((entry) =>
    String(entry).replaceAll("\\", "/").endsWith("/evaluation.json"),
  );
  if (!match) throw new Error(`No evaluation.json was produced under ${root}`);
  return path.join(root, String(match));
}

function safeTimestamp() {
  return new Date().toISOString().replaceAll(/[:.]/g, "-");
}

function compareRuns(baseline, candidate, gatesPassed) {
  const minimumImprovement = Number(
    process.env.EVAL_RESEARCH_MIN_IMPROVEMENT ?? 3,
  );
  const improvement =
    candidate.summary.meanDelta - baseline.summary.meanDelta;
  const lowerBoundNotWorse =
    candidate.summary.confidenceInterval95[0] >=
    baseline.summary.confidenceInterval95[0];
  const fidelityNotWorse =
    candidate.summary.treatmentFidelityFailures <=
    baseline.summary.treatmentFidelityFailures;
  const subgroupsNotWorse = Object.entries(
    candidate.summary.subgroupDeltas,
  ).every(([subgroup, delta]) => {
    const prior = baseline.summary.subgroupDeltas[subgroup] ?? 0;
    return delta - prior >= -3;
  });
  return {
    improvement,
    lowerBoundNotWorse,
    fidelityNotWorse,
    subgroupsNotWorse,
    gatesPassed,
    recommendation:
      !candidate.mock &&
      improvement >= minimumImprovement &&
      lowerBoundNotWorse &&
      fidelityNotWorse &&
      subgroupsNotWorse &&
      gatesPassed
        ? "KEEP"
        : candidate.mock
          ? "REHEARSAL"
          : "DISCARD",
  };
}

async function main() {
  const args = process.argv.slice(2);
  const hypothesis = valueAfter(args, "--hypothesis");
  if (!hypothesis) throw new Error("--hypothesis is required");
  const baselineMode = args.includes("--baseline");
  const mock = args.includes("--mock") || process.env.EVAL_MOCK === "1";
  const skipGates = args.includes("--skip-gates");
  const setName = valueAfter(args, "--set") ?? "dev";
  if (setName !== "dev") {
    throw new Error(
      "Prompt research may use only the external dev set; holdout is reserved for formal evaluation.",
    );
  }
  const seed = valueAfter(args, "--seed") ?? process.env.EVAL_SEED ?? "lede-eval-v1";
  const artifactsRoot = path.resolve(
    process.cwd(),
    "artifacts",
    "experiments",
  );
  const runRoot = path.join(
    artifactsRoot,
    "runs",
    `${safeTimestamp()}-${baselineMode ? "baseline" : "candidate"}`,
  );
  const baselinePath = path.join(artifactsRoot, "baseline.json");
  const logPath = path.join(artifactsRoot, "LOG.md");
  await mkdir(runRoot, { recursive: true });

  if (baselineMode) {
    const status = git(["status", "--porcelain"]);
    if (status) {
      throw new Error(
        "Baseline requires a clean working tree. Commit or set aside unrelated changes first.",
      );
    }
  } else {
    runNpm(["run", "research:guard"]);
  }

  let gatesPassed = true;
  if (!baselineMode && !skipGates) {
    try {
      runNpm(["run", "test:launch-gates"]);
    } catch {
      gatesPassed = false;
    }
  }

  const evalArgs = [
    "run",
    "eval",
    "--",
    "--set",
    setName,
    "--seed",
    seed,
    "--output",
    runRoot,
  ];
  if (mock) evalArgs.push("--mock");
  runNpm(evalArgs);
  const evaluationPath = await findEvaluationJson(runRoot);
  const candidate = JSON.parse(await readFile(evaluationPath, "utf8"));

  await mkdir(artifactsRoot, { recursive: true });
  if (baselineMode) {
    await cp(evaluationPath, baselinePath);
    console.log(`Research baseline recorded: ${baselinePath}`);
    return;
  }

  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  if (
    baseline.commitSha !== git(["rev-parse", "HEAD"]) ||
    baseline.seed !== candidate.seed ||
    baseline.scenarioSetHash !== candidate.scenarioSetHash ||
    baseline.generatorModel !== candidate.generatorModel ||
    baseline.judgeModel !== candidate.judgeModel ||
    baseline.rubricHash !== candidate.rubricHash ||
    baseline.harnessHash !== candidate.harnessHash ||
    baseline.configurationHash !== candidate.configurationHash
  ) {
    throw new Error(
      "Candidate is not comparable to baseline: seed, scenarios, or models changed.",
    );
  }

  const comparison = compareRuns(baseline, candidate, gatesPassed);
  const diff = git([
    "diff",
    "--",
    "convex/lib/prompts.ts",
    "src/lib/genres",
  ]);
  const record = {
    experimentId: `experiment-${safeTimestamp()}`,
    createdAt: new Date().toISOString(),
    hypothesis,
    baselineCommit: baseline.commitSha,
    candidateCommit: git(["rev-parse", "HEAD"]),
    scenarioSet: setName,
    seed,
    diff,
    baselineSummary: baseline.summary,
    candidateSummary: candidate.summary,
    usage: candidate.usage,
    comparison,
    evaluationArtifact: path.relative(process.cwd(), evaluationPath),
  };
  const recordPath = path.join(artifactsRoot, `${record.experimentId}.json`);
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
  await appendFile(
    logPath,
    `\n## ${record.experimentId} — ${comparison.recommendation}\n\n` +
      `- Hypothesis: ${hypothesis}\n` +
      `- Mean-delta improvement: ${comparison.improvement.toFixed(2)}\n` +
      `- Baseline / candidate mean delta: ${baseline.summary.meanDelta.toFixed(2)} / ${candidate.summary.meanDelta.toFixed(2)}\n` +
      `- Candidate cost: $${candidate.usage.estimatedCostUsd.toFixed(4)}\n` +
      `- Fidelity not worse: ${comparison.fidelityNotWorse}\n` +
      `- Lower CI bound not worse: ${comparison.lowerBoundNotWorse}\n` +
      `- Subgroups not worse: ${comparison.subgroupsNotWorse}\n` +
      `- Launch gates passed: ${comparison.gatesPassed}\n` +
      `- Record: ${path.basename(recordPath)}\n`,
    "utf8",
  );
  console.log(
    `${comparison.recommendation}: mean-delta improvement ${comparison.improvement.toFixed(2)}. Record: ${recordPath}`,
  );
  if (comparison.recommendation === "DISCARD") {
    git([
      "restore",
      "--worktree",
      "--",
      "convex/lib/prompts.ts",
      "src/lib/genres",
    ]);
    console.log("Discarded candidate prompt changes and restored the baseline.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
