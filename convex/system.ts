import { v } from "convex/values";

import { query } from "./_generated/server";
import { isDemoPipelineEnabled } from "./lib/demoPipeline";
import { configuredProviders } from "./lib/providerStatus";

/**
 * Lets the studio tell the writer whether generation is live or running on
 * demo fixtures, without exposing any key material.
 */
export const generationStatus = query({
  args: {},
  returns: v.object({
    mode: v.union(v.literal("live"), v.literal("demo"), v.literal("unconfigured")),
    providers: v.array(
      v.union(v.literal("google"), v.literal("anthropic"), v.literal("openai")),
    ),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Sign in to check generation status");
    const providers = configuredProviders();
    const demo = (() => {
      try {
        return isDemoPipelineEnabled();
      } catch {
        // Misconfigured demo flags fail closed to live/unconfigured.
        return false;
      }
    })();
    const mode: "live" | "demo" | "unconfigured" = demo
      ? "demo"
      : providers.length > 0
        ? "live"
        : "unconfigured";
    return { mode, providers };
  },
});
