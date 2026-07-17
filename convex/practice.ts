import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  deliveryFormatValidator,
  factValidator,
  practiceDifficultyValidator,
  practiceFeedbackValidator,
  practiceMessageValidator,
  practiceScenarioValidator,
  practiceStatusValidator,
} from "./lib/validators";

const sessionViewValidator = v.object({
  _id: v.id("practiceSessions"),
  documentId: v.id("documents"),
  scenario: practiceScenarioValidator,
  messages: v.array(practiceMessageValidator),
  status: practiceStatusValidator,
  feedback: v.optional(practiceFeedbackValidator),
  pending: v.boolean(),
  error: v.optional(v.string()),
  updatedAt: v.number(),
});

function assertScenarioBounds(args: {
  persona: string;
  difficulty: "supportive" | "standard" | "challenging";
}): string {
  const persona = args.persona.trim();
  if (persona.length < 3 || persona.length > 500) {
    throw new Error("The counterpart persona must contain 3–500 characters");
  }
  return persona;
}

export const getSession = query({
  args: { sessionId: v.id("practiceSessions") },
  returns: v.union(sessionViewValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (!session || session.userId !== user._id) return null;
    return {
      _id: session._id,
      documentId: session.documentId,
      scenario: session.scenario,
      messages: session.messages,
      status: session.status,
      feedback: session.feedback,
      pending: session.pending,
      error: session.error,
      updatedAt: session.updatedAt,
    };
  },
});

