import type { GenreRubric } from "./types";

export const socialThreadRubric: GenreRubric = {
  id: "social-thread",
  name: "X or LinkedIn thread",
  shortName: "Social thread",
  description:
    "A sequenced social argument where every post advances one coherent idea.",
  icon: "megaphone",
  accent: "Create momentum without manufacturing suspense",
  length: {
    minWords: 120,
    maxWords: 900,
    targetGradeMin: 6,
    targetGradeMax: 9,
  },
  systemPrompt: `Edit this social thread for intelligent, fast-scanning readers. The first post must contain a
real insight or tension. Give each subsequent post one job and make the sequence cumulative. Use numbering only
when it helps navigation. Preserve nuance while keeping each unit self-contained enough to share. Do not use
engagement bait, fake suspense, listicle padding, or repeated mini-conclusions.`,
  criteria: [
    { id: "hook", label: "Opening contains the idea", description: "The first post offers value without withholding the point.", kind: "judgment", weight: 3 },
    { id: "sequence", label: "Sequence compounds", description: "Each post advances the same argument in a necessary order.", kind: "judgment", weight: 3 },
    { id: "units", label: "Posts are individually legible", description: "Each unit has one job and enough context.", kind: "judgment", weight: 2 },
    { id: "ending", label: "Ending earns the close", description: "The thread closes on implication or a genuine next step.", kind: "judgment", weight: 1 },
    { id: "word-count", label: "Thread remains proportional", description: "The sequence is no longer than the idea requires.", kind: "measurable", check: "word-count", weight: 1 },
    { id: "sentence-variance", label: "Cadence remains human", description: "The thread avoids repetitive one-line beats.", kind: "measurable", check: "sentence-variance", weight: 2 },
    { id: "anti-slop", label: "No thread templates", description: "Avoids hooks and cliffhangers that manufacture importance.", kind: "measurable", check: "banned-phrases", weight: 2 },
  ],
  preferredPatterns: [
    "insight → evidence → complication → implication",
    "observation → mechanism → practical update",
  ],
  discouragedPatterns: [
    "A thread 🧵",
    "You won't believe the last point",
    "numbered filler that restates one idea",
  ],
};
