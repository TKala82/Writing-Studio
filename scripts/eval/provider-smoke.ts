import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText, type LanguageModel } from "ai";

interface ProviderCheck {
  name: string;
  key: string;
  modelId: string;
  model: () => LanguageModel;
}

const checks: ProviderCheck[] = [
  {
    name: "Google",
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
    modelId: process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview",
    model: () =>
      google(process.env.GOOGLE_ANALYSIS_MODEL ?? "gemini-3-flash-preview"),
  },
  {
    name: "Anthropic",
    key: "ANTHROPIC_API_KEY",
    modelId: process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0",
    model: () =>
      anthropic(process.env.ANTHROPIC_REWRITE_MODEL ?? "claude-sonnet-5-0"),
  },
  {
    name: "OpenAI",
    key: "OPENAI_API_KEY",
    modelId: process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4",
    model: () => openai(process.env.OPENAI_CRITIQUE_MODEL ?? "gpt-5.4"),
  },
];

async function main(): Promise<void> {
  const missing = checks.filter((check) => !process.env[check.key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing provider keys: ${missing.map((check) => check.key).join(", ")}`,
    );
  }

  let failed = false;
  for (const check of checks) {
    try {
      const result = await generateText({
        model: check.model(),
        maxOutputTokens: 16,
        temperature: 0,
        prompt: 'Reply with exactly "ok".',
      });
      const passed = result.text.trim().toLowerCase().includes("ok");
      console.log(
        `${check.name} (${check.modelId}): ${passed ? "PASS" : "UNEXPECTED RESPONSE"}`,
      );
      failed ||= !passed;
    } catch (error) {
      failed = true;
      console.error(
        `${check.name} (${check.modelId}): FAIL — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  if (failed) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
