import { v } from "convex/values";

import {
  applyHunkDecisions,
  createSemanticDiff,
  type HunkDecision,
} from "../src/lib/diff/semantic-diff";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  blindSpotValidator,
  changeValidator,
  critiqueValidator,
  customCriterionValidator,
  deterministicFindingValidator,
  factValidator,
  genreValidator,
  metricsValidator,
  pipelineStageValidator,
  pipelineStepValidator,
  runStatusValidator,
  rubricLengthValidator,
  shipProgressValidator,
  voiceSpecValidator,
} from "./lib/validators";

const customRubricViewValidator = v.object({
  name: v.string(),
  description: v.string(),
  baseGenre: genreValidator,
  accent: v.string(),
  systemPrompt: v.string(),
  length: rubricLengthValidator,
  criteria: v.array(customCriterionValidator),
  preferredPatterns: v.array(v.string()),
  discouragedPatterns: v.array(v.string()),
});

const editorialDecisionInputValidator = v.object({
  hunkId: v.string(),
  decision: v.union(v.literal("accepted"), v.literal("rejected")),
  criterionIds: v.array(v.string()),
});

const INITIAL_STEPS = [
  { id: "analyze", label: "Understanding your draft", status: "pending" },
  { id: "propose", label: "Planning precise changes", status: "pending" },
  { id: "rewrite", label: "Rewriting with your rubric", status: "pending" },
  { id: "critique", label: "Running the quality review", status: "pending" },
  { id: "revise", label: "Applying the final polish", status: "pending" },
] satisfies Doc<"runs">["steps"];

const runViewValidator = v.object({
  _id: v.id("runs"),
  documentId: v.id("documents"),
  title: v.string(),
  genre: genreValidator,
  customPurpose: v.optional(v.string()),
  customRubricId: v.optional(v.id("customRubrics")),
  customRubric: v.optional(customRubricViewValidator),
  writerContext: v.optional(v.string()),
  sourceIds: v.optional(v.array(v.id("sources"))),
  draft: v.string(),
  status: runStatusValidator,
  stage: pipelineStageValidator,
  steps: v.array(pipelineStepValidator),
  factInventory: v.optional(v.array(factValidator)),
  voiceSpec: v.optional(voiceSpecValidator),
  blindSpots: v.optional(v.array(blindSpotValidator)),
  proposedChanges: v.optional(v.array(changeValidator)),
  streamingText: v.optional(v.string()),
  rewrittenText: v.optional(v.string()),
  finalText: v.optional(v.string()),
  changeLog: v.optional(v.array(changeValidator)),
  metrics: v.optional(metricsValidator),
  deterministicFindings: v.optional(v.array(deterministicFindingValidator)),
  bannedPhrases: v.optional(v.array(v.string())),
  critique: v.optional(v.array(critiqueValidator)),
  error: v.optional(v.string()),
  shipProgress: v.optional(shipProgressValidator),
  updatedAt: v.number(),
});

