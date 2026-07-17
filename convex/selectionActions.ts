"use node";

import { generateText, Output } from "ai";
import { v } from "convex/values";

import { compactLegalRegimesForPrompt, legalRegimeIds } from "../src/lib/legal";
import { action } from "./_generated/server";
import { legalLensSchema } from "./lib/pipelineSchemas";
import { assertAnalysisKey, pipelineModels } from "./lib/models";
import { buildLegalLensPrompt } from "./lib/prompts";

const regimeIdValidator = v.union(
  v.literal("popia"),
  v.literal("cpa"),
  v.literal("gift-cards"),
  v.literal("loyalty-rewards"),
  v.literal("crypto-stablecoins"),
  v.literal("king-governance"),
  v.literal("eu-ai-act"),
);

export type LegalLensResult = {
  applicable: Array<{
    regimeId: (typeof legalRegimeIds)[number];
    confidence: "high" | "medium" | "low";
    whyItApplies: string;
    relevantProvisions: string[];
    riskFlags: string[];
    suggestedRewording?: string;
  }>;
  notApplicable: Array<{
    regimeId: (typeof legalRegimeIds)[number];
    reason: string;
  }>;
  overallNote: string;
};

export const legalLens = action({
  args: {
    selection: v.string(),
    surroundingText: v.string(),
  },
  returns: v.object({
    applicable: v.array(
      v.object({
        regimeId: regimeIdValidator,
        confidence: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low"),
        ),
        whyItApplies: v.string(),
        relevantProvisions: v.array(v.string()),
        riskFlags: v.array(v.string()),
        suggestedRewording: v.optional(v.string()),
      }),
    ),
    notApplicable: v.array(
      v.object({
        regimeId: regimeIdValidator,
        reason: v.string(),
      }),
    ),
    overallNote: v.string(),
  }),
  handler: async (ctx, args): Promise<LegalLensResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const selection = args.selection.trim();
    if (selection.length < 12) {
      throw new Error("Highlight a sentence or paragraph for the legal lens");
    }
    if (selection.length > 12_000) {
      throw new Error("Selection is too long for the legal lens");
    }
    if (args.surroundingText.length > 40_000) {
      throw new Error("Surrounding text is limited to 40,000 characters");
    }

    assertAnalysisKey();
    const { output } = await generateText({
      model: pipelineModels.analysis,
      output: Output.object({ schema: legalLensSchema }),
      prompt: buildLegalLensPrompt({
        selection,
        surroundingText: args.surroundingText,
        regimesJson: compactLegalRegimesForPrompt(),
      }),
    });
    if (!output) throw new Error("The legal lens returned no result");
    return output;
  },
});
