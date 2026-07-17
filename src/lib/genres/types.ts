export const genreIds = [
  "motivation-statement",
  "resume",
  "cover-letter",
  "social-post",
  "forum-essay",
  "research-statement",
  "outreach-email",
  "policy-brief",
  "social-thread",
] as const;

export type GenreId = (typeof genreIds)[number];

export type CriterionKind = "measurable" | "judgment";

export interface GenreCriterion {
  id: string;
  label: string;
  description: string;
  kind: CriterionKind;
  check?: "word-count" | "readability" | "banned-phrases" | "sentence-variance";
  weight: number;
}

export interface GenreRubric {
  id: GenreId;
  name: string;
  shortName: string;
  description: string;
  icon: "spark" | "file" | "letter" | "megaphone";
  accent: string;
  length: {
    minWords: number;
    maxWords: number;
    targetGradeMin: number;
    targetGradeMax: number;
  };
  systemPrompt: string;
  criteria: readonly GenreCriterion[];
  preferredPatterns: readonly string[];
  discouragedPatterns: readonly string[];
}
