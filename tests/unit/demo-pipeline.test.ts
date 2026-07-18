import { afterEach, describe, expect, it } from "vitest";

import {
  assertDemoModeAllowed,
  isDemoPipelineEnabled,
  isProductionLikeDeployment,
} from "../../convex/lib/demoPipeline";

describe("demo pipeline guards", () => {
  afterEach(() => {
    delete process.env.PIPELINE_DEMO_MODE;
    delete process.env.ALLOW_PIPELINE_DEMO_MODE;
    delete process.env.CONVEX_DEPLOYMENT;
    delete process.env.VERCEL_ENV;
    delete process.env.LEDE_FORCE_PRODUCTION_GUARDS;
  });

  it("is off by default", () => {
    expect(isDemoPipelineEnabled({})).toBe(false);
  });

  it("requires an explicit allow flag outside production", () => {
    expect(() =>
      isDemoPipelineEnabled({ PIPELINE_DEMO_MODE: "1" }),
    ).toThrow(/ALLOW_PIPELINE_DEMO_MODE=1/);
  });

  it("enables only when both demo and allow flags are set", () => {
    expect(
      isDemoPipelineEnabled({
        PIPELINE_DEMO_MODE: "1",
        ALLOW_PIPELINE_DEMO_MODE: "true",
      }),
    ).toBe(true);
  });

  it("rejects demo mode on production Convex deployments", () => {
    expect(() =>
      assertDemoModeAllowed({
        PIPELINE_DEMO_MODE: "1",
        ALLOW_PIPELINE_DEMO_MODE: "1",
        CONVEX_DEPLOYMENT: "prod:happy-animal-123",
      }),
    ).toThrow(/cannot be enabled in production/);
  });

  it("detects production-like deployments", () => {
    expect(
      isProductionLikeDeployment({ CONVEX_DEPLOYMENT: "prod:x" }),
    ).toBe(true);
    expect(
      isProductionLikeDeployment({ VERCEL_ENV: "production" }),
    ).toBe(true);
    expect(
      isProductionLikeDeployment({ CONVEX_DEPLOYMENT: "anonymous:local" }),
    ).toBe(false);
  });

  it("rejects non-truthy demo values", () => {
    for (const value of ["0", "false", "no", "demo"]) {
      expect(
        isDemoPipelineEnabled({
          PIPELINE_DEMO_MODE: value,
          ALLOW_PIPELINE_DEMO_MODE: "1",
        }),
      ).toBe(false);
    }
  });
});
