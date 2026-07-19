import { v } from "convex/values";

import {
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { formatPlaybookGuidance } from "./lib/playbookGuidance";
import {
  genreValidator,
  playbookStatusValidator,
  playbookTipValidator,
} from "./lib/validators";

const playbookEntryValidator = v.object({
  _id: v.id("playbookEntries"),
  title: v.string(),
  sourceExcerpt: v.string(),
  genres: v.array(genreValidator),
  appliesToAll: v.boolean(),
  tips: v.array(playbookTipValidator),
  status: playbookStatusValidator,
  updatedAt: v.number(),
});

export const listMine = query({
  args: {},
  returns: v.array(playbookEntryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const entries = await ctx.db
      .query("playbookEntries")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(50);
    return entries.map((entry) => ({
      _id: entry._id,
      title: entry.title,
      sourceExcerpt: entry.sourceExcerpt,
      genres: entry.genres,
      appliesToAll: entry.appliesToAll,
      tips: entry.tips,
      status: entry.status,
      updatedAt: entry.updatedAt,
    }));
  },
});

export const save = mutation({
  args: {
    title: v.string(),
    sourceText: v.string(),
    genres: v.array(genreValidator),
    appliesToAll: v.boolean(),
    tips: v.array(playbookTipValidator),
  },
  returns: v.id("playbookEntries"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const title = args.title.trim();
    const sourceText = args.sourceText.trim();
    const genres = [...new Set(args.genres)];
    const tips = args.tips.map((tip) => ({
      kind: tip.kind,
      text: tip.text.trim(),
    }));

    if (title.length < 3 || title.length > 120) {
      throw new Error("Playbook titles must contain 3–120 characters");
    }
    if (sourceText.length < 100 || sourceText.length > 30_000) {
      throw new Error("The source email must contain 100–30,000 characters");
    }
    if (args.appliesToAll && genres.length > 0) {
      throw new Error("Universal guidance cannot also target specific genres");
    }
    if (!args.appliesToAll && genres.length === 0) {
      throw new Error("Choose at least one genre for this guidance");
    }
    if (
      tips.length === 0 ||
      tips.length > 12 ||
      tips.some((tip) => tip.text.length < 10 || tip.text.length > 500)
    ) {
      throw new Error("Save 1–12 tips, each containing 10–500 characters");
    }

    const now = Date.now();
    return await ctx.db.insert("playbookEntries", {
      userId: user._id,
      title,
      sourceExcerpt: sourceText.slice(0, 2_000),
      genres,
      appliesToAll: args.appliesToAll,
      tips,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setStatus = mutation({
  args: {
    entryId: v.id("playbookEntries"),
    status: playbookStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await ctx.db.get("playbookEntries", args.entryId);
    if (!entry) throw new Error("Playbook entry not found");
    if (entry.userId !== user._id) throw new Error("Not authorized");
    await ctx.db.patch("playbookEntries", entry._id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { entryId: v.id("playbookEntries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const entry = await ctx.db.get("playbookEntries", args.entryId);
    if (!entry) return null;
    if (entry.userId !== user._id) throw new Error("Not authorized");
    await ctx.db.delete("playbookEntries", entry._id);
    return null;
  },
});

export const getGuidanceByToken = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    genre: genreValidator,
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    const active = await ctx.db
      .query("playbookEntries")
      .withIndex("by_user_status_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id).eq("status", "active"),
      )
      .order("desc")
      .take(50);
    const matching = active
      .filter(
        (entry) =>
          entry.appliesToAll || entry.genres.includes(args.genre),
      )
      .slice(0, 5);
    return formatPlaybookGuidance(matching);
  },
});