function makeTitle(draft: string): string {
  const firstLine = draft
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return "Untitled draft";
  return firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
}

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      documentId: v.id("documents"),
      runId: v.optional(v.id("runs")),
      title: v.string(),
      genre: genreValidator,
      status: v.string(),
      preview: v.string(),
      wordCount: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 12), 1), 30);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(limit);

    return await Promise.all(
      documents.map(async (document) => {
        const latestRun = await ctx.db
          .query("runs")
          .withIndex("by_document_and_created", (queryBuilder) =>
            queryBuilder.eq("documentId", document._id),
          )
          .order("desc")
          .first();
        const displayText =
          document.acceptedText ?? latestRun?.finalText ?? document.draft;
        return {
          documentId: document._id,
          runId: latestRun?._id,
          title: document.title,
          genre: document.genre,
          status: latestRun?.status ?? document.status,
          preview: displayText.replace(/\s+/g, " ").trim().slice(0, 180),
          wordCount: displayText.trim()
            ? displayText.trim().split(/\s+/).length
            : 0,
          updatedAt: document.updatedAt,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    draft: v.string(),
    genre: genreValidator,
    customPurpose: v.optional(v.string()),
    customRubricId: v.optional(v.id("customRubrics")),
    writerContext: v.optional(v.string()),
    blindSpots: v.optional(v.array(blindSpotValidator)),
  },
  returns: v.object({
    documentId: v.id("documents"),
    runId: v.id("runs"),
  }),
  handler: async (ctx, args) => {
    if (args.draft.trim().length < 50) {
      throw new Error("Add at least 50 characters so the editor has enough context");
    }
    if (args.draft.length > 40_000) {
      throw new Error("Drafts are limited to 40,000 characters");
    }
    const customPurpose = args.customPurpose?.trim();
    if ((customPurpose?.length ?? 0) > 500) {
      throw new Error("Custom purposes are limited to 500 characters");
    }
    const writerContext = args.writerContext?.trim();
    if ((writerContext?.length ?? 0) > 8_000) {
      throw new Error("Writer context is limited to 8,000 characters");
    }
    if ((args.blindSpots?.length ?? 0) > 6) {
      throw new Error("At most six blind spots may be attached to a run");
    }
    if (
      args.blindSpots?.some(
        (blindSpot) =>
          blindSpot.id.length > 100 ||
          blindSpot.label.length > 500 ||
          blindSpot.whyItMatters.length > 2_000 ||
          (blindSpot.criterionId?.length ?? 0) > 100,
      )
    ) {
      throw new Error("A blind-spot field is too long");
    }

    const user = await getCurrentUser(ctx);
    if (args.customRubricId) {
      const customRubric = await ctx.db.get("customRubrics", args.customRubricId);
      if (!customRubric || customRubric.userId !== user._id) {
        throw new Error("Custom rubric not found or access denied");
      }
      if (customRubric.baseGenre !== args.genre) {
        throw new Error("The custom rubric does not match the selected base form");
      }
    }
    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      userId: user._id,
      title: makeTitle(args.draft),
      draft: args.draft.trim(),
      genre: args.genre,
      customPurpose: customPurpose || undefined,
      customRubricId: args.customRubricId,
      writerContext: writerContext || undefined,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
    const runId = await ctx.db.insert("runs", {
      documentId,
      userId: user._id,
      status: "queued",
      stage: "queued",
      steps: INITIAL_STEPS,
      blindSpots: args.blindSpots?.slice(0, 6),
      createdAt: now,
      updatedAt: now,
    });
    return { documentId, runId };
  },
});

export const rename = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.userId !== user._id) {
      throw new Error("Document not found or access denied");
    }
    const title = args.title.trim();
    if (title.length < 1 || title.length > 120) {
      throw new Error("Titles must contain 1–120 characters");
    }
    await ctx.db.patch("documents", document._id, {
      title,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getEditableText = query({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      draft: v.string(),
      acceptedText: v.optional(v.string()),
      genre: genreValidator,
      customPurpose: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) return null;
    if (document.userId !== user._id) {
      throw new Error("Unauthorized: this draft belongs to another user");
    }
    return {
      draft: document.draft,
      acceptedText: document.acceptedText,
      genre: document.genre,
      customPurpose: document.customPurpose,
    };
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) return null;
    if (document.userId !== user._id) {
      throw new Error("Unauthorized: this draft belongs to another user");
    }

    const runs = await ctx.db
      .query("runs")
      .withIndex("by_document_and_created", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const run of runs) {
      await ctx.db.delete("runs", run._id);
    }

    const libraryEntries = await ctx.db
      .query("libraryEntries")
      .withIndex("by_document", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const entry of libraryEntries) {
      await ctx.db.delete("libraryEntries", entry._id);
    }

    const briefings = await ctx.db
      .query("deliveryBriefings")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const briefing of briefings) {
      await ctx.db.delete("deliveryBriefings", briefing._id);
    }

    const briefingClaims = await ctx.db
      .query("deliveryBriefingClaims")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const claim of briefingClaims) {
      await ctx.db.delete("deliveryBriefingClaims", claim._id);
    }

    const practiceSessions = await ctx.db
      .query("practiceSessions")
      .withIndex("by_document_and_updated", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const session of practiceSessions) {
      await ctx.db.delete("practiceSessions", session._id);
    }

    const voiceClaims = await ctx.db
      .query("voiceLearningClaims")
      .withIndex("by_document_and_fingerprint", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const claim of voiceClaims) {
      await ctx.db.delete("voiceLearningClaims", claim._id);
    }

    const editorialDecisions = await ctx.db
      .query("editorialDecisions")
      .withIndex("by_document", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .collect();
    for (const decision of editorialDecisions) {
      await ctx.db.delete("editorialDecisions", decision._id);
    }

    await ctx.db.delete("documents", document._id);
    return null;
  },
});

