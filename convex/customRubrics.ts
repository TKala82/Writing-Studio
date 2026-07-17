import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  customCriterionValidator,
  genreValidator,
  rubricLengthValidator,
} from "./lib/validators";

export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("customRubrics"),
      name: v.string(),
      description: v.string(),
      baseGenre: genreValidator,
      accent: v.string(),
      referenceCount: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const rubrics = await ctx.db
      .query("customRubrics")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(20);
    return rubrics.map((rubric) => ({
      _id: rubric._id,
      name: rubric.name,
      description: rubric.description,
      baseGenre: rubric.baseGenre,
      accent: rubric.accent,
      referenceCount: rubric.referenceCount,
      updatedAt: rubric.updatedAt,
    }));
  },
});

export const saveDerived = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    name: v.string(),
    description: v.string(),
    baseGenre: genreValidator,
    accent: v.string(),
    systemPrompt: v.string(),
    length: rubricLengthValidator,
    criteria: v.array(customCriterionValidator),
    preferredPatterns: v.array(v.string()),
    discouragedPatterns: v.array(v.string()),
    referenceCount: v.number(),
  },
  returns: v.id("customRubrics"),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    if (
      args.length.maxWords <= args.length.minWords ||
      args.length.targetGradeMax < args.length.targetGradeMin
    ) {
      throw new Error("The rubric contains an invalid target range");
    }
    const now = Date.now();
    return await ctx.db.insert("customRubrics", {
      userId: user._id,
      name: args.name.trim().slice(0, 80),
      description: args.description.trim().slice(0, 500),
      baseGenre: args.baseGenre,
      accent: args.accent.trim().slice(0, 200),
      systemPrompt: args.systemPrompt.trim().slice(0, 6_000),
      length: args.length,
      criteria: args.criteria.slice(0, 10),
      preferredPatterns: args.preferredPatterns.slice(0, 8),
      discouragedPatterns: args.discouragedPatterns.slice(0, 8),
      referenceCount: args.referenceCount,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getForRun = internalQuery({
  args: {
    rubricId: v.id("customRubrics"),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      name: v.string(),
      description: v.string(),
      baseGenre: genreValidator,
      accent: v.string(),
      systemPrompt: v.string(),
      length: rubricLengthValidator,
      criteria: v.array(customCriterionValidator),
      preferredPatterns: v.array(v.string()),
      discouragedPatterns: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const rubric = await ctx.db.get("customRubrics", args.rubricId);
    if (!rubric || rubric.userId !== args.userId) return null;
    return {
      name: rubric.name,
      description: rubric.description,
      baseGenre: rubric.baseGenre,
      accent: rubric.accent,
      systemPrompt: rubric.systemPrompt,
      length: rubric.length,
      criteria: rubric.criteria,
      preferredPatterns: rubric.preferredPatterns,
      discouragedPatterns: rubric.discouragedPatterns,
    };
  },
});
