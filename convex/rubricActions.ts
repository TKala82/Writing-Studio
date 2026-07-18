"use node";

import { generateText, Output } from "ai";
import { v } from "convex/values";
import { randomUUID } from "node:crypto";

import { internal } from "./_generated/api";
import type { GenreId } from "../src/lib/genres";
import type { Id } from "./_generated/dataModel";
import { action } from "./_generated/server";
import { assertAnalysisKey, pipelineModels } from "./lib/models";
import { customRubricSchema } from "./lib/pipelineSchemas";
import { genreValidator } from "./lib/validators";

export const deriveFromReferences = action({
  args: {
    name: v.string(),
    references: v.array(v.string()),
  },
  returns: v.object({
    rubricId: v.id("customRubrics"),
    baseGenre: genreValidator,
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ rubricId: Id<"customRubrics">; baseGenre: GenreId }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const name = args.name.trim();
    const references = args.references
      .map((reference) => reference.trim())
      .filter(Boolean);
    if (name.length < 3 || name.length > 80) {
      throw new Error("Give the custom form a 3–80 character name");
    }
    if (references.length < 2 || references.length > 3) {
      throw new Error("Provide two or three reference examples");
    }
    if (
      references.some(
        (reference) => reference.length < 100 || reference.length > 20_000,
      )
    ) {
      throw new Error("Each reference must contain 100–20,000 characters");
    }

    const leaseToken = randomUUID();
    try {
      await ctx.runMutation(internal.aiUsage.reserve, {
        tokenIdentifier: identity.tokenIdentifier,
        operation: "derive-rubric",
        token: leaseToken,
      });
      assertAnalysisKey();
      const { output } = await generateText({
        model: pipelineModels.analysis,
        output: Output.object({ schema: customRubricSchema }),
        prompt: `Derive a reusable professional-writing rubric from reference examples the writer admires.

REQUESTED FORM NAME
${name}

TASK
- Infer standards shared across the examples, not topic-specific content.
- Pick the closest built-in baseGenre for deterministic checks and UI.
- Write a precise systemPrompt that preserves facts and voice.
- Include 4–10 criteria. Judgment criteria should dominate; measurable criteria may use only the allowed checks.
- Infer a realistic word-count and readability range.
- Preferred and discouraged patterns must be observable editorial patterns.
- Do not copy distinctive phrases from the references or encode proper nouns as standards.

REFERENCES
${references
  .map(
    (reference, index) => `<reference-${index + 1}>
${reference}
</reference-${index + 1}>`,
  )
  .join("\n\n")}`,
      });
      if (!output) throw new Error("The rubric model returned no result");
      if (output.length.maxWords <= output.length.minWords) {
        throw new Error("The derived word-count range was invalid");
      }
      if (output.length.targetGradeMax < output.length.targetGradeMin) {
        throw new Error("The derived readability-grade range was invalid");
      }
      const rubricId = await ctx.runMutation(internal.customRubrics.saveDerived, {
        tokenIdentifier: identity.tokenIdentifier,
        ...output,
        name,
        referenceCount: references.length,
      });
      return { rubricId, baseGenre: output.baseGenre };
    } finally {
      await ctx
        .runMutation(internal.aiUsage.release, { token: leaseToken })
        .catch(() => null);
    }
  },
});
