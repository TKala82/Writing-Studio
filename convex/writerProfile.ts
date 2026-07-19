import { v } from "convex/values";

import {
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { formatWriterContext } from "./lib/writerContext";

const writerProfileValidator = v.object({
  aboutMe: v.optional(v.string()),
  objectives: v.optional(v.string()),
  audience: v.optional(v.string()),
  updatedAt: v.number(),
});

function normalizeField(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function validateField(label: string, value: string | undefined): void {
  if ((value?.length ?? 0) > 1_500) {
    throw new Error(`${label} is limited to 1,500 characters`);
  }
}

export const getMine = query({
  args: {},
  returns: v.union(writerProfileValidator, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const profile = await ctx.db
      .query("writerProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .unique();
    if (!profile) return null;
    return {
      aboutMe: profile.aboutMe,
      objectives: profile.objectives,
      audience: profile.audience,
      updatedAt: profile.updatedAt,
    };
  },
});

export const save = mutation({
  args: {
    aboutMe: v.optional(v.string()),
    objectives: v.optional(v.string()),
    audience: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    validateField("Who you are", args.aboutMe);
    validateField("What you are working toward", args.objectives);
    validateField("Who you write for", args.audience);
    const aboutMe = normalizeField(args.aboutMe);
    const objectives = normalizeField(args.objectives);
    const audience = normalizeField(args.audience);

    const existing = await ctx.db
      .query("writerProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .unique();
    if (!aboutMe && !objectives && !audience) {
      if (existing) await ctx.db.delete("writerProfiles", existing._id);
      return null;
    }

    const fields = {
      aboutMe,
      objectives,
      audience,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch("writerProfiles", existing._id, fields);
    } else {
      await ctx.db.insert("writerProfiles", {
        userId: user._id,
        ...fields,
      });
    }
    return null;
  },
});

export const getContextByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    const profile = await ctx.db
      .query("writerProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .unique();
    return formatWriterContext(profile);
  },
});

export const getDeliveryContextByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) return null;

    const profile = await ctx.db
      .query("writerProfiles")
      .withIndex("by_user", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .unique();
    return formatWriterContext(
      profile ? { audience: profile.audience } : null,
      1_500,
    );
  },
});
