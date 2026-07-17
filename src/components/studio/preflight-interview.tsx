"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  MessageCircleQuestionIcon,
  RouteIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PreflightQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  answerHint: string;
}

export interface BlindSpot {
  id: string;
  label: string;
  whyItMatters: string;
  criterionId?: string;
}

export interface EditorialVariant {
  id: string;
  label: string;
  approach: string;
  openingDirection: string;
}

interface PreflightInterviewProps {
  title: string;
  questions: PreflightQuestion[];
  blindSpots: BlindSpot[];
  variants: EditorialVariant[];
  mode?: "preflight" | "ideation";
  initialAnswers?: Record<string, string>;
  initialSelectedVariantId?: string;
  onBack: () => void;
  onContinue: (result: {
    writerContext: string;
    answers: Array<{ questionId: string; question: string; answer: string }>;
    selectedVariant?: EditorialVariant;
    skipped?: boolean;
  }) => Promise<void>;
}

export function PreflightInterview({
  title,
  questions,
  blindSpots,
  variants,
  mode = "preflight",
  initialAnswers,
  initialSelectedVariantId,
  onBack,
  onContinue,
}: PreflightInterviewProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialAnswers ?? {},
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(
    initialSelectedVariantId,
  );
  const [isContinuing, setIsContinuing] = useState(false);
  const [skipConfirmed, setSkipConfirmed] = useState(false);
  const current = questions[questionIndex];
  const answeredCount = Object.values(answers).filter((answer) =>
    answer.trim(),
  ).length;
  const requiresVariant = variants.length > 0;
  const canContinuePreflight =
    mode !== "preflight" ||
    ((requiresVariant ? selectedVariantId !== undefined : true) &&
      (answeredCount > 0 || skipConfirmed));
  const writerContext = useMemo(
    () =>
      questions
        .map((question) => {
          const answer = answers[question.id]?.trim();
          return answer
            ? `Question: ${question.question}\nAnswer: ${answer}`
            : null;
        })
        .filter((entry): entry is string => Boolean(entry))
        .join("\n\n"),
    [answers, questions],
  );

  async function continueToEditor(skipped = false) {
    setIsContinuing(true);
    try {
      await onContinue({
        writerContext,
        answers: questions
          .map((question) => ({
            questionId: question.id,
            question: question.question,
            answer: answers[question.id]?.trim() ?? "",
          }))
          .filter((item) => item.answer.length > 0),
        selectedVariant: variants.find(
          (variant) => variant.id === selectedVariantId,
        ),
        skipped,
      });
    } finally {
      setIsContinuing(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeftIcon data-icon="inline-start" />
            {mode === "ideation" ? "Back to studio" : "Back to draft"}
          </Button>
          <Badge variant="outline">
            {answeredCount}/{questions.length} questions answered
          </Badge>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-copper uppercase">
            {mode === "ideation" ? "Begin with what you know" : "Before the editor writes"}
          </p>
          <h1 className="mt-2 max-w-3xl font-heading text-4xl leading-tight sm:text-5xl">
            {mode === "ideation"
              ? `Let’s find the shape of ${title}.`
              : `A few answers could materially change ${title}.`}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {mode === "ideation"
              ? "Answer from experience, evidence, and honest uncertainty. Lede will treat your words as the source—not fill the gaps with invention."
              : "Lede asks only what the draft cannot answer. Skip anything you do not know; it will remain an explicit gap."}
          </p>
        </div>

        <div
          className={cn(
            "grid gap-5",
            blindSpots.length > 0 && "lg:grid-cols-[minmax(0,1fr)_20rem]",
          )}
        >
          <Card className="paper-shadow">
            <CardHeader>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Badge variant="secondary">
                  <MessageCircleQuestionIcon data-icon="inline-start" />
                  Question {questionIndex + 1}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {questionIndex + 1} of {questions.length}
                </span>
              </div>
              <CardTitle className="text-3xl">{current.question}</CardTitle>
              <CardDescription className="leading-6">
                {current.whyItMatters}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Textarea
                value={answers[current.id] ?? ""}
                onChange={(event) =>
                  setAnswers((existing) => ({
                    ...existing,
                    [current.id]: event.target.value,
                  }))
                }
                placeholder={current.answerHint}
                className="min-h-40 resize-y bg-paper font-document text-lg leading-8"
                maxLength={2_000}
                autoFocus
              />
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={questionIndex === 0}
                  onClick={() => setQuestionIndex((index) => index - 1)}
                >
                  Previous
                </Button>
                {questionIndex < questions.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setQuestionIndex((index) => index + 1)}
                  >
                    {answers[current.id]?.trim() ? "Save and continue" : "Skip"}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => setQuestionIndex(0)}>
                    Review answers
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {blindSpots.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-sans text-sm font-semibold">
                  <EyeIcon data-icon="inline-start" />
                  Blind-spot pass
                </CardTitle>
                <CardDescription>
                  What strong examples usually contain that this draft cannot yet
                  support.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {blindSpots.map((spot) => (
                  <div key={spot.id} className="border-l-2 pl-3">
                    <p className="text-sm font-semibold">{spot.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {spot.whyItMatters}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <RouteIcon className="size-4 text-copper" />
            <h2 className="font-heading text-2xl">
              Which editorial direction feels most like yours?
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {variants.map((variant) => {
              const selected = selectedVariantId === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setSelectedVariantId(selected ? undefined : variant.id)
                  }
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-colors",
                    selected && "border-copper bg-accent/40 ring-1 ring-copper",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold">{variant.label}</span>
                    {selected ? <CheckIcon className="size-4 text-copper" /> : null}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                    {variant.approach}
                  </span>
                  <span className="mt-3 block font-document text-sm italic leading-6">
                    {variant.openingDirection}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col items-start justify-between gap-3 border-t pt-5 sm:flex-row sm:items-center">
          <div className="flex max-w-xl flex-col gap-2">
            <p className="text-xs leading-5 text-muted-foreground">
              Answers become locked context. The selected direction guides
              structure; it never grants permission to invent facts.
            </p>
            {mode === "preflight" && requiresVariant && !selectedVariantId ? (
              <p className="text-xs text-copper">
                Choose an editorial direction before continuing.
              </p>
            ) : null}
            {mode === "preflight" &&
            answeredCount === 0 &&
            !skipConfirmed ? (
              <button
                type="button"
                className="text-left text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setSkipConfirmed(true)}
              >
                Skip interview and continue with no answers
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            size="lg"
            disabled={
              isContinuing ||
              (mode === "ideation"
                ? answeredCount < 2 || selectedVariantId === undefined
                : !canContinuePreflight)
            }
            onClick={() =>
              void continueToEditor(
                mode === "preflight" && answeredCount === 0 && skipConfirmed,
              )
            }
          >
            {isContinuing
              ? "Preparing editor…"
              : mode === "ideation"
                ? "Build the first draft"
                : "Continue to editorial pass"}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      </main>
    </div>
  );
}