export const getRun = query({
  args: { runId: v.id("runs") },
  returns: v.union(runViewValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const run = await ctx.db.get("runs", args.runId);
    if (!run) return null;
    if (run.userId !== user._id) {
      throw new Error("Unauthorized: this draft belongs to another user");
    }
    const document = await ctx.db.get("documents", run.documentId);
    if (!document) return null;
    const customRubric = document.customRubricId
      ? await ctx.db.get("customRubrics", document.customRubricId)
      : null;

    return {
      _id: run._id,
      documentId: run.documentId,
      title: document.title,
      genre: document.genre,
      customPurpose: document.customPurpose,
      customRubricId: document.customRubricId,
      customRubric:
        customRubric && customRubric.userId === user._id
          ? {
              name: customRubric.name,
              description: customRubric.description,
              baseGenre: customRubric.baseGenre,
              accent: customRubric.accent,
              systemPrompt: customRubric.systemPrompt,
              length: customRubric.length,
              criteria: customRubric.criteria,
              preferredPatterns: customRubric.preferredPatterns,
              discouragedPatterns: customRubric.discouragedPatterns,
            }
          : undefined,
      writerContext: document.writerContext,
      sourceIds: document.sourceIds,
      draft: document.draft,
      status: run.status,
      stage: run.stage,
      steps: run.steps,
      factInventory: run.factInventory,
      voiceSpec: run.voiceSpec,
      blindSpots: run.blindSpots,
      proposedChanges: run.proposedChanges,
      streamingText: run.streamingText,
      rewrittenText: run.rewrittenText,
      finalText: document.acceptedText ?? run.finalText,
      changeLog: run.changeLog,
      metrics: run.metrics,
      deterministicFindings: run.deterministicFindings,
      bannedPhrases: run.bannedPhrases,
      critique: run.critique,
      error: run.error,
      shipProgress: run.shipProgress,
      updatedAt: run.updatedAt,
    };
  },
});

export const markShipProgress = mutation({
  args: {
    runId: v.id("runs"),
    readinessChecked: v.optional(v.boolean()),
    deliveryOpened: v.optional(v.boolean()),
    deliveryBriefingId: v.optional(v.id("deliveryBriefings")),
    practiceCompleted: v.optional(v.boolean()),
    saved: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const run = await ctx.db.get("runs", args.runId);
    if (!run || run.userId !== user._id) {
      throw new Error("Run not found or access denied");
    }
    const now = Date.now();
    const next = { ...(run.shipProgress ?? {}) };
    if (args.readinessChecked && !next.readinessCheckedAt) {
      next.readinessCheckedAt = now;
    }
    if (args.deliveryOpened && !next.deliveryOpenedAt) {
      next.deliveryOpenedAt = now;
    }
    if (args.deliveryBriefingId) {
      next.deliveryBriefingId = args.deliveryBriefingId;
      if (!next.deliveryOpenedAt) next.deliveryOpenedAt = now;
    }
    if (args.practiceCompleted && !next.practiceCompletedAt) {
      next.practiceCompletedAt = now;
    }
    if (args.saved && !next.savedAt) {
      next.savedAt = now;
    }
    await ctx.db.patch("runs", run._id, {
      shipProgress: next,
      updatedAt: now,
    });
    return null;
  },
});

