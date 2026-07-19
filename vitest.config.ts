import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    server: {
      deps: {
        inline: ["convex-test"],
      },
    },
    reporters: ["default", "json"],
    outputFile: {
      json: "artifacts/launch-audit/unit-results.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
