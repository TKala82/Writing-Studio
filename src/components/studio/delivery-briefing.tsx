"use client";

import { useAction, useQuery } from "convex/react";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  MessageCircleQuestionIcon,
  Mic2Icon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import {
  deliveryFormats,
  getDeliveryFormat,
  type DeliveryFormatId,
} from "@/lib/coaching";
import { cn } from "@/lib/utils";

export interface DeliveryBriefingData {
  openingLine: string;
  closingLine: string;
  talkingPoints: Array<{
    point: string;
    evidence: string;
    deliveryCue: string;
  }>;
  likelyQuestions: Array<{
    question: string;
    response: string;
    sourceFactIds: string[];
  }>;
  bestPractices: string[];
  pitfalls: string[];
}

const DEMO_BRIEFING: DeliveryBriefingData = {
  openingLine:
    "The project that made AI safety concrete for me began with 300 conflicting-instruction prompts.",
  closingLine:
    "I am looking for the setting that will help me turn that early evidence into a tractable research direction and useful work.",
  talkingPoints: [
    {
      point: "Lead with the evaluation harness, not with general concern about AI.",
      evidence: "The document names a 300-prompt independent project.",
      deliveryCue: "Answer first; add the setup only if the interviewer asks.",
    },
    {
      point: "Frame uncertainty as an active research question.",
      evidence:
        "The draft distinguishes evaluations from mechanistic interpretability without claiming a settled direction.",
      deliveryCue: "Slow down here and make the uncertainty sound deliberate.",
    },
    {
      point: "Connect the programme to a specific next decision.",
      evidence: "[ADD: the programme resource and resulting research output].",
      deliveryCue: "Do not improvise programme details—prepare this before the call.",
    },
  ],
  likelyQuestions: [
    {
      question: "What did the evaluation harness actually reveal?",
      response:
        "Describe the tested behaviour and one observed pattern, then separate what the result supports from what it cannot establish. [ADD: one concrete finding].",
      sourceFactIds: [],
    },
    {
      question: "Why do you need this fellowship now?",
      response:
        "Explain the research decision the programme would help you make and name the relevant mentor, resource, or format. [ADD: programme-specific evidence].",
      sourceFactIds: [],
    },
    {
      question: "Which direction would you choose today?",
      response:
        "Give the current leading hypothesis, the evidence behind it, and what would cause you to update.",
      sourceFactIds: [],
    },
  ],
  bestPractices: [
    "Keep the first answer under ninety seconds.",
    "Use the project as evidence, not as a rehearsed speech.",
    "Pause after naming the research question.",
  ],
  pitfalls: [
    "Opening with broad claims about AI moving quickly.",
    "Inventing programme fit when a concrete resource is still missing.",
  ],
};

const DEMO_IDEATION_BRIEFING: DeliveryBriefingData = {
  openingLine:
    "A useful AI policy conversation should begin with the decision in front of us, not every possible risk at once.",
  closingLine:
    "Before debating the whole future of AI, ask which decision must be made now and what evidence would change it.",
  talkingPoints: [
    {
      point: "Separate the immediate decision from the wider risk landscape.",
      evidence:
        "The post argues that broad framing creates agreement without a clear next action.",
      deliveryCue: "State the contrast in one sentence, then pause.",
    },
    {
      point: "Distinguish observation, inference, and unresolved questions.",
      evidence:
        "The draft proposes making uncertainty legible rather than pretending it can be removed.",
      deliveryCue: "Use three short clauses and stress the distinction.",
    },
    {
      point: "Give the audience a repeatable decision habit.",
      evidence:
        "The closing asks what must be decided now and which evidence could change it.",
      deliveryCue: "End on the question; do not add another summary.",
    },
  ],
  likelyQuestions: [
    {
      question: "Can you give a case where broad framing blocked a decision?",
      response:
        "[ADD: one concrete policy conversation, the decision at stake, and what evidence was being blurred].",
      sourceFactIds: [],
    },
    {
      question: "Does this approach risk ignoring long-term harms?",
      response:
        "No. It separates immediate safeguards from longer-term investigation so that neither is mistaken for the other.",
      sourceFactIds: [],
    },
    {
      question: "What counts as evidence strong enough to act?",
      response:
        "Name the decision threshold and what would update it; do not imply one universal threshold for every policy context.",
      sourceFactIds: [],
    },
  ],
  bestPractices: [
    "Use one real policy decision to anchor the abstract distinction.",
    "Label evidence, inference, and judgment out loud.",
    "Let the final question carry the close.",
  ],
  pitfalls: [
    "Sounding as if near-term decisions make long-term risks irrelevant.",
    "Claiming a concrete case before the missing example is supplied.",
  ],
};

