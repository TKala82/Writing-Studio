"use client";

import { useAction, useQuery } from "convex/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  MessagesSquareIcon,
  SendIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deliveryFormats,
  getDeliveryFormat,
  type DeliveryFormatId,
} from "@/lib/coaching";
import { cn } from "@/lib/utils";

type PracticeDifficulty = "supportive" | "standard" | "challenging";

interface PracticeMessage {
  role: "user" | "coach";
  text: string;
  createdAt: number;
}

interface PracticeFeedback {
  summary: string;
  criteria: Array<{
    criterionId: string;
    label: string;
    score: number;
    rationale: string;
    nextStep: string;
  }>;
  strongestMoment: { quote: string; observation: string };
  weakestMoment: { quote: string; observation: string };
  drills: string[];
}

interface DemoSession {
  scenario: {
    format: DeliveryFormatId;
    persona: string;
    difficulty: PracticeDifficulty;
  };
  messages: PracticeMessage[];
  status: "active" | "evaluating" | "complete";
  pending: boolean;
  feedback?: PracticeFeedback;
  error?: string;
}

const DEMO_FEEDBACK: PracticeFeedback = {
  summary:
    "You stayed grounded in a real project and handled uncertainty honestly. The next improvement is to answer the question before supplying the backstory.",
  criteria: [
    {
      criterionId: "clarity",
      label: "Clear spoken point",
      score: 3,
      rationale:
        "The core answer was present, but it arrived after two sentences of setup.",
      nextStep: "Practise a one-sentence answer followed by one example.",
    },
    {
      criterionId: "evidence",
      label: "Evidence under pressure",
      score: 4,
      rationale:
        "The 300-prompt evaluation project gave the answer credible specificity.",
      nextStep: "Prepare one observed result and one limitation from the project.",
    },
    {
      criterionId: "responsiveness",
      label: "Listens and responds",
      score: 3,
      rationale:
        "You addressed the question, though part of the answer returned to a prepared motivation statement.",
      nextStep: "Repeat the key noun in the question before answering.",
    },
    {
      criterionId: "audience",
      label: "Audience awareness",
      score: 4,
      rationale:
        "Technical detail was calibrated for an interviewer familiar with AI safety.",
      nextStep: "Keep one plain-language version ready for a general panel member.",
    },
    {
      criterionId: "presence",
      label: "Concise conversational presence",
      score: 3,
      rationale: "The answer was coherent but could end one sentence earlier.",
      nextStep: "Stop after the evidence and let the interviewer ask the follow-up.",
    },
  ],
  strongestMoment: {
    quote:
      "I do not think the project settles the question, but it gave me a concrete way to investigate it.",
    observation:
      "This balanced confidence with a clear limit and sounded credible rather than rehearsed.",
  },
  weakestMoment: {
    quote: "AI is moving very quickly and there are many important risks.",
    observation:
      "The broad opening delayed the distinctive evidence already available in your project.",
  },
  drills: [
    "Record three 45-second answers that begin with the 300-prompt project.",
    "Answer the same question for a technical researcher and a general panel member.",
    "Practise ending immediately after one claim, one example, and one caveat.",
  ],
};

const DEMO_IDEATION_FEEDBACK: PracticeFeedback = {
  ...DEMO_FEEDBACK,
  summary:
    "You made the evidence–inference distinction clearly and stayed calibrated. The next improvement is to anchor the idea in one concrete policy decision.",
  criteria: DEMO_FEEDBACK.criteria.map((criterion) =>
    criterion.criterionId === "evidence"
      ? {
          ...criterion,
          score: 3,
          rationale:
            "The distinction was useful, but the missing policy case limited how persuasive it could become.",
          nextStep:
            "Prepare one decision, the evidence available at the time, and the consequence of conflating it with inference.",
        }
      : criterion,
  ),
  strongestMoment: {
    quote:
      "We need to state what is observed, what is inferred, and which action is actually time-sensitive.",
    observation:
      "The three-part distinction was compact, memorable, and directly useful to the audience.",
  },
  weakestMoment: {
    quote: "In recent online discussions, I have noticed a pattern.",
    observation:
      "Without one named example, the observation remains difficult for a skeptical counterpart to test.",
  },
  drills: [
    "Explain the distinction using one real or clearly hypothetical policy decision in sixty seconds.",
    "Answer the objection that decision focus could minimise long-term risks.",
    "Practise ending with the evidence that would change your recommendation.",
  ],
};

