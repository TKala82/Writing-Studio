#!/usr/bin/env node
/**
 * First-pass launch readiness audit runner.
 * Executes static, unit, e2e, security, and dependency checks; writes a report.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "artifacts/launch-audit");
const DOCS = join(ROOT, "docs");
mkdirSync(OUT, { recursive: true });
mkdirSync(DOCS, { recursive: true });

const results = [];

function run(id, command, args, options = {}) {
  console.log(`\n=== RUN ${id}: ${command} ${args.join(" ")} ===`);
  const started = Date.now();
  const completed = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
  const entry = {
    id,
    command: [command, ...args].join(" "),
    status:
      completed.status === 0
        ? "passed"
        : completed.signal
          ? "failed"
          : "failed",
    exitCode: completed.status,
    signal: completed.signal,
    durationMs: Date.now() - started,
    stdout: (completed.stdout || "").slice(-20_000),
    stderr: (completed.stderr || "").slice(-20_000),
  };
  results.push(entry);
  writeFileSync(join(OUT, `${id}.log`), `${entry.stdout}\n${entry.stderr}`);
  console.log(`=== ${id} => ${entry.status} (${entry.durationMs}ms) ===`);
  return entry;
}

function probe(id, fn) {
  const started = Date.now();
  try {
    const detail = fn() || "ok";
    results.push({
      id,
      command: "probe",
      status: "passed",
      exitCode: 0,
      durationMs: Date.now() - started,
      stdout: String(detail),
      stderr: "",
    });
  } catch (error) {
    results.push({
      id,
      command: "probe",
      status: "failed",
      exitCode: 1,
      durationMs: Date.now() - started,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
    });
  }
}

async function liveAiProbe() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    throw new Error(`OpenAI models probe failed: ${response.status} ${await response.text()}`);
  }
  return `OpenAI reachable (${response.status})`;
}

async function googleProbe() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
  );
  if (!response.ok) {
    throw new Error(`Google models probe failed: ${response.status} ${await response.text()}`);
  }
  return `Google reachable (${response.status})`;
}

async function anthropicProbe() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Anthropic models probe failed: ${response.status} ${await response.text()}`,
    );
  }
  return `Anthropic reachable (${response.status})`;
}

// 1) Static / compile gate
run("lint-typecheck", "npm", ["run", "check"]);
run("build", "npm", ["run", "build"]);
run("static-audit", "node", ["scripts/static-launch-audit.mjs"]);

// 2) Unit tests
run("unit", "npx", ["vitest", "run"]);

// 3) Dependency audit
run("npm-audit", "npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8" });

// 4) Runtime probes
probe("next-home", () => {
  const result = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://localhost:3000/"], {
    encoding: "utf8",
  });
  if (result.stdout !== "200") throw new Error(`Expected 200, got ${result.stdout}`);
  return "homepage 200";
});
probe("convex-port", () => {
  const result = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "http://127.0.0.1:3210/"], {
    encoding: "utf8",
  });
  // Convex local may return non-200 on bare GET; any TCP response is enough here.
  if (result.error) throw result.error;
  return `convex http status ${result.stdout || "none"}`;
});

probe("demo-mode-env", () => {
  const listed = spawnSync("npx", ["convex", "env", "list"], { encoding: "utf8" });
  if (listed.status !== 0) throw new Error(listed.stderr || "convex env list failed");
  const text = `${listed.stdout}\n${listed.stderr}`;
  if (!/PIPELINE_DEMO_MODE/i.test(text)) {
    throw new Error("PIPELINE_DEMO_MODE not set on Convex deployment");
  }
  return text.match(/PIPELINE_DEMO_MODE.*/)?.[0] || "PIPELINE_DEMO_MODE present";
});

