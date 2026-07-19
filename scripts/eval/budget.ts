import type { ModelUsage } from "./types";

function nonNegativeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

function tokenTotal(value: unknown): number {
  if (typeof value === "number") return nonNegativeNumber(value);
  if (!value || typeof value !== "object") return 0;
  return nonNegativeNumber((value as Record<string, unknown>).total);
}

export function normalizeUsage(usage: unknown): Omit<ModelUsage, "estimatedCostUsd"> {
  if (!usage || typeof usage !== "object") {
    throw new Error("Provider did not report token usage; budget cannot fail closed");
  }
  const record = usage as Record<string, unknown>;
  const normalized = {
    inputTokens: tokenTotal(record.inputTokens),
    outputTokens: tokenTotal(record.outputTokens),
  };
  if (normalized.inputTokens === 0 && normalized.outputTokens === 0) {
    throw new Error("Provider reported zero token usage; budget cannot be verified");
  }
  return normalized;
}

function positiveConfig(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a finite positive number`);
  }
  return value;
}

export class BudgetTracker {
  private readonly maxTokens: number;
  private readonly maxUsd: number;
  private readonly inputUsdPerMillion: number;
  private readonly outputUsdPerMillion: number;
  private totals: ModelUsage = {
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
  };

  constructor() {
    this.maxTokens = positiveConfig("EVAL_MAX_TOTAL_TOKENS", 250_000);
    this.maxUsd = positiveConfig("EVAL_MAX_USD", 25);
    this.inputUsdPerMillion = positiveConfig(
      "EVAL_INPUT_USD_PER_MILLION",
      15,
    );
    this.outputUsdPerMillion = positiveConfig(
      "EVAL_OUTPUT_USD_PER_MILLION",
      75,
    );
  }

  assertCanCall(prompt: string, maxOutputTokens: number): void {
    if (!Number.isFinite(maxOutputTokens) || maxOutputTokens <= 0) {
      throw new Error("maxOutputTokens must be a finite positive number");
    }
    // Deliberately conservative: reserves room for system text and structured
    // output schema overhead that is not included in the user prompt string.
    const estimatedInputTokens = Math.ceil(prompt.length / 3) + 1_000;
    const reservedOutputTokens = Math.ceil(maxOutputTokens * 1.1);
    const projectedTokens =
      this.totals.inputTokens +
      this.totals.outputTokens +
      estimatedInputTokens +
      reservedOutputTokens;
    if (projectedTokens > this.maxTokens) {
      throw new Error(
        `Evaluation token budget would be exceeded (${projectedTokens} > ${this.maxTokens}).`,
      );
    }
    const projectedCost =
      this.totals.estimatedCostUsd +
      (estimatedInputTokens / 1_000_000) * this.inputUsdPerMillion +
      (reservedOutputTokens / 1_000_000) * this.outputUsdPerMillion;
    if (projectedCost > this.maxUsd) {
      throw new Error(
        `Evaluation cost budget would be exceeded ($${projectedCost.toFixed(4)} > $${this.maxUsd.toFixed(2)}).`,
      );
    }
  }

  consume(rawUsage: unknown): ModelUsage {
    const normalized = normalizeUsage(rawUsage);
    const usage: ModelUsage = {
      ...normalized,
      estimatedCostUsd:
        (normalized.inputTokens / 1_000_000) * this.inputUsdPerMillion +
        (normalized.outputTokens / 1_000_000) * this.outputUsdPerMillion,
    };
    this.totals = {
      inputTokens: this.totals.inputTokens + usage.inputTokens,
      outputTokens: this.totals.outputTokens + usage.outputTokens,
      estimatedCostUsd:
        this.totals.estimatedCostUsd + usage.estimatedCostUsd,
    };
    if (
      this.totals.inputTokens + this.totals.outputTokens > this.maxTokens ||
      this.totals.estimatedCostUsd > this.maxUsd
    ) {
      throw new Error("Evaluation budget was exceeded; stopping immediately.");
    }
    return usage;
  }

  snapshot(): ModelUsage {
    return { ...this.totals };
  }
}
