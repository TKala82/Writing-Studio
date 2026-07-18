#!/usr/bin/env node
/**
 * Deploy / CI gate: fail if PIPELINE_DEMO_MODE would serve fixture copy.
 * Pass --strict to also fail when the flag is merely present in env files.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const strict = process.argv.includes("--strict");

function isTruthy(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

const processDemo = process.env.PIPELINE_DEMO_MODE;
// Local .env.local may enable demos; production gates care about process env
// and production env files only.
const fileSources = (strict
  ? [".env", ".env.production", ".env.local"]
  : [".env.production"]
).map((name) => ({
  name,
  values: readEnvFile(join(ROOT, name)),
}));

const errors = [];

if (isTruthy(processDemo)) {
  errors.push(
    `process.env.PIPELINE_DEMO_MODE=${JSON.stringify(processDemo)} is enabled`,
  );
}

for (const source of fileSources) {
  const value = source.values.PIPELINE_DEMO_MODE;
  if (value === undefined) continue;
  if (isTruthy(value)) {
    errors.push(
      `${source.name}: PIPELINE_DEMO_MODE=${JSON.stringify(value)} must be unset or 0 for production`,
    );
  }
}

if (errors.length > 0) {
  console.error("Demo-mode production gate failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Demo-mode production gate passed (PIPELINE_DEMO_MODE off).");
