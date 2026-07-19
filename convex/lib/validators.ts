import { v } from "convex/values";

export const genreValidator = v.union(
  v.literal("motivation-statement"),
  v.literal("resume"),
  v.literal("cover-letter"),
  v.literal("social-post"),
  v.literal("forum-essay"),
  v.literal("research-statement"),
  v.literal("outreach-email"),
  v.literal("policy-brief"),
  v.literal("social-thread"),
);

export const playbookTipValidator = v.object({
  kind: v.union(v.literal("do"), v.literal("avoid")),
  text: v.string(),
});

export const playbookStatusValidator = v.union(
  v.literal("active"),
  v.literal("archived"),
);

export const deliveryFormatValidator = v.union(
  v.literal("video-call"),
  v.literal("presentation-panel"),
  v.literal("negotiation"),
  v.literal("cold-call"),
  v.literal("async-posting"),
);

export const aiOperationValidator = v.union(
  v.literal("ideation-interview"),
  v.literal("ideation-compose"),
  v.literal("delivery-briefing"),
  v.literal("practice-start"),
  v.literal("practice-reply"),
  v.literal("practice-finish"),
  v.literal("library-index"),
  v.literal("library-suggest"),
  v.literal("preflight"),
  v.literal("pipeline-run"),
  v.literal("detect-genre"),
  v.literal("rewrite-selection"),
  v.literal("source-ingest"),
  v.literal("source-suggest"),
  v.literal("source-compose"),
  v.literal("legal-lens"),
  v.literal("derive-rubric"),
  v.literal("voice-sample"),
  v.literal("distill-playbook"),
);

export const shipProgressValidator = v.object({
  readinessCheckedAt: v.optional(v.number()),
  deliveryOpenedAt: v.optional(v.number()),
  deliveryBriefingId: v.optional(v.id("deliveryBriefings")),
  practiceCompletedAt: v.optional(v.number()),
  savedAt: v.optional(v.number()),
});

export const preflightAnswerValidator = v.object({
  questionId: v.string(),
  question: v.string(),
  answer: v.string(),
});

export const preflightSessionStatusValidator = v.union(
  v.literal("open"),
  v.literal("continued"),
  v.literal("cancelled"),
  v.literal("error"),
);

export const libraryKeyPassageValidator = v.object({
  text: v.string(),
  whyReusable: v.string(),
});

export const deliveryBriefingValidator = v.object({
  openingLine: v.string(),
  closingLine: v.string(),
  talkingPoints: v.array(
    v.object({
      point: v.string(),
      evidence: v.string(),
      deliveryCue: v.string(),
    }),
  ),
  likelyQuestions: v.array(
    v.object({
      question: v.string(),
      response: v.string(),
      sourceFactIds: v.array(v.string()),
    }),
  ),
  bestPractices: v.array(v.string()),
  pitfalls: v.array(v.string()),
});

export const practiceDifficultyValidator = v.union(
  v.literal("supportive"),
  v.literal("standard"),
  v.literal("challenging"),
);

export const practiceStatusValidator = v.union(
  v.literal("starting"),
  v.literal("active"),
  v.literal("evaluating"),
  v.literal("complete"),
  v.literal("error"),
);

export const practiceMessageValidator = v.object({
  role: v.union(v.literal("user"), v.literal("coach")),
  text: v.string(),
  createdAt: v.number(),
});

export const practiceScenarioValidator = v.object({
  format: deliveryFormatValidator,
  persona: v.string(),
  difficulty: practiceDifficultyValidator,
});

export const practiceFeedbackValidator = v.object({
  summary: v.string(),
  criteria: v.array(
    v.object({
      criterionId: v.string(),
      label: v.string(),
      score: v.number(),
      rationale: v.string(),
      nextStep: v.string(),
    }),
  ),
  strongestMoment: v.object({
    quote: v.string(),
    observation: v.string(),
  }),
  weakestMoment: v.object({
    quote: v.string(),
    observation: v.string(),
  }),
  drills: v.array(v.string()),
});

export const ideationQuestionValidator = v.object({
  id: v.string(),
  question: v.string(),
  whyItMatters: v.string(),
  answerHint: v.string(),
});

export const ideationDirectionValidator = v.object({
  id: v.string(),
  label: v.string(),
  approach: v.string(),
  openingDirection: v.string(),
});

export const sourceKindValidator = v.union(
  v.literal("text"),
  v.literal("url"),
  v.literal("youtube"),
  v.literal("pdf"),
  v.literal("image"),
);

export const sourceStatusValidator = v.union(
  v.literal("queued"),
  v.literal("processing"),
  v.literal("ready"),
  v.literal("error"),
);

export const documentStatusValidator = v.union(
  v.literal("draft"),
  v.literal("queued"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("error"),
);

export const runStatusValidator = v.union(
  v.literal("queued"),
  v.literal("processing"),
  v.literal("complete"),
  v.literal("error"),
);

export const pipelineStageValidator = v.union(
  v.literal("queued"),
  v.literal("analyzing"),
  v.literal("proposing"),
  v.literal("rewriting"),
  v.literal("checking"),
  v.literal("critiquing"),
  v.literal("revising"),
  v.literal("complete"),
  v.literal("error"),
);

export const stepStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("complete"),
  v.literal("error"),
);

export const pipelineStepValidator = v.object({
  id: v.string(),
  label: v.string(),
  status: stepStatusValidator,
  insight: v.optional(v.string()),
});

export const factValidator = v.object({
  id: v.string(),
  claim: v.string(),
  sourceText: v.string(),
  sourceId: v.optional(v.string()),
  sourceTitle: v.optional(v.string()),
});

export const sourceFactValidator = v.object({
  id: v.string(),
  claim: v.string(),
  sourceText: v.string(),
});

export const voiceSpecValidator = v.object({
  tone: v.string(),
  formality: v.string(),
  perspective: v.string(),
  sentenceStyle: v.string(),
  distinctiveTraits: v.array(v.string()),
  preserve: v.array(v.string()),
});

export const blindSpotValidator = v.object({
  id: v.string(),
  label: v.string(),
  whyItMatters: v.string(),
  criterionId: v.optional(v.string()),
});

export const customCriterionValidator = v.object({
  id: v.string(),
  label: v.string(),
  description: v.string(),
  kind: v.union(v.literal("measurable"), v.literal("judgment")),
  check: v.optional(
    v.union(
      v.literal("word-count"),
      v.literal("readability"),
      v.literal("banned-phrases"),
      v.literal("sentence-variance"),
    ),
  ),
  weight: v.number(),
});

export const rubricLengthValidator = v.object({
  minWords: v.number(),
  maxWords: v.number(),
  targetGradeMin: v.number(),
  targetGradeMax: v.number(),
});

export const changeValidator = v.object({
  summary: v.string(),
  reason: v.string(),
  location: v.string(),
});

export const metricsValidator = v.object({
  wordCount: v.number(),
  sentenceCount: v.number(),
  paragraphCount: v.number(),
  readingTimeSeconds: v.number(),
  readabilityGrade: v.number(),
  averageSentenceWords: v.number(),
  sentenceLengthDeviation: v.number(),
  passiveVoiceEstimate: v.number(),
  bannedPhraseCount: v.number(),
});

export const deterministicFindingValidator = v.object({
  id: v.string(),
  label: v.string(),
  passed: v.boolean(),
  detail: v.string(),
});

export const critiqueValidator = v.object({
  criterionId: v.string(),
  label: v.string(),
  score: v.number(),
  passed: v.boolean(),
  rationale: v.string(),
  suggestion: v.optional(v.string()),
});
