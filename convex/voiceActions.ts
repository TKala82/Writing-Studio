"use node";

import { generateText, Output } from "ai";
import { v } from "convex/values";
import { createHash, randomUUID } from "node:crypto";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalAction } from "./_generated/server";
import { assertAnalysisKey, pipelineModels } from "./lib/models";
import { voiceProfileSchema } from "./lib/pipelineSchemas";

interface VoiceSpec {
  tone: string;
  formality: string;
  perspective: string;
  sentenceStyle: string;
  distinctiveTraits: string[];
  preserve: string[];
}

async function learnVoice(
  text: string,
  currentSpec?: VoiceSpec,
): Promise<VoiceSpec> {
  assertAnalysisKey();
  const { output } = await generateText({
    model: pipelineModels.analysis,
    output: Output.object({ schema: voiceProfileSchema }),
    prompt: `Build or update a durable writing voice profile from an accepted sample.

CURRENT PROFILE
${currentSpec ? JSON.stringify(currentSpec, null, 2) : "No prior profile."}

TASK
- Describe observable prose traits only. Never infer demographics or personality.
- Preserve stable traits supported by both the current profile and sample.
- Update traits when the sample gives stronger evidence.
- Keep distinctiveTraits and preserve concrete enough to guide future rewriting.
- Do not encode topic, proper nouns, credentials, or facts as voice.

ACCEPTED WRITING SAMPLE
<sample>
${text.slice(0, 40_000)}
</sample>`,
  });
  if (!output) throw new Error("The voice model returned no profile");
  return output;
}

export const addSample = action({
  args: { text: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const text = args.text.trim();
    if (text.length < 100 || text.length > 40_000) {
      throw new Error("Voice samples must contain 100–40,000 characters");
    }
    const userId: Id<"users"> | null = await ctx.runQuery(
      internal.users.getByToken,
      { tokenIdentifier: identity.tokenIdentifier },
    );
    if (!userId) throw new Error("User not found");
    const current = await ctx.runQuery(internal.voiceProfiles.getForUser, {
      userId,
    });
    const spec = await learnVoice(text, current?.spec);
    await ctx.runMutation(internal.voiceProfiles.merge, {
      userId,
      spec,
      sampleCountIncrement: 1,
      baseVersion: current?.profileVersion ?? 0,
    });
    return null;
  },
});

export const learnFromDocument = internalAction({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const sample = await ctx.runQuery(
      internal.voiceProfiles.getDocumentSample,
      { documentId: args.documentId },
    );
    if (!sample) return null;
    const fingerprint = createHash("sha256")
      .update(sample.text)
      .digest("hex");
    const attemptToken = randomUUID();
    const claimId: Id<"voiceLearningClaims"> | null = await ctx.runMutation(
      internal.voiceProfiles.claimDocumentLearning,
      {
        userId: sample.userId,
        documentId: args.documentId,
        fingerprint,
        attemptToken,
      },
    );
    if (!claimId) return null;
    try {
      const spec = await learnVoice(sample.text, sample.currentSpec);
      await ctx.runMutation(internal.voiceProfiles.applyDocumentLearning, {
        claimId,
        attemptToken,
        spec,
        baseVersion: sample.profileVersion,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Voice learning failed";
      await ctx.runMutation(internal.voiceProfiles.finishDocumentLearning, {
        claimId,
        attemptToken,
        error: message.slice(0, 500),
      });
      throw error;
    }
    return null;
  },
});
