import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { voiceSpecValidator } from "./lib/validators";

interface VoiceSpec {
  tone: string;
  formality: string;
  perspective: string;
  sentenceStyle: string;
  distinctiveTraits: string[];
  preserve: string[];
}

function mergeSpecs(
  existing: VoiceSpec,
  incoming: VoiceSpec,
  preserveExistingScalars: boolean,
): VoiceSpec {
  return {
    ...(preserveExistingScalars ? existing : incoming),
    distinctiveTraits: [
      ...new Set([
        ...existing.distinctiveTraits,
        ...incoming.distinctiveTraits,
      ]),
    ].slice(0, 12),
    preserve: [
      ...new Set([...existing.preserve, ...incoming.preserve]),
    ].slice(0, 12),
  };
}

export const getMine = query({
  args: {},
  returns: v.union(
    v.object({
      spec: voiceSpecValidator,
      sampleCount: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const profile = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .unique();
    if (!profile) return null;
    return {
      spec: profile.spec,
      sampleCount: profile.sampleCount,
      updatedAt: profile.updatedAt,
    };
  },
});

export const getForUser = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      spec: voiceSpecValidator,
      sampleCount: v.number(),
      updatedAt: v.number(),
      profileVersion: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", args.userId),
      )
      .unique();
    if (!profile) return null;
    return {
      spec: profile.spec,
      sampleCount: profile.sampleCount,
      updatedAt: profile.updatedAt,
      profileVersion: profile.version ?? 1,
    };
  },
});

export const getDocumentSample = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      text: v.string(),
      currentSpec: v.optional(voiceSpecValidator),
      profileVersion: v.number(),
      sampleCount: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document?.acceptedText) return null;
    const profile = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", document.userId),
      )
      .unique();
    return {
      userId: document.userId,
      text: document.acceptedText,
      currentSpec: profile?.spec,
      profileVersion: profile ? (profile.version ?? 1) : 0,
      sampleCount: profile?.sampleCount ?? 0,
    };
  },
});

export const merge = internalMutation({
  args: {
    userId: v.id("users"),
    spec: voiceSpecValidator,
    sampleCountIncrement: v.number(),
    baseVersion: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", args.userId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      const currentVersion = existing.version ?? 1;
      const spec = mergeSpecs(
        existing.spec,
        args.spec,
        currentVersion !== args.baseVersion,
      );
      await ctx.db.patch("voiceProfiles", existing._id, {
        spec,
        sampleCount: existing.sampleCount + args.sampleCountIncrement,
        version: currentVersion + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("voiceProfiles", {
        userId: args.userId,
        spec: args.spec,
        sampleCount: args.sampleCountIncrement,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

export const claimDocumentLearning = internalMutation({
  args: {
    userId: v.id("users"),
    documentId: v.id("documents"),
    fingerprint: v.string(),
    attemptToken: v.string(),
  },
  returns: v.union(v.id("voiceLearningClaims"), v.null()),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voiceLearningClaims")
      .withIndex("by_document_and_fingerprint", (queryBuilder) =>
        queryBuilder
          .eq("documentId", args.documentId)
          .eq("fingerprint", args.fingerprint),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      const stale =
        existing.status === "processing" &&
        now - existing.updatedAt > 15 * 60 * 1_000;
      if (
        existing.status === "complete" ||
        (existing.status === "processing" && !stale)
      ) {
        return null;
      }
      await ctx.db.patch("voiceLearningClaims", existing._id, {
        attemptToken: args.attemptToken,
        status: "processing",
        error: undefined,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert("voiceLearningClaims", {
      userId: args.userId,
      documentId: args.documentId,
      fingerprint: args.fingerprint,
      attemptToken: args.attemptToken,
      status: "processing",
      updatedAt: now,
    });
  },
});

export const applyDocumentLearning = internalMutation({
  args: {
    claimId: v.id("voiceLearningClaims"),
    attemptToken: v.string(),
    spec: voiceSpecValidator,
    baseVersion: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get("voiceLearningClaims", args.claimId);
    if (
      !claim ||
      claim.status !== "processing" ||
      claim.attemptToken !== args.attemptToken
    ) {
      return null;
    }
    const existing = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", claim.userId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      const currentVersion = existing.version ?? 1;
      await ctx.db.patch("voiceProfiles", existing._id, {
        spec: mergeSpecs(
          existing.spec,
          args.spec,
          currentVersion !== args.baseVersion,
        ),
        sampleCount: existing.sampleCount + 1,
        version: currentVersion + 1,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("voiceProfiles", {
        userId: claim.userId,
        spec: args.spec,
        sampleCount: 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch("voiceLearningClaims", claim._id, {
      status: "complete",
      error: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const finishDocumentLearning = internalMutation({
  args: {
    claimId: v.id("voiceLearningClaims"),
    attemptToken: v.string(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get("voiceLearningClaims", args.claimId);
    if (!claim || claim.attemptToken !== args.attemptToken) return null;
    await ctx.db.patch("voiceLearningClaims", claim._id, {
      status: args.error ? "error" : "complete",
      error: args.error,
      updatedAt: Date.now(),
    });
    return null;
  },
});
