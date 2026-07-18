#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CONVEX_DIR = join(ROOT, "convex");
const OUT_DIR = join(ROOT, "artifacts/launch-audit");
mkdirSync(OUT_DIR, { recursive: true });

const REQUIRED_RATE_LIMITED_ACTIONS = [
  { file: "convex/selectionActions.ts", name: "legalLens" },
  { file: "convex/rubricActions.ts", name: "deriveFromReferences" },
  { file: "convex/voiceActions.ts", name: "addSample" },
];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith("_") || entry.name === "node_modules") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".js")) {
      files.push(full);
    }
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
    const chunk = source.slice(start, start + 3500);
    const isInternal = kind.startsWith("internal");
    const hasArgs = /args\s*:/.test(chunk);
    const hasReturns = /returns\s*:/.test(chunk);
    const hasAuth =
      /getCurrentUser\s*\(/.test(chunk) ||
      /getUserIdentity\s*\(/.test(chunk) ||
      /tokenIdentifier/.test(chunk);
    const hasRateLimit = /aiUsage\.reserve/.test(chunk);
    const relative = file.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
    const item = {
      file: relative.replaceAll("\\", "/"),
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

for (const required of REQUIRED_RATE_LIMITED_ACTIONS) {
  const item = inventory.find(
    (entry) => entry.file === required.file && entry.name === required.name,
  );
  if (!item) {
    findings.push({
      severity: "high",
      id: "missing-ai-action",
      message: `${required.file}:${required.name} was expected but not found`,
    });
    continue;
  }
  if (!item.hasRateLimit) {
    findings.push({
      severity: "medium",
      id: "ai-action-without-rate-limit",
      message: `${item.file}:${item.name} is a public AI action without aiUsage.reserve`,
    });
  }
}

const demoSource = readFileSync(
  join(ROOT, "convex/lib/demoPipeline.ts"),
  "utf8",
);
if (!demoSource.includes("assertDemoModeAllowed")) {
  findings.push({
    severity: "high",
    id: "missing-demo-mode-guard",
    message: "convex/lib/demoPipeline.ts lacks assertDemoModeAllowed",
  });
}

const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
if (!envExample.includes("PIPELINE_DEMO_MODE")) {
  findings.push({
    severity: "medium",
    id: "demo-mode-undocumented",
    message: ".env.example does not document PIPELINE_DEMO_MODE",
  });
}
if (!envExample.includes("ALLOW_PIPELINE_DEMO_MODE")) {
  findings.push({
    severity: "medium",
    id: "demo-allow-undocumented",
    message: ".env.example does not document ALLOW_PIPELINE_DEMO_MODE",
  });
}

const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
if (!packageJson.scripts?.["assert:demo-off"]) {
  findings.push({
    severity: "medium",
    id: "missing-demo-off-script",
    message: "package.json lacks assert:demo-off deploy gate",
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  inventoryCount: inventory.length,
  findings,
  rateLimitedRequired: REQUIRED_RATE_LIMITED_ACTIONS.map((item) => {
    const match = inventory.find(
      (entry) => entry.file === item.file && entry.name === item.name,
    );
    return {
      ...item,
      hasRateLimit: Boolean(match?.hasRateLimit),
    };
  }),
};

writeFileSync(
  join(OUT_DIR, "static-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

const blocking = findings.filter((finding) =>
  ["critical", "high", "medium"].includes(finding.severity),
);

if (blocking.length > 0) {
  console.error("Static launch audit found issues:");
  for (const finding of blocking) {
    console.error(`- [${finding.severity}] ${finding.message}`);
  }
  process.exit(1);
}

console.log(
  `Static launch audit passed (${inventory.length} Convex exports scanned).`,
);
