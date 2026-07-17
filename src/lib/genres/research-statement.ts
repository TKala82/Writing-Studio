import type { GenreRubric } from "./types";

export const researchStatementRubric: GenreRubric = {
  id: "research-statement",
  name: "Research statement or statement of purpose",
  shortName: "Research statement",
  description:
    "A coherent account of past work, current questions, and a tractable research trajectory.",
  icon: "file",
  accent: "Turn broad interests into a credible programme of work",
  length: {
    minWords: 700,
    maxWords: 1_800,
    targetGradeMin: 10,
    targetGradeMax: 13,
  },
  systemPrompt: `Edit this research statement as a research mentor and selection reader. Build a coherent
trajectory from concrete prior work to current questions and next experiments. Distinguish established results,
tentative hypotheses, and future plans. Show methodological judgment and why the questions are tractable.
Never inflate contribution, certainty, authorship, or technical depth.`,
  criteria: [
    { id: "trajectory", label: "Research trajectory is coherent", description: "Past work leads credibly to present questions and next steps.", kind: "judgment", weight: 3 },
    { id: "questions", label: "Questions are precise", description: "The statement names tractable questions rather than fields of interest.", kind: "judgment", weight: 3 },
    { id: "method", label: "Methods fit the questions", description: "Proposed approaches show practical research judgment.", kind: "judgment", weight: 2 },
    { id: "calibration", label: "Claims are calibrated", description: "Results, hypotheses, and aspirations are clearly distinguished.", kind: "judgment", weight: 2 },
    { id: "word-count", label: "Fits a research statement", description: "The arc is complete without becoming a survey.", kind: "measurable", check: "word-count", weight: 1 },
    { id: "readability", label: "Expert-readable", description: "Technical specificity remains easy to follow.", kind: "measurable", check: "readability", weight: 1 },
    { id: "anti-slop", label: "No generic research aspiration", description: "Every ambition is tied to evidence or a question.", kind: "measurable", check: "banned-phrases", weight: 2 },
  ],
  preferredPatterns: [
    "prior result → unresolved question → proposed method",
    "observation → hypothesis → discriminating test",
  ],
  discouragedPatterns: [
    "listing topics without a through-line",
    "claiming impact without a result",
    "presenting uncertainty as weakness",
  ],
};
