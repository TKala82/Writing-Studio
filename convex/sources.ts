import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  genreValidator,
  sourceFactValidator,
  sourceKindValidator,
  sourceStatusValidator,
} from "./lib/validators";

const MAX_TEXT_CHARACTERS = 120_000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const sourceViewValidator = v.object({
  _id: v.id("sources"),
  kind: sourceKindValidator,
  status: sourceStatusValidator,
  title: v.string(),
  originalUrl: v.optional(v.string()),
  mediaType: v.optional(v.string()),
  byteSize: v.optional(v.number()),
  summary: v.optional(v.string()),
  themes: v.optional(v.array(v.string())),
  facts: v.optional(v.array(sourceFactValidator)),
  error: v.optional(v.string()),
  updatedAt: v.number(),
});

const sourceAngleValidator = v.object({
  id: v.string(),
  title: v.string(),
  thesis: v.string(),
  rationale: v.string(),
  genre: genreValidator,
  purpose: v.string(),
  outline: v.array(v.string()),
  factIds: v.array(v.string()),
});

function normalizePublicUrl(value: string): URL {
  if (value.length > 2_048) {
    throw new Error("Links are limited to 2,048 characters");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a complete public URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only public HTTP and HTTPS links are supported");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("Private network addresses cannot be imported");
  }
  return url;
}

function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.replace(/^www\./, "");
  return (
    hostname === "youtu.be" ||
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com")
  );
}

export const list = query({
  args: {},
  returns: v.array(sourceViewValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const sources = await ctx.db
      .query("sources")
      .withIndex("by_user_archived_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id).eq("archivedAt", undefined),
      )
      .order("desc")
      .take(24);
    return sources.map((source) => ({
        _id: source._id,
        kind: source.kind,
        status: source.status,
        title: source.title,
        originalUrl: source.originalUrl,
        mediaType: source.mediaType,
        byteSize: source.byteSize,
        summary: source.summary,
        themes: source.themes,
        facts: source.facts,
        error: source.error,
        updatedAt: source.updatedAt,
      }));
  },
});

export const listAngles = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sourceAngles"),
      sourceIds: v.array(v.id("sources")),
      id: v.string(),
      title: v.string(),
      thesis: v.string(),
      rationale: v.string(),
      genre: genreValidator,
      purpose: v.string(),
      outline: v.array(v.string()),
      factIds: v.array(v.string()),
      interpretation: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const angles = await ctx.db
      .query("sourceAngles")
      .withIndex("by_user_and_created", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(32);
    const visibleAngles = [];
    for (const angle of angles) {
      const sourceRecords = await Promise.all(
        angle.sourceIds.map(async (sourceId) => await ctx.db.get("sources", sourceId)),
      );
      if (
        sourceRecords.every(
          (source) =>
            source &&
            source.userId === user._id &&
            source.archivedAt === undefined,
        )
      ) {
        visibleAngles.push(angle);
      }
      if (visibleAngles.length === 16) break;
    }
    return visibleAngles.map((angle) => ({
      _id: angle._id,
      sourceIds: angle.sourceIds,
      id: angle.angleId,
      title: angle.title,
      thesis: angle.thesis,
      rationale: angle.rationale,
      genre: angle.genre,
      purpose: angle.purpose,
      outline: angle.outline,
      factIds: angle.factIds,
      interpretation: angle.interpretation,
      createdAt: angle.createdAt,
    }));
  },
});

