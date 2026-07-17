import { v } from "convex/values";

import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  blindSpotValidator,
  genreValidator,
  ideationDirectionValidator,
  ideationQuestionValidator,
  preflightAnswerValidator,
} from "./lib/validators";

const openSessionValidator = v.object({
  _id: v.id("preflightSessions"),
  genre: genreValidator,
  customPurpose: v.optional(v.string()),
  customRubricId: v.optional(v.id("customRubrics")),
  draft: v.string(),
  questions: v.array(ideationQuestionValidator),
  blindSpots: v.array(blindSpotValidator),
  variants: v.array(ideationDirectionValidator),
  answers: v.optional(v.array(preflightAnswerValidator)),
  selectedVariantId: v.optional(v.string()),
  updatedAt: v.number(),
});

const sessionArgs = {
  genre: genreValidator,
  customPurpose: v.optional(v.string()),
  customRubricId: v.optional(v.id("customRubrics")),
  draft: v.string(),
  questions: v.array(ideationQuestionValidator),
  blindSpots: v.array(blindSpotValidator),
  variants: v.array(ideationDirectionValidator),
};

export const getOpen = query({
  args: {},
  returns: v.union(openSessionValidator, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db
      .query("preflightSessions")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .first();
    if (!session || session.status !== "open") return null;
    return {
      _id: session._id,
      genre: session.genre,
      customPurpose: session.customPurpose,
      customRubricId: session.customRubricId,
      draft: session.draft,
      questions: session.questions,
      blindSpots: session.blindSpots,
      variants: session.variants,
      answers: session.answers,
      selectedVariantId: session.selectedVariantId,
      updatedAt: session.updatedAt,
    };
  },
});

export const saveSessionFromAction = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    ...sessionArgs,
  },
  returns: v.id("preflightSessions"),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const draft = args.draft.trim();
    if (draft.length < 50 || draft.length > 40_000) {
      throw new Error("Draft length is outside the supported range");
    }
    if (
      args.questions.length < 2 ||
      args.questions.length > 6 ||
      args.variants.length > 4 ||
      args.blindSpots.length > 8
    ) {
      throw new Error("The preflight interview is outside supported bounds");
    }
    const now = Date.now();
    const openSessions = await ctx.db
      .query("preflightSessions")
      .withIndex("by_user_and_updated", (queryBuilder) =>
        queryBuilder.eq("userId", user._id),
      )
      .order("desc")
      .take(10);
    for (const session of openSessions) {
      if (session.status === "open") {
        await ctx.db.patch("preflightSessions", session._id, {
          status: "cancelled",
          updatedAt: now,
        });
      }
    }
    return await ctx.db.insert("preflightSessions", {
      userId: user._id,
      genre: args.genre,
      customPurpose: args.customPurpose?.trim() || undefined,
      customRubricId: args.customRubricId,
      draft,
      questions: args.questions,
      blindSpots: args.blindSpots,
      variants: args.variants,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const cancel = mutation({
  args: { sessionId: v.id("preflightSessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get("preflightSessions", args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Preflight session not found");
    }
    if (session.status === "open") {
      await ctx.db.patch("preflightSessions", session._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const markContinued = mutation({
  args: {
    sessionId: v.id("preflightSessions"),
    answers: v.optional(v.array(preflightAnswerValidator)),
    selectedVariantId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get("preflightSessions", args.sessionId);
    if (!session || session.userId !== user._id) {
      throw new Error("Preflight session not found");
    }
    if (session.status !== "open") {
      throw new Error("This preflight interview is no longer open");
    }
    await ctx.db.patch("preflightSessions", session._id, {
      status: "continued",
      answers: args.answers,
      selectedVariantId: args.selectedVariantId,
      updatedAt: Date.now(),
    });
    return null;
  },
});