export const saveAcceptedText = mutation({
  args: {
    documentId: v.id("documents"),
    runId: v.id("runs"),
    acceptedText: v.string(),
    revisionText: v.string(),
    decisions: v.array(editorialDecisionInputValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }
    if (document.userId !== user._id) {
      throw new Error("Unauthorized: this draft belongs to another user");
    }
    const run = await ctx.db.get("runs", args.runId);
    if (
      !run ||
      run.documentId !== document._id ||
      run.userId !== user._id
    ) {
      throw new Error("Run not found or access denied");
    }
    if (
      args.acceptedText.length > 40_000 ||
      args.revisionText.length > 40_000
    ) {
      throw new Error("Saved drafts are limited to 40,000 characters");
    }
    if (args.decisions.length > 80) {
      throw new Error("Record at most 80 editorial decisions at once");
    }
    const hunks = createSemanticDiff(document.draft, args.revisionText);
    const hunksById = new Map(hunks.map((hunk) => [hunk.id, hunk]));
    const validCriterionIds = new Set(
      (run.critique ?? []).map((item) => item.criterionId),
    );
    const decisionMap: Record<string, HunkDecision> = {};
    for (const decision of args.decisions) {
      if (decisionMap[decision.hunkId]) {
        throw new Error("A change decision was submitted more than once");
      }
      const hunk = hunksById.get(decision.hunkId);
      if (!hunk?.changed) {
        throw new Error("An editorial decision does not match this revision");
      }
      const criterionIds = [...new Set(decision.criterionIds)];
      if (
        criterionIds.length > 20 ||
        criterionIds.some((criterionId) => !validCriterionIds.has(criterionId))
      ) {
        throw new Error("An editorial decision contains an invalid criterion");
      }
      decisionMap[decision.hunkId] = decision.decision;
    }
    if (applyHunkDecisions(hunks, decisionMap) !== args.acceptedText) {
      throw new Error("The accepted text does not match the submitted decisions");
    }
    const existingDecisions = await ctx.db
      .query("editorialDecisions")
      .withIndex("by_user_genre_created", (queryBuilder) =>
        queryBuilder.eq("userId", user._id).eq("genre", document.genre),
      )
      .order("desc")
      .take(200);
    const now = Date.now();
    await ctx.db.patch("documents", document._id, {
      acceptedText: args.acceptedText,
      updatedAt: now,
    });
    await ctx.db.patch("runs", run._id, {
      shipProgress: {
        ...(run.shipProgress ?? {}),
        savedAt: now,
      },
      updatedAt: now,
    });
    for (const decision of args.decisions) {
      const hunk = hunksById.get(decision.hunkId);
      if (!hunk) continue;
      const originalText = hunk.originalText.trim().slice(0, 4_000);
      const revisedText = hunk.revisedText.trim().slice(0, 4_000);
      if (
        existingDecisions.some(
          (existing) =>
            existing.runId === run._id &&
            existing.decision === decision.decision &&
            existing.originalText === originalText &&
            existing.revisedText === revisedText,
        )
      ) {
        continue;
      }
      await ctx.db.insert("editorialDecisions", {
        userId: user._id,
        documentId: document._id,
        runId: run._id,
        genre: document.genre,
        decision: decision.decision,
        originalText,
        revisedText,
        criterionIds: [...new Set(decision.criterionIds)],
        createdAt: now,
      });
    }
    await ctx.scheduler.runAfter(0, internal.voiceActions.learnFromDocument, {
      documentId: document._id,
    });
    await ctx.scheduler.runAfter(0, internal.libraryActions.indexDocument, {
      documentId: document._id,
    });
    return null;
  },
});

