import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  genreValidator,
  libraryKeyPassageValidator,
} from "./lib/validators";

const shelfItemValidator = v.object({
  documentId: v.id("documents"),
  runId: v.optional(v.id("runs")),
  title: v.string(),
  genre: genreValidator,
  status: v.string(),
  preview: v.string(),
  wordCount: v.number(),
  updatedAt: v.number(),
  indexed: v.boolean(),
  summary: v.optional(v.string()),
  topics: v.array(v.string()),
  keyPassages: v.array(libraryKeyPassageValidator),
});

export const listShelf = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(shelfItemValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const limit = Math.min(Math.max(Math.floor(args.limit ?? 60), 1), 100);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(limit);

    return await Promise.all(
      documents.map(async (document) => {
        const [latestRun, entry] = await Promise.all([
          ctx.db
            .query("runs")
            .withIndex("by_document_and_created", (queryBuilder) =>
              queryBuilder.eq("documentId", document._id),
            )
            .order("desc")
            .first(),
          ctx.db
            .query("libraryEntries")
            .withIndex("by_document", (queryBuilder) =>
              queryBuilder.eq("documentId", document._id),
            )
            .unique(),
        ]);
        const displayText =
          document.acceptedText ?? latestRun?.finalText ?? document.draft;
        return {
          documentId: document._id,
          runId: latestRun?._id,
          title: document.title,
          genre: document.genre,
          status: latestRun?.status ?? document.status,
          preview: displayText.replace(/\s+/g, " ").trim().slice(0, 220),
          wordCount: displayText.trim()
            ? displayText.trim().split(/\s+/).length
            : 0,
          updatedAt: document.updatedAt,
          indexed: entry !== null,
          summary: entry?.summary,
          topics: entry?.topics ?? [],
          keyPassages: entry?.keyPassages ?? [],
        };
      }),
    );
  },
});

export const getIndexableDocument = internalQuery({
  args: { documentId: v.id("documents") },
  returns: v.union(
    v.object({
      documentId: v.id("documents"),
      userId: v.id("users"),
      tokenIdentifier: v.string(),
      title: v.string(),
      genre: genreValidator,
      text: v.string(),
      existingFingerprint: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) return null;
    const user = await ctx.db.get("users", document.userId);
    if (!user) return null;
    const latestRun = await ctx.db
      .query("runs")
      .withIndex("by_document_and_created", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .order("desc")
      .first();
    const entry = await ctx.db
      .query("libraryEntries")
      .withIndex("by_document", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .unique();
    return {
      documentId: document._id,
      userId: document.userId,
      tokenIdentifier: user.tokenIdentifier,
      title: document.title,
      genre: document.genre,
      text: document.acceptedText ?? latestRun?.finalText ?? document.draft,
      existingFingerprint: entry?.fingerprint,
    };
  },
});

export const listUnindexed = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    limit: v.number(),
  },
  returns: v.array(v.id("documents")),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const limit = Math.min(Math.max(Math.floor(args.limit), 1), 30);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(100);
    const unindexed: Array<(typeof documents)[number]["_id"]> = [];
    for (const document of documents) {
      const entry = await ctx.db
        .query("libraryEntries")
        .withIndex("by_document", (queryBuilder) =>
          queryBuilder.eq("documentId", document._id),
        )
        .unique();
      if (!entry) unindexed.push(document._id);
      if (unindexed.length >= limit) break;
    }
    return unindexed;
  },
});

export const saveEntry = internalMutation({
  args: {
    documentId: v.id("documents"),
    userId: v.id("users"),
    genre: genreValidator,
    summary: v.string(),
    topics: v.array(v.string()),
    keyPassages: v.array(libraryKeyPassageValidator),
    fingerprint: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (
      !document ||
      document.userId !== args.userId ||
      document.genre !== args.genre
    ) {
      throw new Error("Document not found or library ownership changed");
    }
    const existing = await ctx.db
      .query("libraryEntries")
      .withIndex("by_document", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .unique();
    const value = {
      userId: args.userId,
      documentId: document._id,
      genre: args.genre,
      summary: args.summary.trim().slice(0, 600),
      topics: [...new Set(args.topics.map((topic) => topic.trim()))]
        .filter(Boolean)
        .slice(0, 8),
      keyPassages: args.keyPassages.slice(0, 4).map((passage) => ({
        text: passage.text.trim().slice(0, 2_000),
        whyReusable: passage.whyReusable.trim().slice(0, 500),
      })),
      fingerprint: args.fingerprint,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch("libraryEntries", existing._id, value);
    } else {
      await ctx.db.insert("libraryEntries", value);
    }
    return null;
  },
});

export const getSuggestionCandidates = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    genre: genreValidator,
  },
  returns: v.array(
    v.object({
      documentId: v.id("documents"),
      runId: v.optional(v.id("runs")),
      title: v.string(),
      genre: genreValidator,
      summary: v.string(),
      topics: v.array(v.string()),
      keyPassages: v.array(libraryKeyPassageValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const entries = await ctx.db
      .query("libraryEntries")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(60);
    const ranked = [...entries].sort(
      (left, right) =>
        Number(right.genre === args.genre) - Number(left.genre === args.genre),
    );
    const candidates = [];
    for (const entry of ranked.slice(0, 30)) {
      const document = await ctx.db.get("documents", entry.documentId);
      if (!document || document.userId !== user._id) continue;
      const latestRun = await ctx.db
        .query("runs")
        .withIndex("by_document_and_created", (queryBuilder) =>
          queryBuilder.eq("documentId", document._id),
        )
        .order("desc")
        .first();
      candidates.push({
        documentId: document._id,
        runId: latestRun?._id,
        title: document.title,
        genre: entry.genre,
        summary: entry.summary,
        topics: entry.topics,
        keyPassages: entry.keyPassages,
      });
    }
    return candidates;
  },
});
