import { execFileSync } from "node:child_process";

import { disallowedExperimentPaths } from "./allowlist";

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
  }).trim();
}

const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
const base = baseIndex >= 0 ? args[baseIndex + 1] : "HEAD";
const allowClean = args.includes("--allow-clean");
if (!base) throw new Error("--base requires a git revision");

const tracked = git(["diff", "--name-only", base, "--"])
  .split(/\r?\n/)
  .filter(Boolean);
const untracked = git(["ls-files", "--others", "--exclude-standard"])
  .split(/\r?\n/)
  .filter(Boolean);
const changed = [...new Set([...tracked, ...untracked])];
const disallowed = disallowedExperimentPaths(changed);

if (disallowed.length > 0) {
  console.error("Experiment diff contains non-allowlisted files:");
  for (const filePath of disallowed) console.error(`- ${filePath}`);
  process.exitCode = 1;
} else if (changed.length === 0 && !allowClean) {
  console.error("Experiment diff is empty.");
  process.exitCode = 1;
} else {
  console.log(
    changed.length === 0
      ? "Experiment working tree is clean."
      : `Experiment diff is allowlisted (${changed.length} file(s)).`,
  );
}