export const saveAngles = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    sourceIds: v.array(v.id("sources")),
    interpretation: v.optional(v.string()),
    angles: v.array(sourceAngleValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const sourceIds = [...new Set(args.sourceIds)].sort();
    for (const sourceId of sourceIds) {
      const source = await ctx.db.get("sources", sourceId);
      if (
        !source ||
        source.userId !== user._id ||
        source.archivedAt !== undefined
      ) {
        throw new Error("A selected source is unavailable");
      }
    }
    const existingAngles = await ctx.db
      .query("sourceAngles")
      .withIndex("by_user_and_created", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(80);
    for (const staleAngle of existingAngles.slice(44)) {
      await ctx.db.delete("sourceAngles", staleAngle._id);
    }
    const sourceKey = sourceIds.join(":");
    const now = Date.now();
    for (const angle of args.angles.slice(0, 4)) {
      await ctx.db.insert("sourceAngles", {
        userId: user._id,
        sourceIds,
        sourceKey,
        angleId: angle.id,
        title: angle.title,
        thesis: angle.thesis,
        rationale: angle.rationale,
        genre: angle.genre,
        purpose: angle.purpose,
        outline: angle.outline,
        factIds: angle.factIds,
        interpretation: args.interpretation?.trim() || undefined,
        createdAt: now,
      });
    }
    return null;
  },
});

export const markAngleSelected = mutation({
  args: { angleId: v.id("sourceAngles") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const angle = await ctx.db.get("sourceAngles", args.angleId);
    if (!angle) return null;
    if (angle.userId !== user._id) {
      throw new Error("Unauthorized: this angle belongs to another user");
    }
    await ctx.db.patch("sourceAngles", angle._id, { selectedAt: Date.now() });
    return null;
  },
});

