import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";

export const modelIds = {
  analysis: process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview",
  rewrite: process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0",
  critique: process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4",
} as const;

export const pipelineModels = {
  analysis: google(modelIds.analysis),
  rewrite: anthropic(modelIds.rewrite),
  critique: openai(modelIds.critique),
};

function assertKey(value: string | undefined, name: string): void {
  if (!value) {
    throw new Error(`Configure ${name} before using this feature`);
  }
}

export function assertAnalysisKey(): void {
  assertKey(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    "GOOGLE_GENERATIVE_AI_API_KEY",
  );
}

export function assertRewriteKey(): void {
  assertKey(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY");
}

export function assertCritiqueKey(): void {
  assertKey(process.env.OPENAI_API_KEY, "OPENAI_API_KEY");
}

export function assertModelKeys(): void {
  const missing = [
    !process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? "GOOGLE_GENERATIVE_AI_API_KEY"
      : null,
    !process.env.ANTHROPIC_API_KEY ? "ANTHROPIC_API_KEY" : null,
    !process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : null,
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    throw new Error(
      `Configure the direct model API keys before running the editor: ${missing.join(", ")}`,
    );
  }
}
