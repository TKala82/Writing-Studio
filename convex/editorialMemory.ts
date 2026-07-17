import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import { genreValidator } from "./lib/validators";

export const getSummary = internalQuery({
  args: {
    userId: v.id("users"),
    genre: genreValidator,
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const decisions = await ctx.db
      .query("editorialDecisions")
      .withIndex("by_user_genre_created", (queryBuilder) =>
        queryBuilder.eq("userId", args.userId).eq("genre", args.genre),
      )
      .order("desc")
      .take(50);
    if (decisions.length < 10) return null;

    const accepted = decisions.filter(
      (decision) => decision.decision === "accepted",
    );
    const rejected = decisions.filter(
      (decision) => decision.decision === "rejected",
    );
    const examples = [
      ...accepted.slice(0, 4).map(
        (decision) =>
          `ACCEPTED: ${decision.revisedText.slice(0, 500)}\nCriteria: ${decision.criterionIds.join(", ")}`,
      ),
      ...rejected.slice(0, 4).map(
        (decision) =>
          `REJECTED REWRITE: ${decision.revisedText.slice(0, 350)}\nPREFERRED ORIGINAL: ${decision.originalText.slice(0, 350)}\nCriteria: ${decision.criterionIds.join(", ")}`,
      ),
    ];
    return `Across ${decisions.length} prior edit decisions in this genre, the writer accepted ${accepted.length} and rejected ${rejected.length}.

RECENT PREFERENCE EXAMPLES
${examples.join("\n\n")}`;
  },
});

export const getSummaryByToken = internalQuery({
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
    const decisions = await ctx.db
      .query("editorialDecisions")
      .withIndex("by_user_genre_created", (queryBuilder) =>
        queryBuilder.eq("userId", user._id).eq("genre", args.genre),
      )
      .order("desc")
      .take(50);
    if (decisions.length < 10) return null;
    const accepted = decisions.filter(
      (decision) => decision.decision === "accepted",
    );
    const rejected = decisions.filter(
      (decision) => decision.decision === "rejected",
    );
    return `The writer accepted ${accepted.length} and rejected ${rejected.length} of their last ${decisions.length} edit decisions in this genre.

ACCEPTED EXAMPLES
${accepted
  .slice(0, 4)
  .map((decision) => decision.revisedText.slice(0, 500))
  .join("\n---\n")}

REJECTED REWRITES AND PREFERRED ORIGINALS
${rejected
  .slice(0, 4)
  .map(
    (decision) =>
      `Rejected: ${decision.revisedText.slice(0, 350)}\nPreferred: ${decision.originalText.slice(0, 350)}`,
  )
  .join("\n---\n")}`;
  },
});
