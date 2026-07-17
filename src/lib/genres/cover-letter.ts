import type { GenreRubric } from "./types";

export const coverLetterRubric: GenreRubric = {
  id: "cover-letter",
  name: "Cover letter",
  shortName: "Cover letter",
  description:
    "A concise bridge between your strongest evidence and one role's needs.",
  icon: "letter",
  accent: "Connect evidence to a real organisational need",
  length: {
    minWords: 220,
    maxWords: 350,
    targetGradeMin: 8,
    targetGradeMax: 11,
  },
  systemPrompt: `Edit this cover letter as a selective hiring editor. Open with a direct,
specific reason for interest rather than a ceremonial application phrase. Build the body around one or two
evidence-rich examples that connect the candidate's experience to the role's actual needs. Do not repeat the
resume line by line. Keep the tone warm, precise, and confident without exaggeration. End with a brief,
forward-looking close. Preserve every fact and use [ADD: ...] for missing role or organisation details rather
than inventing them.`,
  criteria: [
    {
      id: "specific-opening",
      label: "Opening earns attention",
      description:
        "Names the role or problem and gives a specific reason for the connection.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "evidence-bridge",
      label: "Evidence maps to the role",
      description:
        "One or two past examples clearly address the employer's likely needs.",
      kind: "judgment",
      weight: 3,
    },
    {
      id: "not-resume-repeat",
      label: "Adds narrative value",
      description:
        "Explains significance and fit instead of re-listing resume bullets.",
      kind: "judgment",
      weight: 2,
    },
    {
      id: "confident-close",
      label: "Close is direct and human",
      description:
        "Ends with a credible next step without pleading or boilerplate.",
      kind: "judgment",
      weight: 1,
    },
    {
      id: "word-count",
      label: "Under 350 words",
      description: "The letter is brief enough for a first-pass hiring review.",
      kind: "measurable",
      check: "word-count",
      weight: 2,
    },
    {
      id: "anti-slop",
      label: "No cover-letter boilerplate",
      description:
        "Avoids keen interest, perfect fit, dynamic team, and other low-signal phrases.",
      kind: "measurable",
      check: "banned-phrases",
      weight: 2,
    },
    {
      id: "readability",
      label: "Easy to read aloud",
      description: "The prose is clear, varied, and conversationally professional.",
      kind: "measurable",
      check: "readability",
      weight: 1,
    },
  ],
  preferredPatterns: [
    "specific role need → relevant evidence → resulting capability",
    "why this role now → proof of fit → useful next contribution",
  ],
  discouragedPatterns: [
    "I am writing to express my keen interest",
    "I believe I am the perfect fit",
    "Please find my resume attached",
    "I would be honoured to join your dynamic team",
  ],
};
