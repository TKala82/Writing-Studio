export type PipelineErrorCode =
  | "provider-quota"
  | "provider-auth"
  | "provider-unavailable"
  | "unknown";

export interface ClassifiedPipelineError {
  code: PipelineErrorCode;
  message: string;
}

function collectErrorText(error: unknown, depth = 0): string {
  if (depth > 4 || error === null || error === undefined) return "";
  if (typeof error === "string") return error;
  if (typeof error !== "object") return String(error);

  const record = error as Record<string, unknown>;
  return [
    error instanceof Error ? error.message : "",
    typeof record.statusCode === "number" ? String(record.statusCode) : "",
    typeof record.status === "number" ? String(record.status) : "",
    typeof record.code === "string" ? record.code : "",
    collectErrorText(record.cause, depth + 1),
    collectErrorText(record.lastError, depth + 1),
    Array.isArray(record.errors)
      ? record.errors.map((item) => collectErrorText(item, depth + 1)).join(" ")
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function classifyPipelineError(error: unknown): ClassifiedPipelineError {
  const searchable = collectErrorText(error).toLowerCase();
  const hasProviderContext =
    /provider|model|openai|anthropic|google|gemini|api|\bai[_ -]/.test(
      searchable,
    );

  if (
    hasProviderContext &&
    /\b429\b|quota|rate.?limit|resource.?exhausted|credit|billing|prepayment/.test(
      searchable,
    )
  ) {
    return {
      code: "provider-quota",
      message:
        "The AI provider has reached its quota or spending limit. Your draft is safe; try again after the provider budget is restored.",
    };
  }

  if (
    hasProviderContext &&
    /\b401\b|\b403\b|unauthori[sz]ed|invalid.?api.?key|authentication/.test(
      searchable,
    )
  ) {
    return {
      code: "provider-auth",
      message:
        "The AI provider rejected its credentials. Your draft is safe; an operator needs to check the configured API key.",
    };
  }

  if (
    hasProviderContext &&
    /overloaded|temporar(?:y|ily)|provider unavailable|model unavailable|api timeout|api timed out/.test(
      searchable,
    )
  ) {
    return {
      code: "provider-unavailable",
      message:
        "The AI provider is temporarily unavailable. Your draft is safe; wait a moment and retry.",
    };
  }

  return {
    code: "unknown",
    message:
      "The editorial pipeline stopped unexpectedly. Your draft is safe; retry once, then contact support if the problem continues.",
  };
}