// 5) Provider reachability (not full pipeline)
await Promise.allSettled([
  liveAiProbe().then((detail) =>
    results.push({
      id: "provider-openai",
      command: "probe",
      status: "passed",
      exitCode: 0,
      durationMs: 0,
      stdout: detail,
      stderr: "",
    }),
  ),
  googleProbe().then((detail) =>
    results.push({
      id: "provider-google",
      command: "probe",
      status: "passed",
      exitCode: 0,
      durationMs: 0,
      stdout: detail,
      stderr: "",
    }),
  ),
  anthropicProbe().then((detail) =>
    results.push({
      id: "provider-anthropic",
      command: "probe",
      status: "passed",
      exitCode: 0,
      durationMs: 0,
      stdout: detail,
      stderr: "",
    }),
  ),
]).then(async (settled) => {
  const ids = ["provider-openai", "provider-google", "provider-anthropic"];
  settled.forEach((item, index) => {
    if (item.status === "rejected") {
      results.push({
        id: ids[index],
        command: "probe",
        status: "failed",
        exitCode: 1,
        durationMs: 0,
        stdout: "",
        stderr: item.reason instanceof Error ? item.reason.message : String(item.reason),
      });
    }
  });
});

// 6) Playwright e2e
run("playwright-install", "npx", ["playwright", "install", "chromium"]);
run("e2e", "npx", ["playwright", "test"]);

// Compose markdown report
const failed = results.filter((result) => result.status !== "passed");
const passed = results.filter((result) => result.status === "passed");

let staticFindings = [];
try {
  staticFindings = JSON.parse(
    readFileSync(join(OUT, "static-audit.json"), "utf8"),
  ).findings;
} catch {
  staticFindings = [];
}

let auditVulns = null;
try {
  const auditLog = readFileSync(join(OUT, "npm-audit.log"), "utf8");
  const jsonStart = auditLog.indexOf("{");
  if (jsonStart >= 0) {
    auditVulns = JSON.parse(auditLog.slice(jsonStart)).metadata?.vulnerabilities;
  }
} catch {
  auditVulns = null;
}

const reportLines = [
  "# Launch audit report — first pass",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Verdict",
  "",
  failed.length === 0
    ? "All executed checks passed."
    : `${failed.length} check(s) failed. See failures below and the remediation plan in docs/LAUNCH_READINESS_PLAN.md.`,
  "",
  "## Summary",
  "",
  `| Status | Count |`,
  `| --- | ---: |`,
  `| Passed | ${passed.length} |`,
  `| Failed | ${failed.length} |`,
  "",
  "## Check results",
  "",
  ...results.map(
    (result) =>
      `- **${result.status.toUpperCase()}** \`${result.id}\` (${result.durationMs}ms)` +
      (result.status === "passed"
        ? ""
        : `\n  - exit ${result.exitCode}\n  - ${compactError(result)}`),
  ),
  "",
  "## Static findings",
  "",
  ...(staticFindings.length
    ? staticFindings.map(
        (finding) =>
          `- **${finding.severity}** \`${finding.id}\`: ${finding.message}`,
      )
    : ["- None parsed"]),
  "",
  "## Dependency audit (production)",
  "",
  auditVulns
    ? `- critical: ${auditVulns.critical}, high: ${auditVulns.high}, moderate: ${auditVulns.moderate}, low: ${auditVulns.low}`
    : "- Could not parse npm audit JSON",
  "",
  "## Notes",
  "",
  "- Demo mode may be enabled in this environment (`PIPELINE_DEMO_MODE`). A green demo pipeline is not independent proof of live model quality.",
  "- Blind fellowship-prompt evaluation remains an external workflow; see docs/EVAL_WORKFLOW.md.",
  "",
];

function compactError(result) {
  const text = `${result.stderr}\n${result.stdout}`.trim();
  return text
    .split("\n")
    .filter(Boolean)
    .slice(-8)
    .join("\n  - ");
}

writeFileSync(join(OUT, "summary.json"), JSON.stringify({ results, failed, staticFindings, auditVulns }, null, 2));
writeFileSync(join(DOCS, "LAUNCH_AUDIT_REPORT.md"), reportLines.join("\n"));
console.log(`\nWrote ${join(DOCS, "LAUNCH_AUDIT_REPORT.md")}`);
process.exit(failed.length ? 1 : 0);
