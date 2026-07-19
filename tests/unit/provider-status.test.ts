import { describe, expect, it } from "vitest";

import {
  configuredProviders,
  hasAnyProviderKey,
} from "../../convex/lib/providerStatus";

describe("provider status", () => {
  it("reports no providers when no keys are set", () => {
    expect(configuredProviders({})).toEqual([]);
    expect(hasAnyProviderKey({})).toBe(false);
  });

  it("ignores blank or whitespace-only keys", () => {
    expect(
      configuredProviders({
        GOOGLE_GENERATIVE_AI_API_KEY: "   ",
        ANTHROPIC_API_KEY: "",
      }),
    ).toEqual([]);
  });

  it("detects a single configured provider", () => {
    expect(
      configuredProviders({ GOOGLE_GENERATIVE_AI_API_KEY: "key" }),
    ).toEqual(["google"]);
    expect(configuredProviders({ ANTHROPIC_API_KEY: "key" })).toEqual([
      "anthropic",
    ]);
    expect(configuredProviders({ OPENAI_API_KEY: "key" })).toEqual(["openai"]);
  });

  it("detects all configured providers", () => {
    expect(
      configuredProviders({
        GOOGLE_GENERATIVE_AI_API_KEY: "a",
        ANTHROPIC_API_KEY: "b",
        OPENAI_API_KEY: "c",
      }),
    ).toEqual(["google", "anthropic", "openai"]);
  });
});
