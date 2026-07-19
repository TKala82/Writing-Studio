import { z } from "zod";

export const genreIdSchema = z.enum([
  "motivation-statement",
  "resume",
  "cover-letter",
  "social-post",
  "forum-essay",
  "research-statement",
  "outreach-email",
  "policy-brief",
  "social-thread",
]);

export const analysisSchema = z.object({
  facts: z.array(
    z.object({
      id: z.string().max(100),
      claim: z.string().max(2_000),
      sourceText: z.string().max(2_000),
      sourceId: z.string().max(200).optional(),
      sourceTitle: z.string().max(300).optional(),
    }),
  ).max(80),
  voiceSpec: z.object({
    tone: z.string().max(500),
    formality: z.string().max(500),
    perspective: z.string().max(500),
    sentenceStyle: z.string().max(1_000),
    distinctiveTraits: z.array(z.string().max(500)).max(12),
    preserve: z.array(z.string().max(500)).max(12),
  }),
  proposedChanges: z.array(
    z.object({
      summary: z.string().max(500),
      reason: z.string().max(2_000),
      location: z.string().max(500),
    }),
  ).max(30),
});

export const rewriteSchema = z.object({
  rewrittenText: z.string().max(40_000),
  changeLog: z.array(
    z.object({
      summary: z.string().max(500),
      reason: z.string().max(2_000),
      location: z.string().max(500),
    }),
  ).max(30),
});

export const critiqueSchema = z.object({
  criteria: z.array(
    z.object({
      criterionId: z.string().max(100),
      label: z.string().max(300),
      score: z.number().min(1).max(4),
      passed: z.boolean(),
      rationale: z.string().max(2_000),
      suggestion: z.string().max(2_000).optional(),
    }),
  ).max(20),
  unsupportedClaims: z.array(z.string().max(2_000)).max(20),
  revisionInstructions: z.array(z.string().max(2_000)).max(20),
});

export const finalRevisionSchema = z.object({
  finalText: z.string().max(40_000),
  changeLog: z.array(
    z.object({
      summary: z.string().max(500),
      reason: z.string().max(2_000),
      location: z.string().max(500),
    }),
  ).max(30),
});

export const selectionRewriteSchema = z.object({
  options: z
    .array(
      z.object({
        rewrittenSelection: z.string().max(8_000),
        label: z.string().max(100),
      }),
    )
    .min(2)
    .max(3),
  explanation: z.string().max(2_000),
});

export const legalLensSchema = z.object({
  applicable: z
    .array(
      z.object({
        regimeId: z.enum([
          "popia",
          "cpa",
          "gift-cards",
          "loyalty-rewards",
          "crypto-stablecoins",
          "king-governance",
          "eu-ai-act",
        ]),
        confidence: z.enum(["high", "medium", "low"]),
        whyItApplies: z.string().max(2_000),
        relevantProvisions: z.array(z.string().max(1_000)).min(1).max(4),
        riskFlags: z.array(z.string().max(1_000)).max(4),
        suggestedRewording: z.string().max(8_000).optional(),
      }),
    )
    .max(5),
  notApplicable: z
    .array(
      z.object({
        regimeId: z.enum([
          "popia",
          "cpa",
          "gift-cards",
          "loyalty-rewards",
          "crypto-stablecoins",
          "king-governance",
          "eu-ai-act",
        ]),
        reason: z.string().max(1_000),
      }),
    )
    .max(7),
  overallNote: z.string().max(2_000),
});

export const deliveryBriefingSchema = z.object({
  openingLine: z.string().max(2_000),
  closingLine: z.string().max(2_000),
  talkingPoints: z
    .array(
      z.object({
        point: z.string().max(2_000),
        evidence: z.string().max(2_000),
        deliveryCue: z.string().max(1_000),
      }),
    )
    .min(3)
    .max(7),
  likelyQuestions: z
    .array(
      z.object({
        question: z.string().max(1_000),
        response: z.string().max(3_000),
        sourceFactIds: z.array(z.string().max(200)).max(12),
      }),
    )
    .min(3)
    .max(8),
  bestPractices: z.array(z.string().max(1_000)).min(3).max(8),
  pitfalls: z.array(z.string().max(1_000)).min(2).max(6),
});

export const practiceReplySchema = z.object({
  message: z.string().min(1).max(2_000),
});

export const practiceFeedbackSchema = z.object({
  summary: z.string().max(3_000),
  criteria: z
    .array(
      z.object({
        criterionId: z.string().max(100),
        label: z.string().max(300),
        score: z.number().min(1).max(5),
        rationale: z.string().max(2_000),
        nextStep: z.string().max(2_000),
      }),
    )
    .min(4)
    .max(6),
  strongestMoment: z.object({
    quote: z.string().max(1_000),
    observation: z.string().max(2_000),
  }),
  weakestMoment: z.object({
    quote: z.string().max(1_000),
    observation: z.string().max(2_000),
  }),
  drills: z.array(z.string().max(1_000)).min(2).max(3),
});

export const sourceAnalysisSchema = z.object({
  title: z.string().max(200),
  summary: z.string().max(6_000),
  themes: z.array(z.string().max(200)).max(8),
  facts: z
    .array(
      z.object({
        id: z.string().max(100),
        claim: z.string().max(2_000),
        sourceText: z.string().max(2_000),
      }),
    )
    .max(80),
});

