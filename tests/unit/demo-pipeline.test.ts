import { afterEach, describe, expect, it } from "vitest";

import {
  assertDemoModeAllowed,
  demoDetectGenre,
  demoDistillPlaybook,
  demoIdeationInterview,
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

  it("returns a usable blank-page interview fixture", () => {
    const interview = demoIdeationInterview("Social media post");
    expect(interview.questions.length).toBeGreaterThanOrEqual(4);
    expect(interview.directions.length).toBeGreaterThanOrEqual(2);
  });

  it("suggests fellowship format from motivation cues", () => {
    const result = demoDetectGenre(
      "I am applying to this fellowship because I want to contribute to AI safety research and learn from mentors in the programme.",
    );
    expect(result.genre).toBe("motivation-statement");
    expect(result.reason).toMatch(/Demo classifier/);
  });

  it("distills explicit email advice into a genre-aware preview", () => {
    const result = demoDistillPlaybook(`Subject: Better outreach emails

- Open a cold email with the reason the recipient is uniquely relevant.
- Keep the request small enough to answer in one reply.
- Avoid generic praise that could be sent to anyone.
- Never bury the concrete ask in the final paragraph.`);

    expect(result.title).toBe("Better outreach emails");
    expect(result.genres).toContain("outreach-email");
    expect(result.appliesToAll).toBe(false);
    expect(result.tips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "do" }),
        expect.objectContaining({ kind: "avoid" }),
      ]),
    );
  });
});
