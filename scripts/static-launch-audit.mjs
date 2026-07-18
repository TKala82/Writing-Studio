#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONVEX_DIR = join(ROOT, "convex");
const OUT_DIR = join(ROOT, "artifacts/launch-audit");
mkdirSync(OUT_DIR, { recursive: true });

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const exportPattern =
  /export const (\w+)\s*=\s*(query|mutation|action|internalQuery|internalMutation|internalAction)\(/g;

const findings = [];
const inventory = [];

for (const file of walk(CONVEX_DIR)) {
  const source = readFileSync(file, "utf8");
  let match;
  while ((match = exportPattern.exec(source)) !== null) {
    const [, name, kind] = match;
    const start = match.index;
    const chunk = source.slice(start, start + 2500);
    const isInternal = kind.startsWith("internal");
    const hasArgs = /args\s*:/.test(chunk);
    const hasReturns = /returns\s*:/.test(chunk);
    const hasAuth =
      /getCurrentUser\s*\(/.test(chunk) ||
      /getUserIdentity\s*\(/.test(chunk) ||
      /tokenIdentifier/.test(chunk);
    const hasRateLimit = /aiUsage\.reserve/.test(chunk);
    const item = {
      file: file.replace(ROOT + "/", ""),
      name,
      kind,
      hasArgs,
      hasReturns,
      hasAuth,
      hasRateLimit,
      isInternal,
    };
    inventory.push(item);

    if (!isInternal && !hasArgs) {
      findings.push({
        severity: "high",
        id: "missing-args-validator",
        message: `${item.file}:${name} missing args validator`,
      });
    }
    if (!isInternal && !hasReturns) {
      findings.push({
        severity: "high",
        id: "missing-returns-validator",
        message: `${item.file}:${name} missing returns validator`,
      });
    }
    if (!isInternal && !hasAuth) {
      findings.push({
        severity: "critical",
        id: "missing-auth-check",
        message: `${item.file}:${name} public ${kind} has no auth check in the opening handler chunk`,
      });
    }
  }
}

// Rate-limit gap probe for known AI actions
const aiActionFiles = inventory.filter(
  (item) => item.kind === "action" && !item.isInternal,
);
for (const item of aiActionFiles) {
  if (!item.hasRateLimit) {
    findings.push({
      severity: "medium",
      id: "ai-action-without-rate-limit",
      message: `${item.file}:${item.name} is a public AI action without aiUsage.reserve in the inspected chunk`,
    });
  }
}

// Demo mode / secret hygiene probes
const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
if (!envExample.includes("PIPELINE_DEMO_MODE")) {
  findings.push({
    severity: "medium",
    id: "demo-mode-undocumented",
    message: ".env.example does not document PIPELINE_DEMO_MODE",
  });
}
if (!envExample.includes("CURSOR_API_KEY")) {
  findings.push({
    severity: "low",
    id: "cursor-key-undocumented",
    message: ".env.example does not document CURSOR_API_KEY for external judge tooling",
  });
}

const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
if (!packageJson.scripts?.test) {
  findings.push({
    severity: "high",
    id: "no-test-script",
    message: "package.json has no npm test script",
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  inventoryCount: inventory.length,
  publicFunctions: inventory.filter((item) => !item.isInternal).length,
  findings,
  inventory,
};

writeFileSync(join(OUT_DIR, "static-audit.json"), JSON.stringify(report, null, 2));
writeFileSync(
  join(OUT_DIR, "static-audit.md"),
  [
    "# Static launch audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `- Convex functions inventoried: ${report.inventoryCount}`,
    `- Public functions: ${report.publicFunctions}`,
    `- Findings: ${findings.length}`,
    "",
    "## Findings",
    "",
    ...(findings.length
      ? findings.map((finding) => `- **${finding.severity}** \`${finding.id}\`: ${finding.message}`)
      : ["- None"]),
    "",
  ].join("\n"),
);

console.log(`Static audit wrote ${findings.length} findings to artifacts/launch-audit/`);
for (const finding of findings) {
  console.log(`[${finding.severity}] ${finding.id}: ${finding.message}`);
}
process.exit(findings.some((finding) => finding.severity === "critical") ? 1 : 0);
