"use client";

import { useQuery } from "convex/react";
import {
  AlertTriangleIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";

interface GenerationStatusBannerProps {
  enabled: boolean;
  failureCode?:
    | "provider-quota"
    | "provider-auth"
    | "provider-unavailable"
    | "unknown";
}

/**
 * Warns the writer when the pipeline is serving fixture text (demo mode) or
 * cannot generate at all (no provider key), so identical "drafts" are never
 * mistaken for real editorial output.
 */
export function GenerationStatusBanner({
  enabled,
  failureCode,
}: GenerationStatusBannerProps) {
  const status = useQuery(
    api.system.generationStatus,
    enabled ? {} : "skip",
  );

  if (!enabled) return null;

  if (failureCode === "provider-quota") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/8 px-4 py-3 text-sm"
      >
        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            Generation is paused because an AI provider reached its quota.
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Your draft is safe. An operator needs to restore the provider budget
            or quota before a retry can complete.
          </p>
        </div>
      </div>
    );
  }

  if (!status || status.mode === "live") return null;

  if (status.mode === "demo") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/8 px-4 py-3 text-sm"
      >
        <FlaskConicalIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold text-amber-700 dark:text-amber-400">
            Demo mode is on — you are seeing sample text, not real drafts.
          </p>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            Every run returns the same fixture output regardless of what you
            write. To generate real content, add a model API key and turn demo
            mode off:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npx convex env set GOOGLE_GENERATIVE_AI_API_KEY &quot;...&quot;
            </code>{" "}
            then{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npx convex env remove PIPELINE_DEMO_MODE
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
    >
      <KeyRoundIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">
          No AI model key is configured — generation will fail.
        </p>
        <p className="mt-1 leading-relaxed text-muted-foreground">
          Add at least one provider key on the Convex deployment (Google,
          Anthropic, or OpenAI). One key is enough — Lede routes every stage to
          the providers you have:{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            npx convex env set GOOGLE_GENERATIVE_AI_API_KEY &quot;...&quot;
          </code>
        </p>
      </div>
    </div>
  );
}
