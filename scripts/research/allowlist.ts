const exactAllowedPaths = new Set(["convex/lib/prompts.ts"]);
const allowedPrefixes = ["src/lib/genres/"];

export function normalizeGitPath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/^\.?\//, "");
}

export function isAllowedExperimentPath(filePath: string): boolean {
  const normalized = normalizeGitPath(filePath);
  return (
    exactAllowedPaths.has(normalized) ||
    allowedPrefixes.some((prefix) => normalized.startsWith(prefix))
  );
}

export function disallowedExperimentPaths(filePaths: string[]): string[] {
  return filePaths
    .map(normalizeGitPath)
    .filter(Boolean)
    .filter((filePath) => !isAllowedExperimentPath(filePath));
}
