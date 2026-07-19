import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { sha256 } from "./anonymize";
import type { EvalRun } from "./types";

function fixed(value: number): string {
  return value.toFixed(2);
}

function markdownReport(run: EvalRun): string {
  const summary = run.summary;
  const rows = run.results
    .map(
      (result) =>
        `| ${result.scenario.id} | ${fixed(result.treatmentScore.score)} | ${fixed(result.controlScore.score)} | ${fixed(result.delta)} | ${result.winner} |`,
    )
    .join("\n");
  return `# Lede external prompt evaluation

- Evaluation ID: ${run.evaluationId}
- Created UTC: ${run.createdAt}
- Frozen commit: ${run.commitSha}
- Scenario set: ${run.scenarioSet} (${run.scenarioSetHash})
- Prompt hash: ${run.promptHash}
- Rubric hash: ${run.rubricHash}
- Randomization seed: ${run.seed}
- Generator: ${run.generatorModel}
- Judge: ${run.judgeModel}
- Mock rehearsal: ${run.mock ? "yes — not quality evidence" : "no"}

## Decision

**${summary.decision.toUpperCase()}**

- Treatment mean: ${fixed(summary.treatmentMean)}
- Control mean: ${fixed(summary.controlMean)}
- Mean paired delta: ${fixed(summary.meanDelta)}
- 95% bootstrap CI: [${fixed(summary.confidenceInterval95[0])}, ${fixed(summary.confidenceInterval95[1])}]
- Win / tie / loss: ${summary.wins} / ${summary.ties} / ${summary.losses}
- Factual-fidelity failures (treatment / control): ${summary.treatmentFidelityFailures} / ${summary.controlFidelityFailures}
- Judge agreement: ${fixed(summary.judgeAgreement * 100)}%
- Runtime: ${fixed(run.runtimeMs / 1_000)} seconds
- Tokens (input / output): ${run.usage.inputTokens} / ${run.usage.outputTokens}
- Estimated cost: $${run.usage.estimatedCostUsd.toFixed(4)}

## Scenario results

| Scenario | Treatment | Control | Delta | Winner |
| --- | ---: | ---: | ---: | --- |
${rows}

## Subgroups

${Object.entries(summary.subgroupDeltas)
  .map(([subgroup, delta]) => `- ${subgroup}: ${fixed(delta)}`)
  .join("\n")}

## Interpretation

Mock runs validate orchestration only. A formal decision requires at least 20 previously unseen scenarios from the external vault and the pre-registered rule in \`docs/EVAL_WORKFLOW.md\`.
`;
}

