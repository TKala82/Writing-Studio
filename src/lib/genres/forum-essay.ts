import type { GenreRubric } from "./types";

export const forumEssayRubric: GenreRubric = {
  id: "forum-essay",
  name: "Forum or opinion essay",
  shortName: "Forum essay",
  description:
    "A rigorous, legible argument for an expert online community such as the EA Forum or LessWrong.",
  icon: "file",
  accent: "Make one contestable claim useful to thoughtful readers",
  length: {
    minWords: 800,
    maxWords: 3_500,
    targetGradeMin: 10,
    targetGradeMax: 13,
  },
  systemPrompt: `Edit this forum essay for intellectually serious online readers. State the central claim early,
separate evidence from interpretation, steelman the strongest objection, and expose uncertainty rather than
performing confidence. Use headings only when they clarify the argument. Preserve technical nuance and the
author's actual judgment. Do not imitate community jargon or manufacture novelty.`,
  criteria: [
    { id: "thesis", label: "Thesis is contestable", description: "The essay makes one clear claim readers can evaluate.", kind: "judgment", weight: 3 },
    { id: "argument", label: "Reasoning is inspectable", description: "Evidence, assumptions, and inference are distinguishable.", kind: "judgment", weight: 3 },
    { id: "objections", label: "Strong objections are addressed", description: "The essay engages the best counterargument without caricature.", kind: "judgment", weight: 2 },
    { id: "usefulness", label: "Reader value is concrete", description: "The conclusion changes a decision, belief, or research question.", kind: "judgment", weight: 2 },
    { id: "word-count", label: "Length serves the claim", description: "The essay earns its length.", kind: "measurable", check: "word-count", weight: 1 },
    { id: "readability", label: "Technical prose remains legible", description: "Complexity comes from the idea, not the sentence.", kind: "measurable", check: "readability", weight: 1 },
    { id: "anti-slop", label: "No synthetic thought-leadership", description: "Avoids inflated framing and generic insight language.", kind: "measurable", check: "banned-phrases", weight: 2 },
  ],
  preferredPatterns: [
    "claim → evidence → implication → objection → update",
    "observation → model → prediction",
  ],
  discouragedPatterns: [
    "announcing that a topic is important without a claim",
    "community jargon used as a substitute for reasoning",
    "burying the thesis after a long preamble",
  ],
};