export const getContext = internalQuery({
  args: {
    runId: v.id("runs"),
    tokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      runId: v.id("runs"),
      documentId: v.id("documents"),
      draft: v.string(),
      genre: genreValidator,
      customPurpose: v.optional(v.string()),
      customRubric: v.optional(customRubricViewValidator),
      writerContext: v.optional(v.string()),
      sourceIds: v.optional(v.array(v.id("sources"))),
      factInventory: v.optional(v.array(factValidator)),
      voiceSpec: v.optional(voiceSpecValidator),
      voiceProfile: v.optional(voiceSpecValidator),
      finalText: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const run = await ctx.db.get("runs", args.runId);
    if (!run) return null;
    const user = await ctx.db.get("users", run.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return null;
    const document = await ctx.db.get("documents", run.documentId);
    if (!document) return null;
    const voiceProfile = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", run.userId),
      )
      .unique();
    const customRubric = document.customRubricId
      ? await ctx.db.get("customRubrics", document.customRubricId)
      : null;
    return {
      runId: run._id,
      documentId: document._id,
      draft: document.draft,
      genre: document.genre,
      customPurpose: document.customPurpose,
      customRubric:
        customRubric && customRubric.userId === run.userId
          ? {
              name: customRubric.name,
              description: customRubric.description,
              baseGenre: customRubric.baseGenre,
              accent: customRubric.accent,
              systemPrompt: customRubric.systemPrompt,
              length: customRubric.length,
              criteria: customRubric.criteria,
              preferredPatterns: customRubric.preferredPatterns,
              discouragedPatterns: customRubric.discouragedPatterns,
            }
          : undefined,
      writerContext: document.writerContext,
      sourceIds: document.sourceIds,
      factInventory: run.factInventory,
      voiceSpec: run.voiceSpec,
      voiceProfile: voiceProfile?.spec,
      finalText: run.finalText,
    };
  },
});

