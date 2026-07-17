"use client";

import {
  ArrowRightIcon,
  CheckCheckIcon,
  CircleHelpIcon,
  ClipboardIcon,
  FileCheck2Icon,
  GaugeIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  RotateCcwIcon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";

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

const guideItems = [
  {
    label: "Writing form",
    icon: FileCheck2Icon,
    description:
      "The badge names the form being reviewed, such as Social thread. Its rubric controls the length, structure, and quality checks.",
  },
  {
    label: "Change groups",
    icon: ListChecksIcon,
    description:
      "A group is one meaningful edit. Accepted keeps Lede's revision; rejected restores your original wording; unresolved groups still need a decision.",
  },
  {
    label: "Readiness",
    icon: GaugeIcon,
    description:
      "Checks whether the current version is ready to leave the studio, including unresolved evidence gaps and quality concerns.",
  },
  {
    label: "Prepare to deliver",
    icon: SparklesIcon,
    description:
      "Turns the finished piece into a practical briefing for a call, presentation, negotiation, or post.",
  },
  {
    label: "Practise",
    icon: MessageSquareTextIcon,
    description:
      "Rehearse questions and objections with an AI coach, then receive focused feedback on the delivery.",
  },
  {
    label: "New draft",
    icon: RotateCcwIcon,
    description:
      "Leaves this review and returns to the studio. Save or copy anything you want to keep first.",
  },
  {
    label: "Accept / Reject all",
    icon: CheckCheckIcon,
    description:
      "Resolve every proposed edit in one step. You can still change individual decisions before saving.",
  },
  {
    label: "Quality",
    icon: FileCheck2Icon,
    description:
      "Opens the rubric scorecard on smaller screens so you can see what passed, what did not, and why.",
  },
  {
    label: "Copy / Save result",
    icon: SaveIcon,
    description:
      "Copy places the current version on your clipboard. Save result stores it on your private shelf and teaches Lede from your decisions.",
  },
] as const;

const sequence = [
  "Review each change group and accept or reject it.",
  "Open Readiness and address any remaining gaps.",
  "Use Prepare to deliver for a practical briefing.",
  "Practise the likely questions or objections.",
  "Save the result, then copy it wherever it needs to go.",
] as const;

export function ReviewGuide() {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="sm" />}>
        <CircleHelpIcon data-icon="inline-start" />
        Guide
      </SheetTrigger>
      <SheetContent className="w-[94vw] overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b bg-[linear-gradient(145deg,var(--card),color-mix(in_oklab,var(--accent)_55%,var(--card)))] px-6 py-8">
          <Badge variant="outline" className="mb-4 w-fit">
            <CircleHelpIcon data-icon="inline-start" />
            Review room guide
          </Badge>
          <SheetHeader className="gap-2 p-0">
            <SheetTitle className="font-heading text-4xl leading-none">
              From tracked changes to ready-to-share.
            </SheetTitle>
            <SheetDescription className="max-w-md leading-6">
              Every control has one job. Follow the sequence, or jump directly to
              the step you need.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-8 px-6 py-7">
          <section aria-labelledby="review-sequence-title">
            <p
              id="review-sequence-title"
              className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
            >
              Recommended sequence
            </p>
            <ol className="mt-4 space-y-2">
              {sequence.map((step, index) => (
                <li
                  key={step}
                  className="grid grid-cols-[2rem_1fr] items-start gap-3 rounded-lg border bg-background/70 p-3"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary font-heading text-sm text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="pt-1.5 text-sm leading-5">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="review-controls-title">
            <p
              id="review-controls-title"
              className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase"
            >
              What each heading does
            </p>
            <div className="mt-4 divide-y rounded-lg border">
              {guideItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="grid grid-cols-[2.25rem_1fr] gap-3 px-4 py-4"
                  >
                    <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-lg border border-copper/30 bg-accent/45 p-4">
            <ClipboardIcon className="mt-0.5 size-4 shrink-0 text-copper" />
            <p className="text-xs leading-5 text-muted-foreground">
              The suggested next-step chip in the header updates as you work. It
              is guidance, not a gate—you remain in control of every decision.
            </p>
            <ArrowRightIcon className="mt-0.5 size-4 shrink-0 text-copper" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
