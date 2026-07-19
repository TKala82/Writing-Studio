import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import {
  configuredProviders,
  PROVIDER_ENV_KEYS,
  type ProviderId,
} from "./providerStatus";

export const modelIds = {
  analysis: process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview",
  rewrite: process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0",
  critique: process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4",
} as const;

type Stage = "analysis" | "rewrite" | "critique";

/**
 * Preferred provider per stage, falling back to whichever keys exist so a
 * single configured provider can run the whole pipeline.
 */
const STAGE_PREFERENCES: Record<Stage, ProviderId[]> = {
  analysis: ["google", "anthropic", "openai"],
  rewrite: ["anthropic", "google", "openai"],
  critique: ["openai", "anthropic", "google"],
};

const FALLBACK_MODEL_IDS: Record<ProviderId, string> = {
  google: process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview",
  anthropic: process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0",
  openai: process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4",
};

function instantiate(provider: ProviderId): LanguageModel {
  const id = FALLBACK_MODEL_IDS[provider];
  if (provider === "google") return google(id);
  if (provider === "anthropic") return anthropic(id);
  return openai(id);
}

function resolveStageProvider(stage: Stage): ProviderId {
  const available = configuredProviders();
  const chosen = STAGE_PREFERENCES[stage].find((provider) =>
    available.includes(provider),
  );
  if (!chosen) {
    throw new Error(missingKeyMessage());
  }
  return chosen;
}

function missingKeyMessage(): string {
  const keys = Object.values(PROVIDER_ENV_KEYS).join(", ");
  return (
    "No AI provider key is configured on the Convex deployment. Set at least one of " +
    `${keys} (npx convex env set GOOGLE_GENERATIVE_AI_API_KEY "..."). ` +
    "One key is enough: Lede routes every stage to the providers you have. " +
    "For local UI smoke without provider keys, set PIPELINE_DEMO_MODE=1 and ALLOW_PIPELINE_DEMO_MODE=1."
  );
}

/**
 * Lazy per-stage model resolution so env changes and single-key setups work
 * without import-time failures.
 */
export const pipelineModels = {
  get analysis(): LanguageModel {
    return instantiate(resolveStageProvider("analysis"));
  },
  get rewrite(): LanguageModel {
    return instantiate(resolveStageProvider("rewrite"));
  },
  get critique(): LanguageModel {
    return instantiate(resolveStageProvider("critique"));
  },
};

function assertAnyKey(): void {
  if (configuredProviders().length === 0) {
    throw new Error(missingKeyMessage());
  }
}

export function assertAnalysisKey(): void {
  assertAnyKey();
}

export function assertRewriteKey(): void {
  assertAnyKey();
}

export function assertCritiqueKey(): void {
  assertAnyKey();
}

export function assertModelKeys(): void {
  assertAnyKey();
}
