import type { GenreRubric } from "./types";

export const motivationStatementRubric: GenreRubric = {
  id: "motivation-statement",
  name: "Fellowship & motivation statement",
  shortName: "Motivation",
  description:
    "A specific, evidence-led case for why this programme and why you.",
  icon: "spark",
  accent: "Signal fit, agency, and credible potential",
  length: {
    minWords: 350,
    maxWords: 800,
    targetGradeMin: 9,
    targetGradeMax: 12,
  },
  systemPrompt: `Edit this fellowship or programme motivation statement as a rigorous admissions editor.
Lead with the applicant's strongest, most specific reason for selection. Build a clear arc from past evidence,
through present motivation, to a credible programme-specific future. Preserve the applicant's genuine voice
and all factual claims. Prefer visible proof over self-description. Signal independent thinking, comfort with
ambiguity, and informed fit without name-dropping. Replace generic assertions with placeholders when the
source lacks supporting evidence. Never invent credentials, metrics, publications, or programme details.`,
  criteria: [
    {
      id: "front-loaded-case",
      label: "Strongest case appears first",
      description:
        "The opening quickly gives the reviewer a concrete reason to keep reading.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "specificity",
      label: "Passes the Any Applicant test",
      description:
        "Core claims contain lived details and could not be copied into most applications.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "evidence",
      label: "Claims are backed by evidence",
      description:
        "Motivation and ability are demonstrated through actions, work, or outcomes.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "programme-fit",
      label: "Programme fit is precise",
      description:
        "The statement connects specific programme opportunities to a credible next step.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "agency",
      label: "Signals agency and autonomy",
      description:
        "The applicant sounds ready to navigate an open-ended problem, not wait for a syllabus.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "word-count",
      label: "Respects the application limit",
      description: "The argument is dense but remains within the genre's word range.",
      kind: "measurable",
      check: "word-count",
      weight: 1,
    },
    {
      id: "anti-slop",
      label: "Free of generic AI phrasing",
      description: "No inflated openings, empty passion claims, or stock transitions.",
      kind: "measurable",
      check: "banned-phrases",
      weight: 2,
    },
    {
      id: "readability",
      label: "Clear under time pressure",
      description: "Sentence complexity suits an expert reviewer reading quickly.",
      kind: "measurable",
      check: "readability",
      weight: 1,
    },
  ],
  preferredPatterns: [
    "specific observation → action → learning",
    "past evidence → current question → programme fit → next contribution",
    "concrete research direction with calibrated uncertainty",
  ],
  discouragedPatterns: [
    "I have always been passionate about",
    "In today's rapidly evolving technological landscape",
    "This prestigious programme would be a dream come true",
    "claims of fast learning without an example",
  ],
};
