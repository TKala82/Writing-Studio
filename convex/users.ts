import { v } from "convex/values";

import { internalQuery, mutation } from "./_generated/server";

export const ensure = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (query) =>
        query.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch("users", existing._id, {
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        imageUrl: identity.pictureUrl ?? existing.imageUrl,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? "Writer",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    return user?._id ?? null;
  },
});
