import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type EvalProvider = "google" | "anthropic" | "openai";

export interface EvalModel {
  provider: EvalProvider;
  id: string;
  model: LanguageModel;
}

const defaults: Record<EvalProvider, string> = {
  google: process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview",
  anthropic: process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0",
  openai: process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4",
};

const keyByProvider: Record<EvalProvider, string> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

function parseProvider(value: string | undefined, fallback: EvalProvider): EvalProvider {
  if (!value) return fallback;
  if (value === "google" || value === "anthropic" || value === "openai") {
    return value;
  }
  throw new Error(`Unsupported evaluation provider: ${value}`);
}

function instantiate(provider: EvalProvider, id: string): LanguageModel {
  if (provider === "google") return google(id);
  if (provider === "anthropic") return anthropic(id);
  return openai(id);
}

function configuredModel(
  providerEnv: string,
  modelEnv: string,
  fallbackProvider: EvalProvider,
): EvalModel {
  const provider = parseProvider(process.env[providerEnv], fallbackProvider);
  const id = process.env[modelEnv] ?? defaults[provider];
  if (!process.env[keyByProvider[provider]]?.trim()) {
    throw new Error(
      `${keyByProvider[provider]} is required for the ${providerEnv.toLowerCase()} model.`,
    );
  }
  return { provider, id, model: instantiate(provider, id) };
}

export function loadEvalModels(): {
  generator: EvalModel;
  judges: EvalModel[];
} {
  const generator = configuredModel(
    "EVAL_GENERATOR_PROVIDER",
    "EVAL_GENERATOR_MODEL",
    "anthropic",
  );
  const firstJudge = configuredModel(
    "EVAL_JUDGE_PROVIDER",
    "EVAL_JUDGE_MODEL",
    "openai",
  );
  const secondJudge = configuredModel(
    "EVAL_JUDGE_2_PROVIDER",
    "EVAL_JUDGE_2_MODEL",
    "google",
  );
  if (
    generator.provider === firstJudge.provider ||
    generator.provider === secondJudge.provider
  ) {
    throw new Error(
      "Blind judges must use provider families different from generation.",
    );
  }
  if (firstJudge.provider === secondJudge.provider) {
    throw new Error("The first two blind judges must use different provider families.");
  }
  const judges = [firstJudge, secondJudge];
  if (process.env.EVAL_JUDGE_3_PROVIDER || process.env.EVAL_JUDGE_3_MODEL) {
    const thirdJudge = configuredModel(
      "EVAL_JUDGE_3_PROVIDER",
      "EVAL_JUDGE_3_MODEL",
      "openai",
    );
    if (thirdJudge.provider === generator.provider) {
      throw new Error(
        "The tie-break judge must use a provider family different from generation.",
      );
    }
    judges.push(thirdJudge);
  }
  return { generator, judges };
}