export const createText = mutation({
  args: {
    text: v.string(),
    title: v.optional(v.string()),
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const text = args.text.trim();
    if (text.length < 50) {
      throw new Error("Paste at least 50 characters of source material");
    }
    if (text.length > MAX_TEXT_CHARACTERS) {
      throw new Error("Pasted sources are limited to 120,000 characters");
    }
    const now = Date.now();
    return await ctx.db.insert("sources", {
      userId: user._id,
      kind: "text",
      status: "queued",
      title: args.title?.trim().slice(0, 120) || "Pasted source",
      rawText: text,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createUrl = mutation({
  args: { url: v.string() },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const url = normalizePublicUrl(args.url.trim());
    const now = Date.now();
    return await ctx.db.insert("sources", {
      userId: user._id,
      kind: isYouTubeUrl(url) ? "youtube" : "url",
      status: "queued",
      title: isYouTubeUrl(url) ? "YouTube video" : url.hostname,
      originalUrl: url.toString(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createFile = mutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
    mediaType: v.string(),
    byteSize: v.number(),
  },
  returns: v.id("sources"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (args.byteSize <= 0 || args.byteSize > MAX_FILE_BYTES) {
      throw new Error("Files must be smaller than 15 MB");
    }
    const isPdf = args.mediaType === "application/pdf";
    const isImage = args.mediaType.startsWith("image/");
    if (!isPdf && !isImage) {
      throw new Error("Upload a PDF or image file");
    }
    const now = Date.now();
    return await ctx.db.insert("sources", {
      userId: user._id,
      kind: isPdf ? "pdf" : "image",
      status: "queued",
      title: args.filename.trim().slice(0, 120) || (isPdf ? "PDF" : "Image"),
      storageId: args.storageId,
      mediaType: args.mediaType,
      byteSize: args.byteSize,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { sourceId: v.id("sources") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const source = await ctx.db.get("sources", args.sourceId);
    if (!source) return null;
    if (source.userId !== user._id) {
      throw new Error("Unauthorized: this source belongs to another user");
    }
    if (source.storageId) {
      await ctx.storage.delete(source.storageId);
    }
    const relatedAngles = await ctx.db
      .query("sourceAngles")
      .withIndex("by_user_and_created", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(80);
    for (const angle of relatedAngles) {
      if (angle.sourceIds.includes(source._id)) {
        await ctx.db.delete("sourceAngles", angle._id);
      }
    }
    await ctx.db.patch("sources", source._id, {
      title: "Removed source",
      claimToken: undefined,
      originalUrl: undefined,
      storageId: undefined,
      mediaType: undefined,
      byteSize: undefined,
      rawText: undefined,
      summary: undefined,
      themes: undefined,
      facts: undefined,
      error: undefined,
      archivedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getForProcessing = internalQuery({
  args: {
    sourceId: v.id("sources"),
    tokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("sources"),
      kind: sourceKindValidator,
      title: v.string(),
      originalUrl: v.optional(v.string()),
      storageId: v.optional(v.id("_storage")),
      mediaType: v.optional(v.string()),
      byteSize: v.optional(v.number()),
      rawText: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("sources", args.sourceId);
    if (!source || source.archivedAt !== undefined) return null;
    const user = await ctx.db.get("users", source.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return null;
    return {
      _id: source._id,
      kind: source.kind,
      title: source.title,
      originalUrl: source.originalUrl,
      storageId: source.storageId,
      mediaType: source.mediaType,
      byteSize: source.byteSize,
      rawText: source.rawText,
    };
  },
});

export const getManyForProcessing = internalQuery({
  args: {
    sourceIds: v.array(v.id("sources")),
    tokenIdentifier: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("sources"),
      kind: sourceKindValidator,
      title: v.string(),
      summary: v.string(),
      themes: v.array(v.string()),
      facts: v.array(sourceFactValidator),
    }),
  ),
  handler: async (ctx, args) => {
    if (args.sourceIds.length === 0 || args.sourceIds.length > 8) {
      throw new Error("Choose between one and eight sources");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const uniqueSourceIds = [...new Set(args.sourceIds)];
    const sources = [];
    for (const sourceId of uniqueSourceIds) {
      const source = await ctx.db.get("sources", sourceId);
      if (
        !source ||
        source.userId !== user._id ||
        source.archivedAt !== undefined ||
        source.status !== "ready" ||
        !source.summary ||
        !source.themes ||
        !source.facts
      ) {
        throw new Error("A selected source is unavailable or not ready");
      }
      sources.push({
        _id: source._id,
        kind: source.kind,
        title: source.title,
        summary: source.summary,
        themes: source.themes,
        facts: source.facts,
      });
    }
    return sources;
  },
});

export const claimProcessing = internalMutation({
  args: {
    sourceId: v.id("sources"),
    claimToken: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("sources", args.sourceId);
    if (
      !source ||
      source.archivedAt !== undefined ||
      source.status === "ready"
    ) {
      return false;
    }
    const now = Date.now();
    const staleProcessing =
      source.status === "processing" &&
      now - source.updatedAt > 15 * 60 * 1_000;
    if (source.status === "processing" && !staleProcessing) return false;
    await ctx.db.patch("sources", source._id, {
      status: "processing",
      claimToken: args.claimToken,
      error: undefined,
      updatedAt: now,
    });
    return true;
  },
});

export const completeProcessing = internalMutation({
  args: {
    sourceId: v.id("sources"),
    claimToken: v.string(),
    title: v.string(),
    summary: v.string(),
    themes: v.array(v.string()),
    facts: v.array(sourceFactValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("sources", args.sourceId);
    if (!source) throw new Error("Source not found");
    if (
      source.claimToken !== args.claimToken ||
      source.archivedAt !== undefined ||
      source.status !== "processing"
    ) {
      return null;
    }
    if (
      args.summary.length > 6_000 ||
      args.themes.length > 8 ||
      args.themes.some((theme) => theme.length > 200) ||
      args.facts.length > 80 ||
      args.facts.some(
        (fact) =>
          fact.id.length > 100 ||
          fact.claim.length > 2_000 ||
          fact.sourceText.length > 2_000,
      )
    ) {
      throw new Error("The source analysis exceeded storage limits");
    }
    await ctx.db.patch("sources", source._id, {
      status: "ready",
      title: args.title.trim().slice(0, 120) || source.title,
      summary: args.summary,
      themes: args.themes.slice(0, 8),
      facts: args.facts.slice(0, 80),
      error: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failProcessing = internalMutation({
  args: {
    sourceId: v.id("sources"),
    claimToken: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const source = await ctx.db.get("sources", args.sourceId);
    if (
      !source ||
      source.claimToken !== args.claimToken ||
      source.archivedAt !== undefined ||
      source.status !== "processing"
    ) {
      return null;
    }
    await ctx.db.patch("sources", source._id, {
      status: "error",
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});
