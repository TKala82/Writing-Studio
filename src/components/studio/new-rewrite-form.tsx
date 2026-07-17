"use client";

import { useAction, useQuery } from "convex/react";
import {
  ArrowUpRightIcon,
  ScanSearchIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { CustomRubricBuilder } from "@/components/studio/custom-rubric-builder";
import { LibrarianSuggestions } from "@/components/studio/librarian-suggestions";
import { PurposePicker } from "@/components/studio/purpose-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getGenreRubric, type GenreId } from "@/lib/genres";

const SAMPLE_DRAFT = `I want to join this AI safety fellowship because AI is developing very fast and I think it is important that it goes well. During my computer science degree, I became interested in machine learning and later completed an introductory AI safety course. I especially enjoyed the sections on evaluations and mechanistic interpretability.

Last year I built a small evaluation harness for language-model outputs as an independent project. It tested whether models followed conflicting instructions across 300 prompts. The project made me interested in how behavioural evidence can reveal hidden model tendencies, but I am still unsure which research direction would let me contribute most effectively.

The fellowship would give me the opportunity to learn from experienced researchers and improve my research skills. I am a fast learner and work well independently. In the future, I hope to conduct useful technical AI safety research and help reduce risks from advanced AI systems.`;

interface NewRewriteFormProps {
  disabled: boolean;
  canDetect?: boolean;
  disabledReason?: string;
  initialDraft?: string;
  onOpenRun?: (runId: Id<"runs">) => void;
  onSubmit: (input: {
    draft: string;
    genre: GenreId;
    customPurpose?: string;
    customRubricId?: Id<"customRubrics">;
  }) => Promise<void>;
}

export function NewRewriteForm({
  disabled,
  canDetect = false,
  disabledReason,
  initialDraft = "",
  onOpenRun,
  onSubmit,
}: NewRewriteFormProps) {
  const [genre, setGenre] = useState<GenreId>("motivation-statement");
  const [draft, setDraft] = useState(initialDraft);
  const [customPurpose, setCustomPurpose] = useState("");
  const [customRubricId, setCustomRubricId] =
    useState<Id<"customRubrics">>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const detectGenre = useAction(api.pipelineActions.detectGenre);
  const customRubrics = useQuery(
    api.customRubrics.listMine,
    canDetect ? {} : "skip",
  );
  const rubric = getGenreRubric(genre);
  const selectedCustomRubric = customRubrics?.find(
    (customRubric) => customRubric._id === customRubricId,
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || draft.trim().length < 50) return;
    setIsSubmitting(true);
    try {
      await onSubmit({
        draft,
        genre,
        customPurpose: customPurpose.trim() || undefined,
        customRubricId,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function insertShelfPassage(passage: string) {
    const textarea = draftRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? draft.length;
    const needsLeadingBreak = start > 0 && !draft.slice(0, start).endsWith("\n\n");
    const needsTrailingBreak =
      end < draft.length && !draft.slice(end).startsWith("\n\n");
    const insertion = `${needsLeadingBreak ? "\n\n" : ""}${passage}${
      needsTrailingBreak ? "\n\n" : ""
    }`;
    setDraft(`${draft.slice(0, start)}${insertion}${draft.slice(end)}`);
    requestAnimationFrame(() => {
      const cursor = start + insertion.length;
      draftRef.current?.focus();
      draftRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <FieldGroup>
        <Field>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <FieldLabel className="text-sm font-semibold">
                What are you writing?
              </FieldLabel>
              <FieldDescription>
                The purpose selects the standards—not a generic tone preset.
              </FieldDescription>
            </div>
            <span className="hidden max-w-52 text-right text-xs text-muted-foreground md:block">
              {selectedCustomRubric?.accent ?? rubric.accent}
            </span>
          </div>
          <PurposePicker
            value={genre}
            onChange={(nextGenre) => {
              setGenre(nextGenre);
              setCustomRubricId(undefined);
            }}
          />
          {canDetect ? (
            <div className="mt-3 flex flex-col gap-2">
              {customRubrics && customRubrics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {customRubrics.map((customRubric) => (
                    <Button
                      key={customRubric._id}
                      type="button"
                      variant={
                        customRubricId === customRubric._id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setGenre(customRubric.baseGenre);
                        setCustomRubricId(customRubric._id);
                      }}
                    >
                      {customRubric.name}
                      <Badge variant="secondary">
                        {customRubric.referenceCount} refs
                      </Badge>
                    </Button>
                  ))}
                </div>
              ) : null}
              <CustomRubricBuilder
                onCreated={({ rubricId, baseGenre }) => {
                  setGenre(baseGenre);
                  setCustomRubricId(rubricId);
                }}
              />
            </div>
          ) : null}
        </Field>

        <Field>
          <FieldLabel htmlFor="custom-purpose">
            Make the purpose more precise{" "}
            <span className="font-normal text-muted-foreground">· optional</span>
          </FieldLabel>
          <Input
            id="custom-purpose"
            value={customPurpose}
            onChange={(event) => setCustomPurpose(event.target.value)}
            placeholder="e.g. Motivation for the MATS Summer 2027 cohort"
            maxLength={240}
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor="draft">Your draft</FieldLabel>
            <div className="flex items-center gap-1">
              {canDetect && draft.trim().length >= 50 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDetecting}
                  onClick={() => {
                    setIsDetecting(true);
                    void detectGenre({ draft })
                      .then((result) => {
                        setGenre(result.genre);
                        setCustomRubricId(undefined);
                        toast.success(
                          `Suggested ${getGenreRubric(result.genre).shortName}: ${result.reason}`,
                        );
                      })
                      .catch((error: unknown) =>
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Could not suggest a format",
                        ),
                      )
                      .finally(() => setIsDetecting(false));
                  }}
                >
                  <ScanSearchIcon data-icon="inline-start" />
                  Suggest format
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGenre("motivation-statement");
                setCustomRubricId(undefined);
                  setDraft(SAMPLE_DRAFT);
                }}
              >
                Use a sample
                <ArrowUpRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Textarea
              ref={draftRef}
              id="draft"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Paste the honest version—the fragments, rough transitions, and details you do not want polished away."
              className="min-h-72 resize-y bg-paper px-5 py-5 font-document text-lg leading-8 paper-shadow"
              maxLength={40_000}
              required
            />
            <span className="pointer-events-none absolute right-3 bottom-3 rounded-md bg-background/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
              {draft.trim() ? draft.trim().split(/\s+/).length : 0} words
            </span>
          </div>
          <FieldDescription>
            Facts are locked before rewriting. Missing evidence becomes an
            explicit [ADD: …] prompt.
          </FieldDescription>
        </Field>

        <LibrarianSuggestions
          draft={draft}
          genre={genre}
          customPurpose={customPurpose}
          enabled={canDetect}
          onInsert={insertShelfPassage}
          onOpenRun={onOpenRun}
        />
      </FieldGroup>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          size="lg"
          disabled={disabled || isSubmitting || draft.trim().length < 50}
          className="min-w-48"
        >
          {isSubmitting ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <WandSparklesIcon data-icon="inline-start" />
          )}
          {isSubmitting ? "Preparing the editor" : "Shape this draft"}
        </Button>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          {disabledReason ??
            "A specialist model rewrites it; a different model judges it against the genre rubric."}
        </p>
      </div>
    </form>
  );
}