interface DeliveryBriefingProps {
  documentId: Id<"documents">;
  demoMode?: boolean;
  demoScenario?: "fellowship" | "ideation";
  onOpened?: () => void;
}

export function DeliveryBriefing({
  documentId,
  demoMode = false,
  demoScenario = "fellowship",
  onOpened,
}: DeliveryBriefingProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] =
    useState<DeliveryFormatId>("video-call");
  const [briefing, setBriefing] = useState<DeliveryBriefingData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generateBriefing = useAction(api.coachActions.deliveryBriefing);
  const savedBriefings = useQuery(
    api.coach.getForDocument,
    demoMode ? "skip" : { documentId },
  );
  const format = getDeliveryFormat(selectedFormat);

  function chooseFormat(formatId: DeliveryFormatId) {
    setSelectedFormat(formatId);
    const saved = savedBriefings?.find((item) => item.format === formatId);
    setBriefing(saved?.briefing ?? null);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      if (demoMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setBriefing(
          demoScenario === "ideation"
            ? DEMO_IDEATION_BRIEFING
            : DEMO_BRIEFING,
        );
        return;
      }
      const result = await generateBriefing({
        documentId,
        format: selectedFormat,
      });
      setBriefing(result.briefing);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not prepare the delivery briefing",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) onOpened?.();
      }}
    >
      <SheetTrigger render={<Button variant="outline" size="sm" />}>
        <Mic2Icon data-icon="inline-start" />
        Prepare to deliver
      </SheetTrigger>
      <SheetContent className="w-[96vw] gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="font-heading text-2xl">
            Delivery room
          </SheetTitle>
          <SheetDescription>
            Turn the finished piece into something you can say, defend, and
            adapt in the room.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-6 p-6">
            {briefing ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBriefing(null)}
                  >
                    <ArrowLeftIcon data-icon="inline-start" />
                    Formats
                  </Button>
                  <Badge variant="secondary">{format.shortName}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <blockquote className="rounded-xl border-l-4 border-l-copper bg-accent/35 p-4">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Open with
                    </p>
                    <p className="mt-2 font-document text-lg leading-7">
                      “{briefing.openingLine}”
                    </p>
                  </blockquote>
                  <blockquote className="rounded-xl border-l-4 bg-muted/45 p-4">
                    <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                      Close with
                    </p>
                    <p className="mt-2 font-document text-lg leading-7">
                      “{briefing.closingLine}”
                    </p>
                  </blockquote>
                </div>

                <section>
                  <h3 className="font-heading text-2xl">Spoken spine</h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {briefing.talkingPoints.map((item, index) => (
                      <div
                        key={`${item.point}-${index}`}
                        className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl border p-4"
                      >
                        <span className="font-heading text-xl text-copper">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <p className="font-semibold">{item.point}</p>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.evidence}
                          </p>
                          <p className="mt-2 text-xs font-medium text-copper">
                            Cue: {item.deliveryCue}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="flex items-center gap-2 font-heading text-2xl">
                    <MessageCircleQuestionIcon className="size-5 text-copper" />
                    Questions to rehearse
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {briefing.likelyQuestions.map((item) => (
                      <details key={item.question} className="rounded-xl border p-4">
                        <summary className="cursor-pointer font-semibold">
                          {item.question}
                        </summary>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {item.response}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>

                <div className="grid gap-4 sm:grid-cols-2">
                  <section className="rounded-xl border p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <CheckCircle2Icon className="size-4 text-copper" />
                      Best practice
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {briefing.bestPractices.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="rounded-xl border p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <TriangleAlertIcon className="size-4 text-copper" />
                      Watch for
                    </h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {briefing.pitfalls.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-copper uppercase">
                    Where will this material live?
                  </p>
                  <h3 className="mt-2 font-heading text-3xl">
                    Choose the room before rehearsing the words.
                  </h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {deliveryFormats.map((item) => {
                    const selected = item.id === selectedFormat;
                    const hasSaved = savedBriefings?.some(
                      (saved) => saved.format === item.id,
                    );
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          selected && "border-copper bg-accent/40 ring-1 ring-copper",
                        )}
                        onClick={() => chooseFormat(item.id)}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{item.name}</span>
                          {hasSaved ? <Badge variant="secondary">Saved</Badge> : null}
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                          {item.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-xl bg-muted/45 p-4">
                  <p className="text-sm font-semibold">{format.accent}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Suggested counterpart: {format.defaultPersona}
                  </p>
                </div>
                <Button
                  type="button"
                  size="lg"
                  disabled={isGenerating}
                  onClick={() => void handleGenerate()}
                >
                  {isGenerating ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SparklesIcon data-icon="inline-start" />
                  )}
                  {isGenerating ? "Preparing the room" : "Build my briefing"}
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