function evaluationBrief(run: EvalRun): string {
  const summary = run.summary;
  return `# Executed external evaluation record

This file is generated after the run. It does not replace the frozen
pre-registration manifest required for a formal holdout evaluation.

## Run identity

- Evaluation ID: ${run.evaluationId}
- Date (UTC): ${run.createdAt}
- Owner: pending sign-off
- Repository URL: https://github.com/TKala82/Writing-Studio
- Frozen commit SHA: ${run.commitSha}
- Production prompt file(s): convex/lib/prompts.ts
- Production prompt hash: ${run.promptHash}
- Scenario-set ID and hash: ${run.scenarioSet} / ${run.scenarioSetHash}
- Rubric version and hash: docs/EVAL_WORKFLOW.md / ${run.rubricHash}
- Randomization seed: ${run.seed}
- Frozen brief hash: ${run.briefHash ?? "not applicable (exploratory run)"}

## Hypothesis and decision rule

- Primary hypothesis: Lede's production fellowship prompt improves paired blind-judge quality over a generic control.
- Minimum meaningful paired improvement: 5 points out of 100
- Factual-fidelity tolerance: no increase
- Required confidence interval: lower bound above zero
- Subgroups that must not regress: no subgroup below -3 points
- Predeclared exclusions: malformed or provider-failed pairs only; report all exclusions
- Stopping rule: one generation per condition on the frozen scenario set

## Generation

- Runtime / Builder: scripts/eval
- Generator model and exact version: ${run.generatorModel}
- Model parameters: temperature 0
- Token limit: ${process.env.EVAL_MAX_OUTPUT_TOKENS ?? "2500"}
- Treatment prompt source: convex/lib/prompts.ts
- Control prompt: generic evidence-preserving fellowship rewrite
- Number of scenarios: ${run.results.length}
- Number of generations per condition: 1
- Timeout and retry policy: provider SDK defaults; no silent exclusions

## Blind judging

- Judge model(s) and exact versions: ${run.judgeModel}
- Judge parameters: temperature ${process.env.EVAL_JUDGE_TEMPERATURE ?? "0.2"}
- Number of judges per pair: 2, third on disagreement
- Tie-break rule: third judge on winner disagreement or dimension gap greater than 1
- Evidence citation required: yes
- Repository access disabled: yes
- Prompt labels removed: yes
- Output order randomized: yes

## Results

- Treatment mean: ${fixed(summary.treatmentMean)}
- Control mean: ${fixed(summary.controlMean)}
- Mean paired delta: ${fixed(summary.meanDelta)}
- 95% bootstrap confidence interval: [${fixed(summary.confidenceInterval95[0])}, ${fixed(summary.confidenceInterval95[1])}]
- Treatment win / tie / loss: ${summary.wins} / ${summary.ties} / ${summary.losses}
- Treatment factual-fidelity failures: ${summary.treatmentFidelityFailures}
- Control factual-fidelity failures: ${summary.controlFidelityFailures}
- Inter-judge agreement: ${fixed(summary.judgeAgreement * 100)}%
- Subgroup deltas: ${JSON.stringify(summary.subgroupDeltas)}
- Runtime: ${fixed(run.runtimeMs / 1_000)} seconds
- Input / output tokens: ${run.usage.inputTokens} / ${run.usage.outputTokens}
- Estimated cost: $${run.usage.estimatedCostUsd.toFixed(4)}

## Decision and limitations

- Decision: ${summary.decision}
- Decision-rule calculation: automated by scripts/eval/scoring.ts
- Known limitations: ${run.mock ? "Mock rehearsal only; no writing-quality claim." : "AI judges are not expert human reviewers."}
- Deviations from this brief: pending reviewer check
- Human reviewer sign-off: pending
- Artifact manifest and hashes: see evaluation JSON
`;
}

export async function writeEvalReports(
  run: EvalRun,
  outputRoot = path.resolve(process.cwd(), "artifacts", "eval"),
  privateOutputRoot?: string,
): Promise<{
  jsonPath: string;
  markdownPath: string;
  briefPath: string;
  privateJsonPath?: string;
}> {
  const runDir = path.join(outputRoot, run.evaluationId);
  await mkdir(runDir, { recursive: true });
  const jsonPath = path.join(runDir, "evaluation.json");
  const markdownPath = path.join(runDir, "report.md");
  const briefPath = path.join(runDir, "brief.md");
  const sanitizedRun = {
    ...run,
    results: run.results.map((result) => ({
      scenario: {
        id: result.scenario.id,
        title: result.scenario.title,
        subgroup: result.scenario.subgroup,
        burned: result.scenario.burned,
      },
      treatment: {
        condition: result.treatment.condition,
        model: result.treatment.model,
        usage: result.treatment.usage,
        textHash: sha256(result.treatment.text),
      },
      control: {
        condition: result.control.condition,
        model: result.control.model,
        usage: result.control.usage,
        textHash: sha256(result.control.text),
      },
      judges: result.judges.map((judge) => ({
        judgeIndex: judge.judgeIndex,
        model: judge.model,
        winner: judge.winner,
        usage: judge.usage,
      })),
      treatmentScore: result.treatmentScore,
      controlScore: result.controlScore,
      delta: result.delta,
      winner: result.winner,
    })),
  };
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(sanitizedRun, null, 2)}\n`, "utf8"),
    writeFile(markdownPath, markdownReport(run), "utf8"),
    writeFile(briefPath, evaluationBrief(run), "utf8"),
  ]);
  let privateJsonPath: string | undefined;
  if (privateOutputRoot) {
    const privateRunDir = path.join(privateOutputRoot, run.evaluationId);
    await mkdir(privateRunDir, { recursive: true });
    privateJsonPath = path.join(privateRunDir, "evaluation.private.json");
    await writeFile(privateJsonPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  }
  return { jsonPath, markdownPath, briefPath, privateJsonPath };
}
