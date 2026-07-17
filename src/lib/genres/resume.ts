import type { GenreRubric } from "./types";

export const resumeRubric: GenreRubric = {
  id: "resume",
  name: "CV & resume",
  shortName: "CV / Resume",
  description:
    "Achievement-led, ATS-safe experience that makes relevance easy to scan.",
  icon: "file",
  accent: "Turn responsibilities into credible evidence",
  length: {
    minWords: 200,
    maxWords: 750,
    targetGradeMin: 8,
    targetGradeMax: 11,
  },
  systemPrompt: `Edit this CV or resume for a hiring manager and an applicant tracking system.
Preserve chronology, employers, titles, dates, tools, metrics, and scope exactly. Rewrite experience bullets
with an action-context-result structure, using the XYZ pattern when the source supports it: accomplished X,
measured by Y, by doing Z. Start bullets with varied, accurate action verbs. Prioritise relevance and proof
over exhaustive duties. Never invent metrics or elevate ownership beyond the source. Use [ADD: ...] when a
quantified result or missing context would materially strengthen a bullet.`,
  criteria: [
    {
      id: "impact-bullets",
      label: "Bullets show impact",
      description:
        "Each substantial bullet connects an action to context and a result.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "credible-scope",
      label: "Scope remains credible",
      description:
        "Verb strength, seniority, and ownership match the source experience.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "role-relevance",
      label: "Evidence is role-relevant",
      description:
        "The most relevant capabilities and outcomes receive the strongest emphasis.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "ats-language",
      label: "ATS-safe language",
      description:
        "Uses plain headings, standard terminology, and searchable skill names.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "word-count",
      label: "Concise document length",
      description: "The CV stays within a focused one-to-two-page word range.",
      kind: "measurable",
      check: "word-count",
      weight: 1,
    },
    {
      id: "anti-slop",
      label: "No inflated resume clichés",
      description:
        "Avoids responsible for, results-driven, spearheaded-by-default, and empty adjectives.",
      kind: "measurable",
      check: "banned-phrases",
      weight: 2,
    },
    {
      id: "sentence-variance",
      label: "Bullet openings stay varied",
      description: "Bullets do not repeat one template or cadence throughout.",
      kind: "measurable",
      check: "sentence-variance",
      weight: 1,
    },
  ],
  preferredPatterns: [
    "action + scope + result",
    "improved X by Y through Z",
    "built or delivered X for Y, resulting in Z",
  ],
  discouragedPatterns: [
    "Responsible for",
    "Helped with",
    "Results-driven professional",
    "Spearheaded every bullet",
    "unverifiable round-number metrics",
  ],
};
