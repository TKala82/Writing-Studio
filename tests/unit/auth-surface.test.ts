import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const CONVEX_DIR = join(ROOT, "convex");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith("_") || entry.name === "node_modules") return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".ts") ? [full] : [];
  });
}

const exportPattern =
  /export const (\w+)\s*=\s*(query|mutation|action)\(/g;

describe("public Convex auth surface", () => {
  it("requires an auth check near every public export", () => {
    const missing: string[] = [];
    for (const file of walk(CONVEX_DIR)) {
      const source = readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      while ((match = exportPattern.exec(source)) !== null) {
        const [, name, kind] = match;
        const chunk = source.slice(match.index, match.index + 3500);
        const hasAuth =
          /getCurrentUser\s*\(/.test(chunk) ||
          /getUserIdentity\s*\(/.test(chunk) ||
          /tokenIdentifier/.test(chunk);
        if (!hasAuth) {
          const relative = file
            .replace(`${ROOT}\\`, "")
            .replace(`${ROOT}/`, "")
            .replaceAll("\\", "/");
          missing.push(`${relative}:${name} (${kind})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("scopes document reads and writes through getCurrentUser", () => {
    const source = readFileSync(join(ROOT, "convex/documents.ts"), "utf8");
    for (const name of [
      "listRecent",
      "create",
      "getRun",
      "markShipProgress",
      "saveAcceptedText",
    ]) {
      expect(source).toContain(`export const ${name}`);
    }
    expect(source.match(/getCurrentUser\(/g)?.length ?? 0).toBeGreaterThanOrEqual(
      5,
    );
  });
});