export const sourceAnglesSchema = z.object({
  angles: z
    .array(
      z.object({
        id: z.string().max(200),
        title: z.string().max(200),
        thesis: z.string().max(2_000),
        rationale: z.string().max(2_000),
        genre: z.enum([
          "motivation-statement",
          "resume",
          "cover-letter",
          "social-post",
          "forum-essay",
          "research-statement",
          "outreach-email",
          "policy-brief",
          "social-thread",
        ]),
        purpose: z.string().max(500),
        outline: z.array(z.string().max(1_000)).min(2).max(6),
        factIds: z.array(z.string().max(200)).min(1).max(12),
      }),
    )
    .min(3)
    .max(4),
});

export const groundedDraftSchema = z.object({
  title: z.string().max(200),
  draft: z.string().max(40_000),
  factIdsUsed: z.array(z.string().max(200)).max(80),
});

export const ideationInterviewSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().max(100),
        question: z.string().max(1_000),
        whyItMatters: z.string().max(2_000),
        answerHint: z.string().max(1_000),
      }),
    )
    .min(4)
    .max(6)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Question ids must be unique",
    ),
  directions: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(300),
        approach: z.string().max(2_000),
        openingDirection: z.string().max(2_000),
      }),
    )
    .min(2)
    .max(3)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Direction ids must be unique",
    ),
});

export const interviewFactsSchema = z.object({
  facts: z
    .array(
      z.object({
        id: z.string().max(100),
        claim: z.string().max(2_000),
        sourceText: z.string().max(2_000),
      }),
    )
    .min(1)
    .max(40),
});

export const preflightSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().max(100),
        question: z.string().max(1_000),
        whyItMatters: z.string().max(2_000),
        answerHint: z.string().max(1_000),
      }),
    )
    .min(2)
    .max(4),
  blindSpots: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(500),
        whyItMatters: z.string().max(2_000),
        criterionId: z.string().max(100).optional(),
      }),
    )
    .max(6),
  variants: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(300),
        approach: z.string().max(2_000),
        openingDirection: z.string().max(2_000),
      }),
    )
    .min(2)
    .max(3),
});

export const voiceProfileSchema = z.object({
  tone: z.string().max(500),
  formality: z.string().max(500),
  perspective: z.string().max(500),
  sentenceStyle: z.string().max(1_000),
  distinctiveTraits: z.array(z.string().max(500)).max(12),
  preserve: z.array(z.string().max(500)).max(12),
});

export const genreDetectionSchema = z.object({
  genre: genreIdSchema,
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string().max(1_000),
});

export const customRubricSchema = z.object({
  name: z.string().max(80),
  description: z.string().max(500),
  baseGenre: genreIdSchema,
  accent: z.string().max(200),
  systemPrompt: z.string().max(6_000),
  length: z.object({
    minWords: z.number().int().min(20).max(20_000),
    maxWords: z.number().int().min(50).max(8_000),
    targetGradeMin: z.number().min(1).max(18),
    targetGradeMax: z.number().min(1).max(20),
  }),
  criteria: z
    .array(
      z.object({
        id: z.string().max(100),
        label: z.string().max(300),
        description: z.string().max(2_000),
        kind: z.enum(["measurable", "judgment"]),
        check: z
          .enum([
            "word-count",
            "readability",
            "banned-phrases",
            "sentence-variance",
          ])
          .optional(),
        weight: z.number().min(1).max(3),
      }),
    )
    .min(4)
    .max(10),
  preferredPatterns: z.array(z.string().max(1_000)).min(1).max(8),
  discouragedPatterns: z.array(z.string().max(1_000)).min(1).max(8),
});

export const playbookDistillationSchema = z.object({
  title: z.string().min(3).max(120),
  genres: z.array(genreIdSchema).max(9),
  appliesToAll: z.boolean(),
  tips: z
    .array(
      z.object({
        kind: z.enum(["do", "avoid"]),
        text: z.string().min(10).max(500),
      }),
    )
    .min(1)
    .max(12),
});

export const librarianIndexSchema = z.object({
  summary: z.string().min(1).max(600),
  topics: z.array(z.string().min(1).max(80)).min(1).max(8),
  keyPassages: z
    .array(
      z.object({
        text: z.string().min(20).max(2_000),
        whyReusable: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(4),
});

export const librarianSuggestionsSchema = z.object({
  suggestions: z
    .array(
      z.object({
        documentId: z.string().min(1).max(200),
        passage: z.string().min(20).max(2_000),
        whyRelevant: z.string().min(1).max(500),
        howToAdapt: z.string().min(1).max(500),
      }),
    )
    .max(5),
});

export type AnalysisOutput = z.infer<typeof analysisSchema>;
export type RewriteOutput = z.infer<typeof rewriteSchema>;
export type CritiqueOutput = z.infer<typeof critiqueSchema>;
export type SourceAnglesOutput = z.infer<typeof sourceAnglesSchema>;
export type IdeationInterviewOutput = z.infer<typeof ideationInterviewSchema>;
export type DeliveryBriefingOutput = z.infer<typeof deliveryBriefingSchema>;
export type PracticeFeedbackOutput = z.infer<typeof practiceFeedbackSchema>;
export type LibrarianIndexOutput = z.infer<typeof librarianIndexSchema>;
export type PlaybookDistillationOutput = z.infer<
  typeof playbookDistillationSchema
>;
