import type { GenreRubric } from "./types";

export const policyBriefRubric: GenreRubric = {
  id: "policy-brief",
  name: "Policy brief",
  shortName: "Policy brief",
  description:
    "A decision-oriented brief connecting evidence, options, trade-offs, and an implementable recommendation.",
  icon: "file",
  accent: "Help a decision-maker act under real constraints",
  length: {
    minWords: 700,
    maxWords: 2_000,
    targetGradeMin: 9,
    targetGradeMax: 12,
  },
  systemPrompt: `Edit this policy brief for a time-constrained decision-maker. Lead with the decision and why it
matters now. Separate evidence, uncertainty, options, and recommendation. Compare realistic alternatives,
including implementation costs, affected stakeholders, and failure modes. Use plain language and scannable
structure. Never invent legal authority, statistics, institutional capacity, or consensus.`,
  criteria: [
    { id: "decision", label: "Decision is explicit", description: "The reader knows what decision the brief supports.", kind: "judgment", weight: 3 },
    { id: "evidence", label: "Evidence is decision-relevant", description: "Facts are tied to consequences, not merely summarised.", kind: "judgment", weight: 3 },
    { id: "options", label: "Options and trade-offs are real", description: "Alternatives are compared fairly under practical constraints.", kind: "judgment", weight: 2 },
    { id: "implementation", label: "Recommendation is implementable", description: "Owners, sequence, risks, and next steps are visible.", kind: "judgment", weight: 3 },
    { id: "word-count", label: "Fits a policy reading window", description: "The brief is dense and scannable.", kind: "measurable", check: "word-count", weight: 1 },
    { id: "readability", label: "Plain-language policy prose", description: "A non-specialist decision-maker can follow it.", kind: "measurable", check: "readability", weight: 2 },
    { id: "anti-slop", label: "No policy theatre", description: "Avoids vague calls for collaboration and innovation.", kind: "measurable", check: "banned-phrases", weight: 2 },
  ],
  preferredPatterns: [
    "decision → evidence → options → recommendation → implementation",
    "risk → affected stakeholder → mitigation",
  ],
  discouragedPatterns: [
    "background sections that delay the decision",
    "recommendations without an owner",
    "legal claims without authority",
  ],
};
