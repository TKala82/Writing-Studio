import { describe, expect, test } from "vitest";

import { classifyPipelineError } from "../../convex/lib/pipelineErrors";

describe("pipeline error classification", () => {
  test("maps nested 429 and depleted-credit failures to provider quota", () => {
    const error = new Error("AI_RetryError");
    error.cause = {
      statusCode: 429,
      lastError: new Error("Prepayment credits are depleted"),
    };

    expect(classifyPipelineError(error)).toEqual({
      code: "provider-quota",
      message:
        "The AI provider has reached its quota or spending limit. Your draft is safe; try again after the provider budget is restored.",
    });
  });

  test("maps credential and temporary provider failures", () => {
    expect(classifyPipelineError(new Error("401 invalid API key")).code).toBe(
      "provider-auth",
    );
    expect(classifyPipelineError(new Error("503 provider overloaded")).code).toBe(
      "provider-unavailable",
    );
  });

  test("does not mislabel internal rate-limit or billing errors as providers", () => {
    expect(
      classifyPipelineError(new Error("Convex internal rate limit exceeded"))
        .code,
    ).toBe("unknown");
    expect(
      classifyPipelineError(new Error("Internal billing record mutation failed"))
        .code,
    ).toBe("unknown");
  });

  test("does not expose unknown internal exception text", () => {
    const result = classifyPipelineError(new Error("x".repeat(1_200)));
    expect(result.code).toBe("unknown");
    expect(result.message).not.toContain("xxx");
    expect(result.message).toMatch(/draft is safe/i);
  });
});
