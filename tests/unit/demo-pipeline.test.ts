import { afterEach, describe, expect, it } from "vitest";

import { isDemoPipelineEnabled } from "../../convex/lib/demoPipeline";

describe("isDemoPipelineEnabled", () => {
  afterEach(() => {
    delete process.env.PIPELINE_DEMO_MODE;
  });

  it("is off by default", () => {
    delete process.env.PIPELINE_DEMO_MODE;
    expect(isDemoPipelineEnabled()).toBe(false);
  });

  it("accepts common truthy strings", () => {
    for (const value of ["1", "true", "TRUE", "yes", "Yes"]) {
      process.env.PIPELINE_DEMO_MODE = value;
      expect(isDemoPipelineEnabled()).toBe(true);
    }
  });

  it("rejects other values", () => {
    for (const value of ["0", "false", "no", "demo"]) {
      process.env.PIPELINE_DEMO_MODE = value;
      expect(isDemoPipelineEnabled()).toBe(false);
    }
  });
});
