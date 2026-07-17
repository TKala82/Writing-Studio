import { analyze } from "textlens";

import type { GenreRubric } from "../genres";

const GLOBAL_AI_TELLS = [
  "delve",
  "tapestry",
  "in today's rapidly evolving",
  "in today's fast-paced",
  "it's not just",
  "it is not just",
  "let that sink in",
  "game-changer",
  "testament to",
  "unlock the power",
  "navigate the complexities",
] as const;

const NEGATIVE_PARALLELISM =
  /\b(?:it'?s|this is|we are|i am)\s+not\s+(?:just\s+)?[^.!?]{2,70}[—,:;]\s*(?:it'?s|this is|we are|i am)\s+/gi;

export interface CheckFinding {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface TextMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readingTimeSeconds: number;
  readabilityGrade: number;
  averageSentenceWords: number;
  sentenceLengthDeviation: number;
  passiveVoiceEstimate: number;
  bannedPhraseCount: number;
}

export interface CheckResult {
  metrics: TextMetrics;
  findings: CheckFinding[];
  bannedPhrases: string[];
}

function getSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+(?=[A-Z•*-])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    values.length;
  return Math.sqrt(variance);
}

function estimatePassiveVoice(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  const passivePattern =
    /\b(?:am|are|is|was|were|be|been|being)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/i;
  const passiveCount = sentences.filter((sentence) =>
    passivePattern.test(sentence),
  ).length;
  return Math.round((passiveCount / sentences.length) * 100);
}

function findBannedPhrases(text: string, rubric: GenreRubric): string[] {
  const lowerText = text.toLowerCase();
  const phraseMatches = [...GLOBAL_AI_TELLS, ...rubric.discouragedPatterns]
    .filter((phrase) => lowerText.includes(phrase.toLowerCase()))
    .map((phrase) => phrase.toLowerCase());
  if (NEGATIVE_PARALLELISM.test(text)) {
    phraseMatches.push("negative parallelism: “not X — it’s Y”");
  }
  NEGATIVE_PARALLELISM.lastIndex = 0;
  return [...new Set(phraseMatches)];
}

export function runDeterministicChecks(
  text: string,
  rubric: GenreRubric,
): CheckResult {
  const report = analyze(text);
  const sentences = getSentences(text);
  const sentenceLengths = sentences.map(
    (sentence) => sentence.split(/\s+/).filter(Boolean).length,
  );
  const sentenceLengthDeviation = standardDeviation(sentenceLengths);
  const bannedPhrases = findBannedPhrases(text, rubric);
  const { minWords, maxWords, targetGradeMin, targetGradeMax } = rubric.length;
  const wordCount = report.statistics.words;
  const readabilityGrade = Number(
    report.readability.consensusGrade.toFixed(1),
  );

  const metrics: TextMetrics = {
    wordCount,
    sentenceCount: report.statistics.sentences,
    paragraphCount: report.statistics.paragraphs,
    readingTimeSeconds: report.readingTime.seconds,
    readabilityGrade,
    averageSentenceWords: Number(
      report.statistics.avgSentenceLength.toFixed(1),
    ),
    sentenceLengthDeviation: Number(sentenceLengthDeviation.toFixed(1)),
    passiveVoiceEstimate: estimatePassiveVoice(sentences),
    bannedPhraseCount: bannedPhrases.length,
  };

  return {
    metrics,
    bannedPhrases,
    findings: [
      {
        id: "word-count",
        label: "Word count",
        passed: wordCount >= minWords && wordCount <= maxWords,
        detail: `${wordCount} words · target ${minWords}–${maxWords}`,
      },
      {
        id: "readability",
        label: "Readability",
        passed:
          readabilityGrade >= targetGradeMin &&
          readabilityGrade <= targetGradeMax,
        detail: `Grade ${readabilityGrade} · target ${targetGradeMin}–${targetGradeMax}`,
      },
      {
        id: "banned-phrases",
        label: "Original language",
        passed: bannedPhrases.length === 0,
        detail:
          bannedPhrases.length === 0
            ? "No stock AI phrases detected"
            : `${bannedPhrases.length} stock phrase${bannedPhrases.length === 1 ? "" : "s"} detected`,
      },
      {
        id: "sentence-variance",
        label: "Sentence rhythm",
        passed: sentences.length < 4 || sentenceLengthDeviation >= 4,
        detail: `Length variation ${sentenceLengthDeviation.toFixed(1)} · target ≥ 4.0`,
      },
    ],
  };
}
