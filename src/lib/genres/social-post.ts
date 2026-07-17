import type { GenreRubric } from "./types";

export const socialPostRubric: GenreRubric = {
  id: "social-post",
  name: "Social media post",
  shortName: "Social post",
  description:
    "A platform-aware post with an honest hook and one memorable point.",
  icon: "megaphone",
  accent: "Earn attention without manufacturing hype",
  length: {
    minWords: 45,
    maxWords: 300,
    targetGradeMin: 6,
    targetGradeMax: 9,
  },
  systemPrompt: `Edit this social post for a professional, intelligent audience. Put the
clearest value or tension in the first two lines before the platform cutoff. Develop one central idea with
specific details and generous whitespace. Preserve the author's natural level of formality, humour, and
first-person voice. End naturally; use a call to action only when the source has a real one. Do not manufacture
controversy, lessons, vulnerability, or certainty. Avoid listicle cadence, engagement bait, and generic
thought-leadership templates.`,
  criteria: [
    {
      id: "hook",
      label: "Hook contains real value",
      description:
        "The first two lines offer a concrete observation, tension, or useful promise.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "single-idea",
      label: "One idea leads",
      description:
        "Every paragraph develops the same central point instead of stacking unrelated tips.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "platform-tone",
      label: "Tone fits the platform",
      description:
        "Professional but conversational, with specificity instead of performance.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "natural-ending",
      label: "Ending feels earned",
      description:
        "The post closes on the insight or a genuine invitation, not engagement bait.",
      kind: "judgment",
      weight: 1,
    },
    {
      id: "word-count",
      label: "Fits a social reading window",
      description: "The post stays concise enough for its intended platform.",
      kind: "measurable",
      check: "word-count",
      weight: 1,
    },
    {
      id: "sentence-variance",
      label: "Cadence sounds human",
      description: "Sentence lengths vary and do not fall into repetitive one-line beats.",
      kind: "measurable",
      check: "sentence-variance",
      weight: 2,
    },
    {
      id: "anti-slop",
      label: "No thought-leadership templates",
      description:
        "Avoids negative parallelism, fake revelations, stacked tricolons, and generic hype.",
      kind: "measurable",
      check: "banned-phrases",
      weight: 2,
    },
    {
      id: "readability",
      label: "Readable at a glance",
      description: "Short paragraphs and plain language support fast scanning.",
      kind: "measurable",
      check: "readability",
      weight: 1,
    },
  ],
  preferredPatterns: [
    "specific observation → why it matters → implication",
    "brief story → concrete lesson",
    "useful point → evidence → honest question",
  ],
  discouragedPatterns: [
    "It's not X — it's Y",
    "Here's the thing",
    "Let that sink in",
    "Agree?",
    "Three lessons that changed everything",
  ],
};