export const createGrounded = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    title: v.string(),
    draft: v.string(),
    genre: genreValidator,
    customPurpose: v.string(),
    sourceIds: v.array(v.id("sources")),
    factInventory: v.array(factValidator),
    ideationClaim: v.optional(
      v.object({
        interviewId: v.id("ideationInterviews"),
        claimToken: v.string(),
      }),
    ),
  },
  returns: v.object({
    documentId: v.id("documents"),
    runId: v.id("runs"),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    if (args.draft.trim().length < 50 || args.draft.length > 40_000) {
      throw new Error("Generated draft length is outside the supported range");
    }
    if (args.customPurpose.trim().length > 500) {
      throw new Error("Generated purposes are limited to 500 characters");
    }
    if (args.sourceIds.length > 8) {
      throw new Error("Choose no more than eight sources");
    }
    if (
      args.factInventory.length === 0 ||
      args.factInventory.length > 80 ||
      new Set(args.factInventory.map((fact) => fact.id)).size !==
        args.factInventory.length ||
      args.factInventory.some(
        (fact) =>
          !fact.id.trim() ||
          fact.id.length > 200 ||
          !fact.claim.trim() ||
          fact.claim.length > 2_000 ||
          !fact.sourceText.trim() ||
          fact.sourceText.length > 2_000,
      )
    ) {
      throw new Error("The generated fact inventory is invalid");
    }
    if (
      args.sourceIds.length === 0 &&
      args.factInventory.some(
        (fact) => fact.sourceId !== undefined || fact.sourceTitle !== undefined,
      )
    ) {
      throw new Error("Interview facts cannot claim external-source provenance");
    }

    for (const sourceId of args.sourceIds) {
      const source = await ctx.db.get("sources", sourceId);
      if (
        !source ||
        source.userId !== user._id ||
        source.archivedAt !== undefined ||
        source.status !== "ready"
      ) {
        throw new Error("A selected source is unavailable or not ready");
      }
    }
    if (args.ideationClaim) {
      const interview = await ctx.db.get(
        "ideationInterviews",
        args.ideationClaim.interviewId,
      );
      if (
        !interview ||
        interview.userId !== user._id ||
        interview.status !== "composing" ||
        interview.claimToken !== args.ideationClaim.claimToken ||
        interview.genre !== args.genre ||
        args.sourceIds.length !== 0
      ) {
        throw new Error("The ideation composition claim expired");
      }
    }

    const now = Date.now();
    const documentId = await ctx.db.insert("documents", {
      userId: user._id,
      title: args.title.trim().slice(0, 120),
      draft: args.draft.trim(),
      genre: args.genre,
      customPurpose: args.customPurpose.trim(),
      sourceIds: args.sourceIds,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
    const runId = await ctx.db.insert("runs", {
      documentId,
      userId: user._id,
      status: "queued",
      stage: "queued",
      steps: INITIAL_STEPS,
      factInventory: args.factInventory,
      createdAt: now,
      updatedAt: now,
    });
    if (args.ideationClaim) {
      await ctx.db.patch(
        "ideationInterviews",
        args.ideationClaim.interviewId,
        {
          status: "complete",
          documentId,
          runId,
          claimToken: undefined,
          claimStartedAt: undefined,
          error: undefined,
          updatedAt: now,
        },
      );
    }
    return { documentId, runId };
  },
});

export const claimRun = internalMutation({
  args: {
    runId: v.id("runs"),
    claimToken: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get("runs", args.runId);
    if (!run || run.status === "complete") return false;
    const now = Date.now();
    const staleProcessing =
      run.status === "processing" && now - run.updatedAt > 15 * 60 * 1_000;
    if (run.status === "processing" && !staleProcessing) return false;
    await ctx.db.patch("runs", run._id, {
      status: "processing",
      claimToken: args.claimToken,
      error: undefined,
      updatedAt: now,
    });
    await ctx.db.patch("documents", run.documentId, {
      status: "processing",
      updatedAt: now,
    });
    return true;
  },
});

export const updateStreamingText = internalMutation({
  args: {
    runId: v.id("runs"),
    claimToken: v.string(),
    streamingText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get("runs", args.runId);
    if (
      !run ||
      run.status !== "processing" ||
      run.claimToken !== args.claimToken
    ) {
      return null;
    }
    if (args.streamingText.length > 40_000) {
      throw new Error("Streamed rewrites are limited to 40,000 characters");
    }
    await ctx.db.patch("runs", run._id, {
      streamingText: args.streamingText,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const updateRun = internalMutation({
  args: {
    runId: v.id("runs"),
    claimToken: v.string(),
    status: runStatusValidator,
    stage: pipelineStageValidator,
    steps: v.array(pipelineStepValidator),
    factInventory: v.optional(v.array(factValidator)),
    voiceSpec: v.optional(voiceSpecValidator),
    proposedChanges: v.optional(v.array(changeValidator)),
    streamingText: v.optional(v.string()),
    rewrittenText: v.optional(v.string()),
    finalText: v.optional(v.string()),
    changeLog: v.optional(v.array(changeValidator)),
    metrics: v.optional(metricsValidator),
    deterministicFindings: v.optional(
      v.array(deterministicFindingValidator),
    ),
    bannedPhrases: v.optional(v.array(v.string())),
    critique: v.optional(v.array(critiqueValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, claimToken, ...updates } = args;
    const run = await ctx.db.get("runs", runId);
    if (!run) throw new Error("Run not found");
    if (run.claimToken !== claimToken) return null;
    if (
      (updates.streamingText?.length ?? 0) > 40_000 ||
      (updates.rewrittenText?.length ?? 0) > 40_000 ||
      (updates.finalText?.length ?? 0) > 40_000
    ) {
      throw new Error("Pipeline text exceeded the 40,000-character limit");
    }
    await ctx.db.patch("runs", runId, {
      ...updates,
      updatedAt: Date.now(),
    });
    await ctx.db.patch("documents", run.documentId, {
      status: updates.status === "complete" ? "complete" : "processing",
      updatedAt: Date.now(),
    });
    if (updates.status === "complete") {
      await ctx.scheduler.runAfter(
        0,
        internal.libraryActions.indexDocument,
        { documentId: run.documentId },
      );
    }
    return null;
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("runs"),
    claimToken: v.string(),
    steps: v.array(pipelineStepValidator),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get("runs", args.runId);
    if (!run || run.claimToken !== args.claimToken) return null;
    const steps = args.steps.slice(0, 10).map((step) => ({
      ...step,
      id: step.id.slice(0, 100),
      label: step.label.slice(0, 300),
      insight: step.insight?.slice(0, 1_000),
    }));
    await ctx.db.patch("runs", args.runId, {
      status: "error",
      stage: "error",
      steps,
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    await ctx.db.patch("documents", run.documentId, {
      status: "error",
      updatedAt: Date.now(),
    });
    return null;
  },
});
