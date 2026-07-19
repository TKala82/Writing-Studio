import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  aiOperationValidator,
  blindSpotValidator,
  changeValidator,
  critiqueValidator,
  customCriterionValidator,
  deliveryBriefingValidator,
  deliveryFormatValidator,
  deterministicFindingValidator,
  documentStatusValidator,
  executionModeValidator,
  factValidator,
  genreValidator,
  ideationDirectionValidator,
  ideationQuestionValidator,
  libraryKeyPassageValidator,
  metricsValidator,
  pipelineErrorCodeValidator,
  pipelineStageValidator,
  pipelineStepValidator,
  playbookStatusValidator,
  playbookTipValidator,
  practiceFeedbackValidator,
  practiceMessageValidator,
  practiceScenarioValidator,
  practiceStatusValidator,
  preflightAnswerValidator,
  preflightSessionStatusValidator,
  runStatusValidator,
  rubricLengthValidator,
  shipProgressValidator,
  sourceFactValidator,
  sourceKindValidator,
  sourceStatusValidator,
  voiceSpecValidator,
} from "./lib/validators";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  documents: defineTable({
    userId: v.id("users"),
    title: v.string(),
    draft: v.string(),
    genre: genreValidator,
    customPurpose: v.optional(v.string()),
    customRubricId: v.optional(v.id("customRubrics")),
    writerContext: v.optional(v.string()),
    sourceIds: v.optional(v.array(v.id("sources"))),
    status: documentStatusValidator,
    acceptedText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_and_status", ["userId", "status"]),

  libraryEntries: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    genre: genreValidator,
    summary: v.string(),
    topics: v.array(v.string()),
    keyPassages: v.array(libraryKeyPassageValidator),
    fingerprint: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_and_genre", ["userId", "genre"])
    .index("by_document", ["documentId"]),

  runs: defineTable({
    documentId: v.id("documents"),
    userId: v.id("users"),
    status: runStatusValidator,
    stage: pipelineStageValidator,
    steps: v.array(pipelineStepValidator),
    factInventory: v.optional(v.array(factValidator)),
    voiceSpec: v.optional(voiceSpecValidator),
    blindSpots: v.optional(v.array(blindSpotValidator)),
    proposedChanges: v.optional(v.array(changeValidator)),
    streamingText: v.optional(v.string()),
    rewrittenText: v.optional(v.string()),
    finalText: v.optional(v.string()),
    changeLog: v.optional(v.array(changeValidator)),
    metrics: v.optional(metricsValidator),
    deterministicFindings: v.optional(
      v.array(deterministicFindingValidator),
    ),
    bannedPhrases: v.optional(v.array(v.string())),
    critique: v.optional(v.array(critiqueValidator)),
    claimToken: v.optional(v.string()),
    executionMode: v.optional(executionModeValidator),
    errorCode: v.optional(pipelineErrorCodeValidator),
    error: v.optional(v.string()),
    shipProgress: v.optional(shipProgressValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document_and_created", ["documentId", "createdAt"])
    .index("by_user_and_created", ["userId", "createdAt"]),

  sources: defineTable({
    userId: v.id("users"),
    kind: sourceKindValidator,
    status: sourceStatusValidator,
    title: v.string(),
    originalUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    mediaType: v.optional(v.string()),
    byteSize: v.optional(v.number()),
    rawText: v.optional(v.string()),
    summary: v.optional(v.string()),
    themes: v.optional(v.array(v.string())),
    facts: v.optional(v.array(sourceFactValidator)),
    claimToken: v.optional(v.string()),
    error: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_archived_updated", ["userId", "archivedAt", "updatedAt"])
    .index("by_user_and_status", ["userId", "status"]),

  sourceAngles: defineTable({
    userId: v.id("users"),
    sourceIds: v.array(v.id("sources")),
    sourceKey: v.string(),
    angleId: v.string(),
    title: v.string(),
    thesis: v.string(),
    rationale: v.string(),
    genre: genreValidator,
    purpose: v.string(),
    outline: v.array(v.string()),
    factIds: v.array(v.string()),
    interpretation: v.optional(v.string()),
    selectedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_and_created", ["userId", "createdAt"])
    .index("by_user_and_source", ["userId", "sourceKey", "createdAt"]),

  voiceProfiles: defineTable({
    userId: v.id("users"),
    spec: voiceSpecValidator,
    sampleCount: v.number(),
    version: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  writerProfiles: defineTable({
    userId: v.id("users"),
    aboutMe: v.optional(v.string()),
    objectives: v.optional(v.string()),
    audience: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  voiceLearningClaims: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    fingerprint: v.string(),
    attemptToken: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("complete"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_document_and_fingerprint", ["documentId", "fingerprint"]),

  editorialDecisions: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    runId: v.id("runs"),
    genre: genreValidator,
    decision: v.union(v.literal("accepted"), v.literal("rejected")),
    originalText: v.string(),
    revisedText: v.string(),
    criterionIds: v.array(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_and_created", ["userId", "createdAt"])
    .index("by_user_genre_created", ["userId", "genre", "createdAt"])
    .index("by_document", ["documentId"]),

  customRubrics: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    baseGenre: genreValidator,
    accent: v.string(),
    systemPrompt: v.string(),
    length: rubricLengthValidator,
    criteria: v.array(customCriterionValidator),
    preferredPatterns: v.array(v.string()),
    discouragedPatterns: v.array(v.string()),
    referenceCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_and_updated", ["userId", "updatedAt"]),

  playbookEntries: defineTable({
    userId: v.id("users"),
    title: v.string(),
    sourceExcerpt: v.string(),
    genres: v.array(genreValidator),
    appliesToAll: v.boolean(),
    tips: v.array(playbookTipValidator),
    status: playbookStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_status_updated", ["userId", "status", "updatedAt"]),

  deliveryBriefings: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    format: deliveryFormatValidator,
    revision: v.optional(v.number()),
    briefing: deliveryBriefingValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document_and_format", ["documentId", "format"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),

  deliveryBriefingClaims: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    format: deliveryFormatValidator,
    revision: v.number(),
    claimToken: v.string(),
    status: v.union(
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_document_and_format", ["documentId", "format"]),

  practiceSessions: defineTable({
    userId: v.id("users"),
    documentId: v.id("documents"),
    scenario: practiceScenarioValidator,
    messages: v.array(practiceMessageValidator),
    status: practiceStatusValidator,
    feedback: v.optional(practiceFeedbackValidator),
    pending: v.boolean(),
    pendingUserMessage: v.optional(v.string()),
    pendingRequestId: v.optional(v.string()),
    completedTurnRequestIds: v.optional(v.array(v.string())),
    claimToken: v.optional(v.string()),
    claimStartedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_document_and_updated", ["documentId", "updatedAt"])
    .index("by_user_and_updated", ["userId", "updatedAt"]),

  aiUsageLeases: defineTable({
    userId: v.id("users"),
    operation: aiOperationValidator,
    token: v.string(),
    status: v.union(v.literal("active"), v.literal("released")),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user_operation_created", ["userId", "operation", "createdAt"])
    .index("by_token", ["token"])
    .index("by_expires_at", ["expiresAt"]),

  preflightSessions: defineTable({
    userId: v.id("users"),
    genre: genreValidator,
    customPurpose: v.optional(v.string()),
    customRubricId: v.optional(v.id("customRubrics")),
    draft: v.string(),
    questions: v.array(ideationQuestionValidator),
    blindSpots: v.array(blindSpotValidator),
    variants: v.array(ideationDirectionValidator),
    answers: v.optional(v.array(preflightAnswerValidator)),
    selectedVariantId: v.optional(v.string()),
    status: preflightSessionStatusValidator,
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_and_updated", ["userId", "updatedAt"]),

  ideationInterviews: defineTable({
    userId: v.id("users"),
    genre: genreValidator,
    customPurpose: v.optional(v.string()),
    questions: v.array(ideationQuestionValidator),
    directions: v.array(ideationDirectionValidator),
    status: v.union(
      v.literal("open"),
      v.literal("composing"),
      v.literal("complete"),
      v.literal("cancelled"),
      v.literal("error"),
    ),
    composeRequestId: v.optional(v.string()),
    claimToken: v.optional(v.string()),
    claimStartedAt: v.optional(v.number()),
    documentId: v.optional(v.id("documents")),
    runId: v.optional(v.id("runs")),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_and_request", ["userId", "composeRequestId"]),

  ideationInterviewRequests: defineTable({
    userId: v.id("users"),
    requestId: v.string(),
    claimToken: v.string(),
    status: v.union(
      v.literal("generating"),
      v.literal("complete"),
      v.literal("error"),
    ),
    interviewId: v.optional(v.id("ideationInterviews")),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_user_and_request", ["userId", "requestId"]),
});
