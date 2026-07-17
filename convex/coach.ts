import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./lib/auth";
import {
  deliveryBriefingValidator,
  deliveryFormatValidator,
  factValidator,
  genreValidator,
} from "./lib/validators";

async function currentRevision(
  ctx: QueryCtx | MutationCtx,
  documentId: Id<"documents">,
): Promise<number | null> {
  const document = await ctx.db.get("documents", documentId);
  if (!document) return null;
  const [run] = await ctx.db
    .query("runs")
    .withIndex("by_document_and_created", (queryBuilder) =>
      queryBuilder.eq("documentId", document._id),
    )
    .order("desc")
    .take(1);
  return Math.max(document.updatedAt, run?.updatedAt ?? 0);
}

export const getDocumentContext = internalQuery({
  args: {
    documentId: v.id("documents"),
    tokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      title: v.string(),
      genre: genreValidator,
      text: v.string(),
      facts: v.array(factValidator),
      revision: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) return null;
    const user = await ctx.db.get("users", document.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return null;
    const [run] = await ctx.db
      .query("runs")
      .withIndex("by_document_and_created", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .order("desc")
      .take(1);
    return {
      title: document.title,
      genre: document.genre,
      text:
        document.acceptedText ??
        run?.finalText ??
        run?.rewrittenText ??
        document.draft,
      facts: run?.factInventory ?? [],
      revision: Math.max(document.updatedAt, run?.updatedAt ?? 0),
    };
  },
});

export const claimBriefing = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    documentId: v.id("documents"),
    format: deliveryFormatValidator,
    revision: v.number(),
    claimToken: v.string(),
  },
  returns: v.union(
    v.object({ state: v.literal("claimed") }),
    v.object({ state: v.literal("busy") }),
    v.object({
      state: v.literal("ready"),
      briefingId: v.id("deliveryBriefings"),
      briefing: deliveryBriefingValidator,
    }),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) throw new Error("Document not found");
    const user = await ctx.db.get("users", document.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) {
      throw new Error("Document not found or access denied");
    }
    if ((await currentRevision(ctx, document._id)) !== args.revision) {
      throw new Error("The document changed before briefing generation began");
    }
    const existingBriefing = await ctx.db
      .query("deliveryBriefings")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder
          .eq("documentId", document._id)
          .eq("format", args.format),
      )
      .unique();
    if (existingBriefing?.revision === args.revision) {
      return {
        state: "ready" as const,
        briefingId: existingBriefing._id,
        briefing: existingBriefing.briefing,
      };
    }
    const existingClaim = await ctx.db
      .query("deliveryBriefingClaims")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder
          .eq("documentId", document._id)
          .eq("format", args.format),
      )
      .unique();
    const now = Date.now();
    if (
      existingClaim?.status === "generating" &&
      existingClaim.revision === args.revision &&
      now - existingClaim.updatedAt < 15 * 60 * 1_000
    ) {
      return { state: "busy" as const };
    }
    if (existingClaim) {
      await ctx.db.patch("deliveryBriefingClaims", existingClaim._id, {
        revision: args.revision,
        claimToken: args.claimToken,
        status: "generating",
        error: undefined,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("deliveryBriefingClaims", {
        userId: user._id,
        documentId: document._id,
        format: args.format,
        revision: args.revision,
        claimToken: args.claimToken,
        status: "generating",
        updatedAt: now,
      });
    }
    return { state: "claimed" as const };
  },
});

export const completeBriefing = internalMutation({
  args: {
    documentId: v.id("documents"),
    format: deliveryFormatValidator,
    revision: v.number(),
    claimToken: v.string(),
    briefing: deliveryBriefingValidator,
  },
  returns: v.union(v.id("deliveryBriefings"), v.null()),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) return null;
    const claim = await ctx.db
      .query("deliveryBriefingClaims")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder
          .eq("documentId", document._id)
          .eq("format", args.format),
      )
      .unique();
    if (
      !claim ||
      claim.status !== "generating" ||
      claim.claimToken !== args.claimToken ||
      claim.revision !== args.revision ||
      (await currentRevision(ctx, document._id)) !== args.revision
    ) {
      return null;
    }
    if (JSON.stringify(args.briefing).length > 80_000) {
      throw new Error("The delivery briefing exceeded storage limits");
    }
    const existing = await ctx.db
      .query("deliveryBriefings")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder
          .eq("documentId", document._id)
          .eq("format", args.format),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch("deliveryBriefings", existing._id, {
        briefing: args.briefing,
        revision: args.revision,
        updatedAt: now,
      });
      await ctx.db.patch("deliveryBriefingClaims", claim._id, {
        status: "complete",
        updatedAt: now,
      });
      return existing._id;
    }
    const briefingId = await ctx.db.insert("deliveryBriefings", {
      userId: document.userId,
      documentId: document._id,
      format: args.format,
      revision: args.revision,
      briefing: args.briefing,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("deliveryBriefingClaims", claim._id, {
      status: "complete",
      updatedAt: now,
    });
    return briefingId;
  },
});

export const failBriefing = internalMutation({
  args: {
    documentId: v.id("documents"),
    format: deliveryFormatValidator,
    claimToken: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db
      .query("deliveryBriefingClaims")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder
          .eq("documentId", args.documentId)
          .eq("format", args.format),
      )
      .unique();
    if (!claim || claim.claimToken !== args.claimToken) return null;
    await ctx.db.patch("deliveryBriefingClaims", claim._id, {
      status: "error",
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getForDocument = query({
  args: { documentId: v.id("documents") },
  returns: v.array(
    v.object({
      _id: v.id("deliveryBriefings"),
      format: deliveryFormatValidator,
      briefing: deliveryBriefingValidator,
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.userId !== user._id) {
      throw new Error("Document not found or access denied");
    }
    const revision = await currentRevision(ctx, document._id);
    const briefings = await ctx.db
      .query("deliveryBriefings")
      .withIndex("by_document_and_format", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .take(5);
    return briefings
      .filter((item) => item.revision === revision)
      .map((item) => ({
        _id: item._id,
        format: item.format,
        briefing: item.briefing,
        updatedAt: item.updatedAt,
      }));
  },
});
