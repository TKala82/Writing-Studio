"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClipboardCheckIcon,
  HelpCircleIcon,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ReadinessReportProps {
  text: string;
  critique: Array<{
    label: string;
    score: number;
    passed: boolean;
    rationale: string;
    suggestion?: string;
  }>;
  findings: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  blindSpots: Array<{
    id: string;
    label: string;
    whyItMatters: string;
  }>;
  wordRange: {
    min: number;
    max: number;
  };
  strongestClaim?: string;
  onOpened?: () => void;
}

export function ReadinessReport({
  text,
  critique,
  findings,
  blindSpots,
  wordRange,
  strongestClaim,
  onOpened,
}: ReadinessReportProps) {
  const [open, setOpen] = useState(false);
  const placeholders = text.match(/\[ADD:[^\]]+\]/g) ?? [];
  const failedCriteria = critique.filter((criterion) => !criterion.passed);
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const currentFindings = findings.map((finding) =>
    finding.id === "word-count"
      ? {
          ...finding,
          passed: wordCount >= wordRange.min && wordCount <= wordRange.max,
          detail: `${wordCount} words · target ${wordRange.min}–${wordRange.max}`,
        }
      : finding,
  );
  const failedFindings = currentFindings.filter((finding) => !finding.passed);
  const weakestCriterion = [...critique].sort(
    (left, right) => left.score - right.score,
  )[0];
  const ready =
    placeholders.length === 0 &&
    failedCriteria.length === 0 &&
    failedFindings.length === 0;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpened?.();
      }}
    >
      <SheetTrigger
        render={
          <Button variant="outline" size="sm">
            <ClipboardCheckIcon data-icon="inline-start" />
            Readiness
          </Button>
        }
      />
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <Badge
            variant={ready ? "secondary" : "outline"}
            className="mb-2 w-fit"
          >
            {ready ? (
              <CheckCircle2Icon data-icon="inline-start" />
            ) : (
              <AlertTriangleIcon data-icon="inline-start" />
            )}
            {ready ? "Ready for a final human read" : "A few gaps remain"}
          </Badge>
          <SheetTitle className="font-heading text-3xl">
            Submission readiness
          </SheetTitle>
          <SheetDescription className="leading-6">
            A compact check before this draft leaves Lede. Passing is not a
            guarantee of acceptance or legal correctness.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Open answers", placeholders.length],
              ["Rubric issues", failedCriteria.length],
              ["Mechanical issues", failedFindings.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border p-3">
                <p className="font-heading text-2xl">{value}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {placeholders.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Unanswered prompts</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {placeholders.map((placeholder, index) => (
                  <li
                    key={`${placeholder}-${index}`}
                    className="rounded-lg bg-accent/45 p-3 text-xs leading-5"
                  >
                    {placeholder}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {weakestCriterion ? (
            <section className="border-l-2 border-copper pl-4">
              <p className="text-[11px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
                Weakest criterion
              </p>
              <h3 className="mt-1 text-sm font-semibold">
                {weakestCriterion.label} · {weakestCriterion.score}/5
              </h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {weakestCriterion.suggestion ?? weakestCriterion.rationale}
              </p>
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                Rubric judgments come from the last editorial pass. Re-read
                this criterion after manual changes.
              </p>
            </section>
          ) : null}

          {failedFindings.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">Mechanical checks</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {failedFindings.map((finding) => (
                  <li
                    key={finding.id}
                    className="rounded-lg border p-3 text-xs leading-5"
                  >
                    <span className="font-semibold">{finding.label}:</span>{" "}
                    <span className="text-muted-foreground">
                      {finding.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {blindSpots.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold">
                Blind spots to consider, not invent
              </h3>
              <div className="mt-2 flex flex-col gap-2">
                {blindSpots.map((spot) => (
                  <div key={spot.id} className="rounded-lg border p-3">
                    <p className="text-xs font-semibold">{spot.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {spot.whyItMatters}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-xl bg-muted/55 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <HelpCircleIcon className="size-4 text-copper" />
              Interview defence check
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              If a reviewer challenged this claim, what evidence and caveats
              would you give without reading the draft?
            </p>
            <blockquote className="mt-3 border-l-2 pl-3 font-document text-sm leading-6">
              {strongestClaim ??
                "The strongest claim in this draft should be defensible in your own words."}
            </blockquote>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