export const listForDocument = query({
  args: { documentId: v.id("documents") },
  returns: v.array(sessionViewValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const document = await ctx.db.get("documents", args.documentId);
    if (!document || document.userId !== user._id) {
      throw new Error("Document not found or access denied");
    }
    const sessions = await ctx.db
      .query("practiceSessions")
      .withIndex("by_document_and_updated", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .order("desc")
      .take(5);
    return sessions.map((session) => ({
      _id: session._id,
      documentId: session.documentId,
      scenario: session.scenario,
      messages: session.messages,
      status: session.status,
      feedback: session.feedback,
      pending: session.pending,
      error: session.error,
      updatedAt: session.updatedAt,
    }));
  },
});

export const getActionContext = internalQuery({
  args: {
    sessionId: v.id("practiceSessions"),
    tokenIdentifier: v.string(),
  },
  returns: v.union(
    v.object({
      scenario: practiceScenarioValidator,
      messages: v.array(practiceMessageValidator),
      documentText: v.string(),
      facts: v.array(factValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (!session) return null;
    const user = await ctx.db.get("users", session.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return null;
    const document = await ctx.db.get("documents", session.documentId);
    if (!document) return null;
    const [run] = await ctx.db
      .query("runs")
      .withIndex("by_document_and_created", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .order("desc")
      .take(1);
    return {
      scenario: session.scenario,
      messages:
        session.pendingUserMessage && session.claimStartedAt
          ? [
              ...session.messages,
              {
                role: "user" as const,
                text: session.pendingUserMessage,
                createdAt: session.claimStartedAt,
              },
            ]
          : session.messages,
      documentText:
        document.acceptedText ??
        run?.finalText ??
        run?.rewrittenText ??
        document.draft,
      facts: run?.factInventory ?? [],
    };
  },
});

export const claimStart = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    documentId: v.id("documents"),
    scenario: v.object({
      format: deliveryFormatValidator,
      persona: v.string(),
      difficulty: practiceDifficultyValidator,
    }),
    claimToken: v.string(),
  },
  returns: v.object({
    sessionId: v.id("practiceSessions"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const document = await ctx.db.get("documents", args.documentId);
    if (!document) throw new Error("Document not found");
    const user = await ctx.db.get("users", document.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) {
      throw new Error("Document not found or access denied");
    }
    const recent = await ctx.db
      .query("practiceSessions")
      .withIndex("by_document_and_updated", (queryBuilder) =>
        queryBuilder.eq("documentId", document._id),
      )
      .order("desc")
      .take(10);
    const now = Date.now();
    const staleBefore = now - 15 * 60 * 1_000;
    for (const session of recent) {
      if (
        session.claimStartedAt !== undefined &&
        session.claimStartedAt < staleBefore
      ) {
        await ctx.db.patch("practiceSessions", session._id, {
          status: session.status === "starting" ? "error" : "active",
          pending: false,
          pendingUserMessage: undefined,
          pendingRequestId: undefined,
          claimToken: undefined,
          claimStartedAt: undefined,
          error: "The previous model call expired. You can continue safely.",
          updatedAt: now,
        });
      }
    }
    const recovered = recent.find(
      (session) =>
        session.status !== "starting" &&
        session.claimStartedAt !== undefined &&
        session.claimStartedAt < staleBefore,
    );
    if (recovered) return { sessionId: recovered._id, created: false };
    const existing = recent.find(
      (session) =>
        ["starting", "active", "evaluating"].includes(session.status) &&
        !(
          session.claimStartedAt !== undefined &&
          session.claimStartedAt < staleBefore
        ),
    );
    if (existing) return { sessionId: existing._id, created: false };
    const persona = assertScenarioBounds(args.scenario);
    const sessionId = await ctx.db.insert("practiceSessions", {
      userId: user._id,
      documentId: document._id,
      scenario: { ...args.scenario, persona },
      messages: [],
      status: "starting",
      pending: true,
      completedTurnRequestIds: [],
      claimToken: args.claimToken,
      claimStartedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { sessionId, created: true };
  },
});

export const completeStart = internalMutation({
  args: {
    sessionId: v.id("practiceSessions"),
    claimToken: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (
      !session ||
      session.status !== "starting" ||
      session.claimToken !== args.claimToken
    ) {
      return null;
    }
    const text = args.message.trim();
    if (!text || text.length > 2_000) {
      throw new Error("The opening practice message is invalid");
    }
    const now = Date.now();
    await ctx.db.patch("practiceSessions", session._id, {
      messages: [{ role: "coach", text, createdAt: now }],
      status: "active",
      pending: false,
      claimToken: undefined,
      claimStartedAt: undefined,
      error: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const claimReply = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    sessionId: v.id("practiceSessions"),
    message: v.string(),
    requestId: v.string(),
    claimToken: v.string(),
  },
  returns: v.union(
    v.literal("claimed"),
    v.literal("complete"),
    v.literal("blocked"),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (!session) return "blocked";
    const user = await ctx.db.get("users", session.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return "blocked";
    if (!args.requestId.trim() || args.requestId.length > 100) {
      throw new Error("The practice turn request id is invalid");
    }
    if ((session.completedTurnRequestIds ?? []).includes(args.requestId)) {
      return "complete";
    }
    const message = args.message.trim();
    if (!message || message.length > 2_000) {
      throw new Error("Practice replies must contain 1–2,000 characters");
    }
    const now = Date.now();
    const staleClaim =
      session.pending &&
      session.claimStartedAt !== undefined &&
      session.claimStartedAt < now - 15 * 60 * 1_000;
    if (
      session.status !== "active" ||
      (session.pending && !staleClaim) ||
      session.messages.length >= 19
    ) {
      return "blocked";
    }
    await ctx.db.patch("practiceSessions", session._id, {
      pending: true,
      pendingUserMessage: message,
      pendingRequestId: args.requestId,
      claimToken: args.claimToken,
      claimStartedAt: now,
      error: undefined,
      updatedAt: now,
    });
    return "claimed";
  },
});

export const completeReply = internalMutation({
  args: {
    sessionId: v.id("practiceSessions"),
    claimToken: v.string(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (
      !session ||
      session.status !== "active" ||
      !session.pending ||
      session.claimToken !== args.claimToken
    ) {
      return null;
    }
    const message = args.message.trim();
    if (
      !message ||
      message.length > 2_000 ||
      !session.pendingUserMessage ||
      !session.pendingRequestId ||
      session.messages.length >= 19
    ) {
      throw new Error("The practice response is invalid");
    }
    const now = Date.now();
    await ctx.db.patch("practiceSessions", session._id, {
      messages: [
        ...session.messages,
        {
          role: "user",
          text: session.pendingUserMessage,
          createdAt: session.claimStartedAt ?? now,
        },
        { role: "coach", text: message, createdAt: now },
      ],
      pending: false,
      pendingUserMessage: undefined,
      pendingRequestId: undefined,
      completedTurnRequestIds: [
        ...(session.completedTurnRequestIds ?? []),
        session.pendingRequestId,
      ].slice(-10),
      claimToken: undefined,
      claimStartedAt: undefined,
      updatedAt: now,
    });
    return null;
  },
});

export const claimFinish = internalMutation({
  args: {
    tokenIdentifier: v.string(),
    sessionId: v.id("practiceSessions"),
    claimToken: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (!session) return false;
    const user = await ctx.db.get("users", session.userId);
    if (!user || user.tokenIdentifier !== args.tokenIdentifier) return false;
    const now = Date.now();
    const staleEvaluation =
      session.status === "evaluating" &&
      session.claimStartedAt !== undefined &&
      session.claimStartedAt < now - 15 * 60 * 1_000;
    if (
      (session.status !== "active" && !staleEvaluation) ||
      (session.pending && !staleEvaluation) ||
      session.messages.length < 3
    ) {
      return false;
    }
    await ctx.db.patch("practiceSessions", session._id, {
      status: "evaluating",
      pending: true,
      claimToken: args.claimToken,
      claimStartedAt: now,
      error: undefined,
      updatedAt: now,
    });
    return true;
  },
});

export const completeFinish = internalMutation({
  args: {
    sessionId: v.id("practiceSessions"),
    claimToken: v.string(),
    feedback: practiceFeedbackValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (
      !session ||
      session.status !== "evaluating" ||
      session.claimToken !== args.claimToken
    ) {
      return null;
    }
    if (JSON.stringify(args.feedback).length > 60_000) {
      throw new Error("Practice feedback exceeded storage limits");
    }
    await ctx.db.patch("practiceSessions", session._id, {
      status: "complete",
      pending: false,
      claimToken: undefined,
      claimStartedAt: undefined,
      feedback: args.feedback,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const failClaim = internalMutation({
  args: {
    sessionId: v.id("practiceSessions"),
    claimToken: v.string(),
    terminal: v.boolean(),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get("practiceSessions", args.sessionId);
    if (!session || session.claimToken !== args.claimToken) return null;
    await ctx.db.patch("practiceSessions", session._id, {
      status: args.terminal ? "error" : "active",
      pending: false,
      pendingUserMessage: undefined,
      pendingRequestId: undefined,
      claimToken: undefined,
      claimStartedAt: undefined,
      error: args.error.slice(0, 1_000),
      updatedAt: Date.now(),
    });
    return null;
  },
});
