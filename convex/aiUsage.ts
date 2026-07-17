import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { aiOperationValidator } from "./lib/validators";

const DAILY_LIMITS = {
  "ideation-interview": 30,
  "ideation-compose": 20,
  "delivery-briefing": 30,
  "practice-start": 30,
  "practice-reply": 120,
  "practice-finish": 30,
  "library-index": 60,
  "library-suggest": 60,
  preflight: 40,
  "pipeline-run": 20,
  "detect-genre": 40,
  "rewrite-selection": 60,
  "source-ingest": 40,
  "source-suggest": 30,
  "source-compose": 20,
} as const;

export const reserve = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    operation: aiOperationValidator,
    token: v.string(),
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
    const now = Date.now();
    const expired = await ctx.db
      .query("aiUsageLeases")
      .withIndex("by_expires_at", (queryBuilder) =>
        queryBuilder.lt("expiresAt", now - 24 * 60 * 60 * 1_000),
      )
      .take(20);
    for (const lease of expired) {
      await ctx.db.delete("aiUsageLeases", lease._id);
    }
    const recent = await ctx.db
      .query("aiUsageLeases")
      .withIndex("by_user_operation_created", (queryBuilder) =>
        queryBuilder
          .eq("userId", user._id)
          .eq("operation", args.operation),
      )
      .order("desc")
      .take(200);
    const concurrent = recent.filter(
      (lease) => lease.status === "active" && lease.expiresAt > now,
    ).length;
    if (concurrent >= 2) {
      throw new Error("Two requests are already running. Try again shortly.");
    }
    const burstLimit = args.operation === "practice-reply" ? 20 : 8;
    if (
      recent.filter((lease) => lease.createdAt > now - 60 * 1_000).length >=
      burstLimit
    ) {
      throw new Error("The coaching limit was reached. Try again in a minute.");
    }
    if (
      recent.filter((lease) => lease.createdAt > now - 24 * 60 * 60 * 1_000)
        .length >= DAILY_LIMITS[args.operation]
    ) {
      throw new Error("The daily coaching limit was reached. Try again tomorrow.");
    }
    await ctx.db.insert("aiUsageLeases", {
      userId: user._id,
      operation: args.operation,
      token: args.token,
      status: "active",
      expiresAt: now + 10 * 60 * 1_000,
      createdAt: now,
    });
    return null;
  },
});

export const release = internalMutation({
  args: { token: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lease = await ctx.db
      .query("aiUsageLeases")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("token", args.token),
      )
      .first();
    if (lease?.status === "active") {
      await ctx.db.patch("aiUsageLeases", lease._id, {
        status: "released",
        expiresAt: Date.now(),
      });
    }
    return null;
  },
});