const demoReplies = [
  "You say the project made AI safety concrete. What did the evaluation harness actually show, and what did it not show?",
  "That is appropriately cautious. If you had to choose today, which research direction would you investigate first—and why?",
  "Why is this programme necessary for that next step rather than more independent work?",
  "What would a useful outcome from the fellowship look like six months later?",
];

const ideationDemoReplies = [
  "What is one concrete decision where people blurred observation and inference, and what changed because of it?",
  "How would you answer someone who says focusing on the immediate decision understates long-term AI risk?",
  "What evidence would make you change the recommendation you are proposing?",
];

interface PracticeArenaProps {
  documentId: Id<"documents">;
  demoMode?: boolean;
  demoScenario?: "fellowship" | "ideation";
  onOpened?: () => void;
  onCompleted?: () => void;
}

export function PracticeArena({
  documentId,
  demoMode = false,
  demoScenario = "fellowship",
  onOpened,
  onCompleted,
}: PracticeArenaProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<DeliveryFormatId>("video-call");
  const [difficulty, setDifficulty] =
    useState<PracticeDifficulty>("standard");
  const [persona, setPersona] = useState(
    getDeliveryFormat("video-call").defaultPersona,
  );
  const [sessionId, setSessionId] = useState<Id<"practiceSessions"> | null>(
    null,
  );
  const [demoSession, setDemoSession] = useState<DemoSession | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [turnRequestId, setTurnRequestId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const startPractice = useAction(api.practiceActions.start);
  const sendReply = useAction(api.practiceActions.reply);
  const finishPractice = useAction(api.practiceActions.finish);
  const liveSession = useQuery(
    api.practice.getSession,
    !demoMode && sessionId ? { sessionId } : "skip",
  );
  const recentSessions = useQuery(
    api.practice.listForDocument,
    demoMode ? "skip" : { documentId },
  );
  const session = demoMode ? demoSession : liveSession;
  const userTurnCount =
    session?.messages.filter((message) => message.role === "user").length ?? 0;

  const averageScore = useMemo(() => {
    if (!session?.feedback?.criteria.length) return null;
    return (
      session.feedback.criteria.reduce(
        (total, criterion) => total + criterion.score,
        0,
      ) / session.feedback.criteria.length
    ).toFixed(1);
  }, [session?.feedback]);

  function chooseFormat(nextFormat: DeliveryFormatId) {
    setFormat(nextFormat);
    setPersona(getDeliveryFormat(nextFormat).defaultPersona);
  }

  async function handleStart() {
    setIsStarting(true);
    try {
      if (demoMode) {
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        setDemoSession({
          scenario: { format, persona, difficulty },
          messages: [
            {
              role: "coach",
              text:
                demoScenario === "ideation"
                  ? "You argue that AI policy conversations should begin with the decision in front of us. What problem does that solve in practice?"
                  : "Thanks for joining. Let’s begin with the experience behind this material: what made AI safety become a concrete research question for you rather than a general concern?",
              createdAt: Date.now(),
            },
          ],
          status: "active",
          pending: false,
        });
        return;
      }
      const nextSessionId = await startPractice({
        documentId,
        format,
        persona,
        difficulty,
      });
      setSessionId(nextSessionId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the practice session",
      );
    } finally {
      setIsStarting(false);
    }
  }

  async function handleReply() {
    const message = draftReply.trim();
    if (!message || !session) return;
    const requestId = turnRequestId ?? crypto.randomUUID();
    setTurnRequestId(requestId);
    setDraftReply("");
    setIsSending(true);
    try {
      if (demoMode && demoSession) {
        const userMessage: PracticeMessage = {
          role: "user",
          text: message,
          createdAt: Date.now(),
        };
        setDemoSession({
          ...demoSession,
          messages: [...demoSession.messages, userMessage],
          pending: true,
        });
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        const replies =
          demoScenario === "ideation" ? ideationDemoReplies : demoReplies;
        const reply = replies[Math.min(userTurnCount, replies.length - 1)];
        setDemoSession((current) =>
          current
            ? {
                ...current,
                messages: [
                  ...current.messages,
                  { role: "coach", text: reply, createdAt: Date.now() },
                ],
                pending: false,
              }
            : current,
        );
        setTurnRequestId(null);
        return;
      }
      if (!sessionId) return;
      await sendReply({ sessionId, message, requestId });
      setTurnRequestId(null);
    } catch (error) {
      setDraftReply(message);
      toast.error(
        error instanceof Error ? error.message : "Could not send the reply",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleFinish() {
    if (!session) return;
    setIsFinishing(true);
    try {
      if (demoMode && demoSession) {
        setDemoSession({ ...demoSession, status: "evaluating", pending: true });
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        setDemoSession((current) =>
          current
            ? {
                ...current,
                status: "complete",
                pending: false,
                feedback:
                  demoScenario === "ideation"
                    ? DEMO_IDEATION_FEEDBACK
                    : DEMO_FEEDBACK,
              }
            : current,
        );
        onCompleted?.();
        return;
      }
      if (!sessionId) return;
      await finishPractice({ sessionId });
      onCompleted?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not score the practice session",
      );
    } finally {
      setIsFinishing(false);
    }
  }

  function resetSession() {
    setSessionId(null);
    setDemoSession(null);
    setDraftReply("");
    setTurnRequestId(null);
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
        <MessagesSquareIcon data-icon="inline-start" />
        Practise
      </SheetTrigger>
      <SheetContent className="w-[98vw] gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="font-heading text-2xl">
            Practice arena
          </SheetTitle>
          <SheetDescription>
            Rehearse the exchange, not a script. The coach scores only what you
            actually say.
          </SheetDescription>
        </SheetHeader>

        {!session ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-6 p-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] text-copper uppercase">
                  Set the room
                </p>
                <h3 className="mt-2 font-heading text-3xl">
                  Who are you preparing to meet?
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {deliveryFormats.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={format === item.id}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      format === item.id &&
                        "border-copper bg-accent/40 ring-1 ring-copper",
                    )}
                    onClick={() => chooseFormat(item.id)}
                  >
                    <span className="font-semibold">{item.name}</span>
                    <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="practice-persona" className="text-sm font-semibold">
                  Counterpart
                </label>
                <Input
                  id="practice-persona"
                  value={persona}
                  onChange={(event) => setPersona(event.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  Describe the person, their role, and the constraint they are
                  protecting.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold">Pressure level</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      ["supportive", "Supportive"],
                      ["standard", "Realistic"],
                      ["challenging", "Challenging"],
                    ] as const
                  ).map(([value, label]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={difficulty === value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDifficulty(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {recentSessions && recentSessions.length > 0 ? (
                <div className="rounded-xl border p-4">
                  <p className="text-sm font-semibold">Recent practice</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recentSessions.map((recent) => (
                      <Button
                        key={recent._id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSessionId(recent._id)}
                      >
                        {getDeliveryFormat(recent.scenario.format).shortName}
                        <Badge variant="secondary">{recent.status}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              <Button
                type="button"
                size="lg"
                disabled={isStarting || persona.trim().length < 3}
                onClick={() => void handleStart()}
              >
                {isStarting ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SparklesIcon data-icon="inline-start" />
                )}
                {isStarting ? "Setting the scene" : "Enter the practice room"}
                {!isStarting ? <ArrowRightIcon data-icon="inline-end" /> : null}
              </Button>
            </div>
          </ScrollArea>
        ) : session.status === "complete" && session.feedback ? (
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={resetSession}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  New session
                </Button>
                <Badge variant="secondary">
                  {getDeliveryFormat(session.scenario.format).shortName}
                </Badge>
              </div>

              <div className="rounded-xl border bg-accent/30 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.16em] text-copper uppercase">
                      Coaching readout
                    </p>
                    <h3 className="mt-2 font-heading text-3xl">
                      Your practice signal
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="font-heading text-4xl text-copper">
                      {averageScore}
                    </span>
                    <span className="text-sm text-muted-foreground"> / 5</span>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {session.feedback.summary}
                </p>
              </div>

              <div className="grid gap-3">
                {session.feedback.criteria.map((criterion) => (
                  <div
                    key={criterion.criterionId}
                    className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_3rem]"
                  >
                    <div>
                      <p className="font-semibold">{criterion.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {criterion.rationale}
                      </p>
                      <p className="mt-2 text-xs font-medium text-copper">
                        Next: {criterion.nextStep}
                      </p>
                    </div>
                    <span className="font-heading text-3xl text-copper">
                      {criterion.score}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-xl border p-4">
                  <CheckCircle2Icon className="size-5 text-copper" />
                  <h3 className="mt-2 font-semibold">Strongest moment</h3>
                  <blockquote className="mt-3 font-document text-base italic leading-7">
                    “{session.feedback.strongestMoment.quote}”
                  </blockquote>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {session.feedback.strongestMoment.observation}
                  </p>
                </section>
                <section className="rounded-xl border p-4">
                  <TargetIcon className="size-5 text-copper" />
                  <h3 className="mt-2 font-semibold">Highest-leverage edit</h3>
                  <blockquote className="mt-3 font-document text-base italic leading-7">
                    “{session.feedback.weakestMoment.quote}”
                  </blockquote>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {session.feedback.weakestMoment.observation}
                  </p>
                </section>
              </div>

              <section className="rounded-xl border p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <DumbbellIcon className="size-4 text-copper" />
                  Practice drills
                </h3>
                <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {session.feedback.drills.map((drill, index) => (
                    <li key={drill}>
                      {index + 1}. {drill}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
              <div>
                <p className="text-sm font-semibold">{session.scenario.persona}</p>
                <p className="text-xs text-muted-foreground">
                  {getDeliveryFormat(session.scenario.format).shortName} ·{" "}
                  {session.scenario.difficulty} · {session.messages.length}/20
                  turns
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  isFinishing ||
                  session.pending ||
                  session.messages.length < 3
                }
                onClick={() => void handleFinish()}
              >
                {isFinishing || session.status === "evaluating" ? (
                  <Spinner data-icon="inline-start" />
                ) : null}
                End and score
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-4 p-6">
                {session.messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6",
                      message.role === "user"
                        ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm border bg-card",
                    )}
                  >
                    <p className="mb-1 text-[10px] font-semibold tracking-[0.14em] opacity-65 uppercase">
                      {message.role === "user" ? "You" : "Counterpart"}
                    </p>
                    {message.text}
                  </div>
                ))}
                {session.pending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Spinner />
                    {session.status === "evaluating"
                      ? "The coach is reviewing the transcript…"
                      : "The counterpart is considering your answer…"}
                  </div>
                ) : null}
                {session.error ? (
                  <p className="text-xs text-destructive">{session.error}</p>
                ) : null}
              </div>
            </ScrollArea>
            <div className="border-t p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  value={draftReply}
                  onChange={(event) => setDraftReply(event.target.value)}
                  placeholder="Answer as you would in the room…"
                  className="min-h-24 resize-none bg-paper"
                  maxLength={2_000}
                  disabled={
                    session.pending ||
                    session.status !== "active" ||
                    session.messages.length >= 19
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  className="mb-1 shrink-0"
                  disabled={
                    isSending ||
                    session.pending ||
                    !draftReply.trim() ||
                    session.messages.length >= 19
                  }
                  onClick={() => void handleReply()}
                >
                  {isSending ? <Spinner /> : <SendIcon />}
                  <span className="sr-only">Send reply</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
