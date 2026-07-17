import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  genreValidator,
  ideationDirectionValidator,
  ideationQuestionValidator,
} from "./lib/validators";

export const cancel = mutation({
  args: { interviewId: v.id("ideationInterviews") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const interview = await ctx.db.get(
      "ideationInterviews",
      args.interviewId,
    );
    if (!interview || interview.userId !== user._id) {
      throw new Error("Ideation interview not found");
    }
    if (interview.status === "open") {
      await ctx.db.patch("ideationInterviews", interview._id, {
        status: "cancelled",
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const claimInterview = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    requestId: v.string(),
    claimToken: v.string(),
  },
  returns: v.union(
    v.object({
      state: v.literal("claimed"),
      claimId: v.id("ideationInterviewRequests"),
    }),
    v.object({ state: v.literal("busy") }),
    v.object({
      state: v.literal("complete"),
      interviewId: v.id("ideationInterviews"),
    }),
  ),
  handler: async (ctx, args) => {
    if (!args.requestId.trim() || args.requestId.length > 100) {
      throw new Error("The interview request id is invalid");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const existing = await ctx.db
      .query("ideationInterviewRequests")
      .withIndex("by_user_and_request", (queryBuilder) =>
        queryBuilder
          .eq("userId", user._id)
          .eq("requestId", args.requestId),
      )
      .unique();
    if (existing?.status === "complete" && existing.interviewId) {
      return {
        state: "complete" as const,
        interviewId: existing.interviewId,
      };
    }
    const now = Date.now();
    if (
      existing?.status === "generating" &&
      now - existing.updatedAt < 15 * 60 * 1_000
    ) {
      return { state: "busy" as const };
    }
    if (existing) {
      await ctx.db.patch("ideationInterviewRequests", existing._id, {
        claimToken: args.claimToken,
        status: "generating",
        error: undefined,
        updatedAt: now,
      });
      return { state: "claimed" as const, claimId: existing._id };
    }
    const claimId = await ctx.db.insert("ideationInterviewRequests", {
      userId: user._id,
      requestId: args.requestId,
      claimToken: args.claimToken,
      status: "generating",
      updatedAt: now,
    });
    return { state: "claimed" as const, claimId };
  },
});

export const saveInterview = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    requestClaimId: v.id("ideationInterviewRequests"),
    claimToken: v.string(),
    genre: genreValidator,
    customPurpose: v.optional(v.string()),
    questions: v.array(ideationQuestionValidator),
    directions: v.array(ideationDirectionValidator),
  },
  returns: v.id("ideationInterviews"),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (queryBuilder) =>
        queryBuilder.eq("tokenIdentifier", args.tokenIdentifier),
      )
      .unique();
    if (!user) throw new Error("User not found");
    const requestClaim = await ctx.db.get(
      "ideationInterviewRequests",
      args.requestClaimId,
    );
    if (
      !requestClaim ||
      requestClaim.userId !== user._id ||
      requestClaim.status !== "generating" ||
      requestClaim.claimToken !== args.claimToken
    ) {
      throw new Error("The interview generation claim expired");
    }
    if (
      args.questions.length < 4 ||
      args.questions.length > 6 ||
      args.directions.length < 2 ||
      args.directions.length > 3 ||
      new Set(args.questions.map((item) => item.id)).size !==
        args.questions.length ||
      new Set(args.directions.map((item) => item.id)).size !==
        args.directions.length ||
      JSON.stringify({
        questions: args.questions,
        directions: args.directions,
      }).length > 40_000
    ) {
      throw new Error("The ideation interview is outside supported bounds");
    }
    const now = Date.now();
    const interviewId = await ctx.db.insert("ideationInterviews", {
      userId: user._id,
      genre: args.genre,
      customPurpose: args.customPurpose,
      questions: args.questions,
      directions: args.directions,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch("ideationInterviewRequests", requestClaim._id, {
      status: "complete",
      interviewId,
      updatedAt: now,
    });
    return interviewId;
  },
});

export const failInterview = internalMutation({
  args: {
    claimId: v.id("ideationInterviewRequests"),
    claimToken: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claim = await ctx.db.get("ideationInterviewRequests", args.claimId);
    if (
      !claim ||
      claim.status !== "generating" ||
      claim.claimToken !== args.claimToken
    ) {
      return null;
    }
    await ctx.db.patch("ideationInterviewRequests", claim._id, {
      status: "error",
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const getForCompose = internalQuery({
  args: {
    tokenIdentifier: v.string(),
    interviewId: v.id("ideationInterviews"),
  },
  returns: v.union(
    v.object({
      genre: genreValidator,
      customPurpose: v.optional(v.string()),
      questions: v.array(ideationQuestionValidator),
      directions: v.array(ideationDirectionValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(
      "ideationInterviews",
      args.interviewId,
    );
    if (!interview) return null;
    const user = await ctx.db.get("users", interview.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return null;
    return {
      genre: interview.genre,
      customPurpose: interview.customPurpose,
      questions: interview.questions,
      directions: interview.directions,
    };
  },
});

export const claimCompose = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    interviewId: v.id("ideationInterviews"),
    requestId: v.string(),
    claimToken: v.string(),
  },
  returns: v.union(
    v.object({ state: v.literal("claimed") }),
    v.object({ state: v.literal("busy") }),
    v.object({
      state: v.literal("complete"),
      documentId: v.id("documents"),
      runId: v.id("runs"),
    }),
  ),
  handler: async (ctx, args) => {
    if (!args.requestId.trim() || args.requestId.length > 100) {
      throw new Error("The ideation request id is invalid");
    }
    const interview = await ctx.db.get(
      "ideationInterviews",
      args.interviewId,
    );
    if (!interview) throw new Error("Ideation interview not found");
    const user = await ctx.db.get("users", interview.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) {
      throw new Error("Ideation interview not found or access denied");
    }
    if (
      interview.status === "complete" &&
      interview.documentId &&
      interview.runId
    ) {
      return {
        state: "complete" as const,
        documentId: interview.documentId,
        runId: interview.runId,
      };
    }
    const now = Date.now();
    const stale =
      interview.status === "composing" &&
      (interview.claimStartedAt ?? interview.updatedAt) <
        now - 15 * 60 * 1_000;
    if (interview.status === "composing" && !stale) {
      return { state: "busy" as const };
    }
    await ctx.db.patch("ideationInterviews", interview._id, {
      status: "composing",
      composeRequestId: args.requestId,
      claimToken: args.claimToken,
      claimStartedAt: now,
      error: undefined,
      updatedAt: now,
    });
    return { state: "claimed" as const };
  },
});

export const failCompose = internalMutation({
  args: {
    interviewId: v.id("ideationInterviews"),
    claimToken: v.string(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const interview = await ctx.db.get(
      "ideationInterviews",
      args.interviewId,
    );
    if (
      !interview ||
      interview.status !== "composing" ||
      interview.claimToken !== args.claimToken
    ) {
      return null;
    }
    await ctx.db.patch("ideationInterviews", interview._id, {
      status: "error",
      claimToken: undefined,
      claimStartedAt: undefined,
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});
