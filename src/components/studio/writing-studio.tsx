"use client";

import {
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  FeatherIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { GenerationStatusBanner } from "@/components/studio/generation-status-banner";
import { GroundingCard } from "@/components/studio/grounding-card";
import { LibraryShelf } from "@/components/studio/library-shelf";
import {
  ModeSwitcher,
  type EntryMode,
} from "@/components/studio/mode-switcher";
import { NewRewriteForm } from "@/components/studio/new-rewrite-form";
import { PipelineProgress } from "@/components/studio/pipeline-progress";
import {
  PreflightInterview,
  type BlindSpot,
  type EditorialVariant,
  type PreflightQuestion,
} from "@/components/studio/preflight-interview";
import { ReviewWorkspace } from "@/components/studio/review-workspace";
import { ScratchStarter } from "@/components/studio/scratch-starter";
import { SourceDock } from "@/components/studio/source-dock";
import { TeachLedePanel } from "@/components/studio/teach-lede-panel";
import { VoiceProfileCard } from "@/components/studio/voice-profile-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getGenreRubric, type GenreId } from "@/lib/genres";

const FALLBACK_STEPS = [
  { id: "analyze", label: "Understanding your draft", status: "active" as const },
  {
    id: "propose",
    label: "Planning precise changes",
    status: "pending" as const,
  },
  {
    id: "rewrite",
    label: "Rewriting with your rubric",
    status: "pending" as const,
  },
  {
    id: "critique",
    label: "Running the quality review",
    status: "pending" as const,
  },
  {
    id: "revise",
    label: "Applying the final polish",
    status: "pending" as const,
  },
];

type ReviewRunData = ComponentProps<typeof ReviewWorkspace>["run"];
const ENTRY_MODE_STORAGE_KEY = "lede-entry-mode";

function isEntryMode(value: string | null): value is EntryMode {
  return value === "blank" || value === "sources" || value === "draft";
}

type DraftSubmission = {
  draft: string;
  genre: GenreId;
  customPurpose?: string;
  customRubricId?: Id<"customRubrics">;
};

interface PendingPreflight {
  sessionId?: Id<"preflightSessions">;
  input: DraftSubmission;
  questions: PreflightQuestion[];
  blindSpots: BlindSpot[];
  variants: EditorialVariant[];
  initialAnswers?: Record<string, string>;
  initialSelectedVariantId?: string;
}

interface PendingIdeation {
  interviewId?: Id<"ideationInterviews">;
  requestId: string;
  input: {
    genre: GenreId;
    customPurpose?: string;
  };
  questions: PreflightQuestion[];
  directions: EditorialVariant[];
}

const DEMO_IDEATION_QUESTIONS: PreflightQuestion[] = [
  {
    id: "audience",
    question: "Who needs to hear this, and what do they already understand?",
    whyItMatters: "The audience determines what needs explanation and what can move quickly.",
    answerHint: "e.g. AI governance practitioners who know the policy landscape but not this case",
  },
  {
    id: "belief",
    question: "What is the one thing you currently believe or want to test?",
    whyItMatters: "A draft needs a point of view, even when that view is provisional.",
    answerHint: "Write the claim in the plainest language you can.",
  },
  {
    id: "evidence",
    question: "What experience, example, or observation led you there?",
    whyItMatters: "Specific evidence keeps the first draft from becoming generic advice.",
    answerHint: "Describe one concrete moment, result, conversation, or pattern.",
  },
  {
    id: "outcome",
    question: "What should change after someone reads this?",
    whyItMatters: "The desired outcome gives the piece a useful ending and a reason to exist.",
    answerHint: "A decision, a question they reconsider, or one action they take.",
  },
];

const DEMO_IDEATION_DIRECTIONS: EditorialVariant[] = [
  {
    id: "case-first",
    label: "Lead with the case",
    approach: "Open on the concrete observation, then draw out the wider implication.",
    openingDirection: "Start in the moment when the pattern became impossible to ignore.",
  },
  {
    id: "claim-first",
    label: "Make the claim early",
    approach: "State the provisional thesis, support it, then name its limits.",
    openingDirection: "Give the reader the sharpest version of the idea in one sentence.",
  },
  {
    id: "question-first",
    label: "Invite inquiry",
    approach: "Use a focused question to organise evidence without pretending certainty.",
    openingDirection: "Ask the question your evidence can illuminate but not fully settle.",
  },
];

const DEMO_IDEATION_DRAFT = `A useful AI policy conversation should begin with the decision in front of us, not with a catalogue of every possible risk. In recent online discussions, I have noticed that broad framing often produces agreement in principle while leaving participants unclear about what should happen next.

I want to test a more practical approach: name the affected group, identify the evidence we actually have, and separate immediate safeguards from questions that still require investigation. [ADD: describe one concrete policy conversation or decision where this distinction mattered.]

The goal is not to make uncertainty disappear. It is to make uncertainty legible enough that people can act without overstating what they know. If readers take one thing from this piece, I want it to be a habit: before debating the entire future of AI, ask which decision must be made now and what evidence would change it.`;

const DEMO_FINAL = `My interest in AI safety became concrete while building a small evaluation harness for language-model outputs. Across 300 prompts, I tested how models handled conflicting instructions. The project left me with a question I want to investigate more rigorously: how much can behavioural evidence tell us about tendencies that are not visible in a model's ordinary responses?

That question drew me toward evaluations and mechanistic interpretability during an introductory AI safety course. I do not yet know which direction offers my strongest contribution, but I have started narrowing the uncertainty through independent work rather than treating the fellowship as a substitute for it.

This programme is a useful next step because [ADD: name the programme resource, mentor, or research format that directly supports this question]. I would bring experience turning a broad concern into a testable project, along with evidence that I can work through an open-ended problem without waiting for a prescribed assignment.

After the fellowship, I intend to [ADD: state the concrete research output or decision this programme would enable]. My goal is not simply to learn more about AI safety. It is to identify a tractable research direction and produce work that helps others assess advanced systems more reliably.`;

function createDemoRun(input: {
  draft: string;
  genre: GenreId;
  customPurpose?: string;
  demoScenario?: "fellowship" | "ideation";
}): ReviewRunData {
  const isMotivation = input.genre === "motivation-statement";
  const isIdeation = input.demoScenario === "ideation";
  return {
    _id: "demo-run" as Id<"runs">,
    documentId: "demo-document" as Id<"documents">,
    title:
      input.customPurpose ??
      (isIdeation
        ? "Blank-page policy post"
        : isMotivation
          ? "AI safety fellowship motivation"
          : "Preview draft"),
    demoScenario: isIdeation ? "ideation" : "fellowship",
    genre: input.genre,
    draft: input.draft,
    finalText: isMotivation ? DEMO_FINAL : input.draft,
    critique: isIdeation
      ? [
          {
            criterionId: "hook",
            label: "Opening earns attention",
            score: 4,
            passed: true,
            rationale:
              "The post opens with a practical contrast between decisions and broad risk catalogues.",
          },
          {
            criterionId: "single-idea",
            label: "One idea leads",
            score: 4,
            passed: true,
            rationale:
              "Evidence, inference, and immediate action remain the organising idea throughout.",
          },
          {
            criterionId: "platform-tone",
            label: "Tone fits the form",
            score: 3,
            passed: true,
            rationale:
              "The language is direct and specific, with one placeholder exposing the missing example.",
          },
        ]
      : [
      {
        criterionId: isMotivation ? "front-loaded-case" : "hook",
        label: isMotivation
          ? "Strongest case appears first"
          : "Opening earns attention",
        score: 4,
        passed: true,
        rationale:
          "The opening now starts with specific evidence rather than a broad claim.",
      },
      {
        criterionId: isMotivation ? "specificity" : "single-idea",
        label: isMotivation
          ? "Passes the Any Applicant test"
          : "One idea leads",
        score: 3,
        passed: true,
        rationale:
          "The evaluation project and 300-prompt scope make the central case distinctive.",
      },
      {
        criterionId: isMotivation ? "programme-fit" : "platform-tone",
        label: isMotivation ? "Programme fit is precise" : "Tone fits the form",
        score: 2,
        passed: false,
        rationale:
          "The source does not provide a specific programme feature to connect to.",
        suggestion:
          "Replace the highlighted placeholder with one programme resource and why it matters.",
      },
        ],
    deterministicFindings: [
      {
        id: "word-count",
        label: "Word count",
        passed: false,
        detail: "221 words · target 350–800",
      },
      {
        id: "readability",
        label: "Readability",
        passed: true,
        detail: "Grade 10.2 · target 9–12",
      },
      {
        id: "banned-phrases",
        label: "Original language",
        passed: true,
        detail: "No stock AI phrases detected",
      },
      {
        id: "sentence-variance",
        label: "Sentence rhythm",
        passed: true,
        detail: "Length variation 7.4 · target ≥ 4.0",
      },
    ],
    metrics: {
      wordCount: 221,
      readabilityGrade: 10.2,
      sentenceLengthDeviation: 7.4,
      passiveVoiceEstimate: 8,
    },
    changeLog: isIdeation
      ? [
          {
            summary: "Built a first claim from interview answers",
            reason:
              "The blank-page interview supplied the audience, belief, and desired outcome.",
            location: "Opening",
          },
          {
            summary: "Marked the missing example",
            reason:
              "The writer did not supply a concrete case, so the draft keeps the gap visible.",
            location: "Second paragraph",
          },
          {
            summary: "Closed on a usable reader habit",
            reason:
              "The requested outcome becomes a specific question readers can apply.",
            location: "Closing",
          },
        ]
      : [
      {
        summary: "Opened with visible proof",
        reason: "Selection reviewers need a concrete reason to keep reading.",
        location: "Opening paragraph",
      },
      {
        summary: "Turned uncertainty into a research question",
        reason: "Calibrated uncertainty is stronger than a generic passion claim.",
        location: "Paragraphs one and two",
      },
      {
        summary: "Exposed missing programme evidence",
        reason: "A placeholder is safer than inventing fit.",
        location: "Programme-fit paragraph",
      },
        ],
  };
}

function ClerkControls() {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return <UserButton />;
  }
  return (
    <SignInButton mode="modal">
      <Button size="sm">
        Sign in
        <ArrowRightIcon data-icon="inline-end" />
      </Button>
    </SignInButton>
  );
}

interface WritingStudioProps {
  clerkEnabled: boolean;
}

export function WritingStudio({ clerkEnabled }: WritingStudioProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [runId, setRunId] = useState<Id<"runs"> | null>(null);
  const [demoRun, setDemoRun] = useState<ReviewRunData | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("blank");
  const [shelfSeed, setShelfSeed] = useState("");
  const [shelfSeedGenre, setShelfSeedGenre] = useState<GenreId>();
  const [shelfSeedRevision, setShelfSeedRevision] = useState(0);
  const [pendingPreflight, setPendingPreflight] =
    useState<PendingPreflight | null>(null);
  const [ignoredPreflightSessionId, setIgnoredPreflightSessionId] = useState<
    Id<"preflightSessions"> | null
  >(null);
  const [pendingIdeation, setPendingIdeation] =
    useState<PendingIdeation | null>(null);
  const [userReady, setUserReady] = useState(false);
  const entryModeInitialised = useRef(false);
  const backendReady = clerkEnabled && isAuthenticated;
  const ensureUser = useMutation(api.users.ensure);
  const createDocument = useMutation(api.documents.create);
  const cancelPreflightSession = useMutation(api.preflight.cancel);
  const markPreflightContinued = useMutation(api.preflight.markContinued);
  const cancelIdeationInterview = useMutation(api.ideation.cancel);
  const runPipeline = useAction(api.pipelineActions.run);
  const runPreflight = useAction(api.pipelineActions.preflight);
  const runIdeationInterview = useAction(api.ideationActions.interview);
  const composeFromInterview = useAction(
    api.ideationActions.composeFromInterview,
  );
  const run = useQuery(
    api.documents.getRun,
    runId ? { runId } : "skip",
  );
  const recentDocuments = useQuery(
    api.library.listShelf,
    backendReady && userReady ? { limit: 60 } : "skip",
  );
  const openPreflight = useQuery(
    api.preflight.getOpen,
    backendReady && userReady && !runId && !pendingIdeation
      ? {}
      : "skip",
  );
  const workspaceReady = backendReady && userReady;
  const resumedPreflight: PendingPreflight | null =
    openPreflight &&
    openPreflight._id !== ignoredPreflightSessionId &&
    !pendingPreflight
      ? {
          sessionId: openPreflight._id,
          input: {
            draft: openPreflight.draft,
            genre: openPreflight.genre as GenreId,
            customPurpose: openPreflight.customPurpose,
            customRubricId: openPreflight.customRubricId,
          },
          questions: openPreflight.questions,
          blindSpots: openPreflight.blindSpots,
          variants: openPreflight.variants,
          initialAnswers: Object.fromEntries(
            (openPreflight.answers ?? []).map((answer) => [
              answer.questionId,
              answer.answer,
            ]),
          ),
          initialSelectedVariantId: openPreflight.selectedVariantId,
        }
      : null;
  const activePreflight = pendingPreflight ?? resumedPreflight;

  const disabledReason = !clerkEnabled
    ? "Add Clerk and model keys to .env.local to run the live editorial pipeline."
    : isLoading
      ? "Checking your private workspace…"
      : !isAuthenticated
        ? "Sign in to keep drafts private and start a rewrite."
        : !userReady
          ? "Preparing your private workspace…"
        : undefined;

  useEffect(() => {
    if (entryModeInitialised.current) return;

    let storedMode: string | null = null;
    try {
      storedMode = window.localStorage.getItem(ENTRY_MODE_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in hardened browsing contexts.
    }

    if (isEntryMode(storedMode)) {
      entryModeInitialised.current = true;
      setEntryMode(storedMode);
      return;
    }

    const documentListReady = recentDocuments !== undefined || !clerkEnabled;
    if (!documentListReady) return;

    entryModeInitialised.current = true;
    if (recentDocuments && recentDocuments.length > 0) {
      // Returning writers should land closest to work already in progress.
      setEntryMode("draft");
    }
  }, [clerkEnabled, recentDocuments]);

  useEffect(() => {
    if (!backendReady) {
      // Auth teardown must invalidate the user bootstrap before a later sign-in.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserReady(false);
      return;
    }
    let cancelled = false;
    void ensureUser()
      .then(() => {
        if (!cancelled) setUserReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setUserReady(false);
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not prepare your private workspace",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [backendReady, ensureUser]);

  function changeEntryMode(nextMode: EntryMode) {
    entryModeInitialised.current = true;
    setEntryMode(nextMode);
    try {
      window.localStorage.setItem(ENTRY_MODE_STORAGE_KEY, nextMode);
    } catch {
      // The switch still works when preference storage is unavailable.
    }
  }

  function startPipeline(nextRunId: Id<"runs">) {
    setRunId(nextRunId);
    void runPipeline({ runId: nextRunId }).catch((error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "The editorial pass stopped",
      );
    });
  }

  async function handleSubmit(input: DraftSubmission) {
    if (!clerkEnabled) {
      setDemoRun(createDemoRun(input));
      return;
    }
    try {
      await ensureUser();
      const result = await runPreflight(input);
      setIgnoredPreflightSessionId(null);
      setPendingPreflight({
        sessionId: result.sessionId,
        input,
        questions: result.questions,
        blindSpots: result.blindSpots,
        variants: result.variants,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the draft",
      );
    }
  }

  async function handlePreflightBack() {
    const sessionId = activePreflight?.sessionId;
    if (sessionId) setIgnoredPreflightSessionId(sessionId);
    setPendingPreflight(null);
    if (!sessionId || !clerkEnabled) return;
    try {
      await cancelPreflightSession({ sessionId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel the interview",
      );
    }
  }

  async function handlePreflightContinue(result: {
    writerContext: string;
    answers: Array<{ questionId: string; question: string; answer: string }>;
    selectedVariant?: EditorialVariant;
    skipped?: boolean;
  }) {
    if (!activePreflight) return;
    try {
      if (activePreflight.sessionId) {
        await markPreflightContinued({
          sessionId: activePreflight.sessionId,
          answers: result.answers,
          selectedVariantId: result.selectedVariant?.id,
        });
      }
      const variantContext = result.selectedVariant
        ? `\n\nChosen editorial direction: ${result.selectedVariant.label}\nApproach: ${result.selectedVariant.approach}\nOpening direction: ${result.selectedVariant.openingDirection}`
        : "";
      const skipNote = result.skipped
        ? "\n\nPreflight interview skipped by the writer."
        : "";
      const created = await createDocument({
        ...activePreflight.input,
        writerContext:
          `${result.writerContext}${variantContext}${skipNote}`.trim() ||
          undefined,
        blindSpots: activePreflight.blindSpots,
      });
      setPendingPreflight(null);
      setIgnoredPreflightSessionId(null);
      startPipeline(created.runId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not create the draft",
      );
    }
  }

  async function handleIdeationBack() {
    const interviewId = pendingIdeation?.interviewId;
    setPendingIdeation(null);
    if (!interviewId || !clerkEnabled) return;
    try {
      await cancelIdeationInterview({ interviewId });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not cancel the interview",
      );
    }
  }

  async function handleStartFromScratch(input: {
    genre: GenreId;
    customPurpose?: string;
    requestId: string;
  }) {
    const { requestId: interviewRequestId, ...writingInput } = input;
    if (!clerkEnabled) {
      setPendingIdeation({
        requestId: crypto.randomUUID(),
        input: writingInput,
        questions: DEMO_IDEATION_QUESTIONS,
        directions: DEMO_IDEATION_DIRECTIONS,
      });
      return;
    }
    try {
      await ensureUser();
      const result = await runIdeationInterview({
        ...writingInput,
        requestId: interviewRequestId,
      });
      setPendingIdeation({
        interviewId: result.interviewId,
        requestId: crypto.randomUUID(),
        input: writingInput,
        questions: result.questions,
        directions: result.directions,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the blank-page interview",
      );
    }
  }

  async function handleIdeationContinue(result: {
    writerContext: string;
    answers: Array<{ questionId: string; question: string; answer: string }>;
    selectedVariant?: EditorialVariant;
  }) {
    if (!pendingIdeation || !result.selectedVariant) return;
    if (!clerkEnabled) {
      setPendingIdeation(null);
      setDemoRun(
        createDemoRun({
          ...pendingIdeation.input,
          draft: DEMO_IDEATION_DRAFT,
          demoScenario: "ideation",
        }),
      );
      return;
    }
    if (!pendingIdeation.interviewId) return;
    try {
      const created = await composeFromInterview({
        interviewId: pendingIdeation.interviewId,
        directionId: result.selectedVariant.id,
        answers: result.answers.map(({ questionId, answer }) => ({
          questionId,
          answer,
        })),
        requestId: pendingIdeation.requestId,
      });
      setPendingIdeation(null);
      startPipeline(created.runId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not build the first draft",
      );
    }
  }

  if (demoRun) {
    return (
      <ReviewWorkspace
        run={demoRun}
        demoMode
        onStartOver={() => setDemoRun(null)}
      />
    );
  }

  if (activePreflight) {
    return (
      <PreflightInterview
        title={
          activePreflight.input.customPurpose ??
          getGenreRubric(activePreflight.input.genre).shortName.toLowerCase()
        }
        questions={activePreflight.questions}
        blindSpots={activePreflight.blindSpots}
        variants={activePreflight.variants}
        initialAnswers={activePreflight.initialAnswers}
        initialSelectedVariantId={activePreflight.initialSelectedVariantId}
        onBack={() => void handlePreflightBack()}
        onContinue={handlePreflightContinue}
      />
    );
  }

  if (pendingIdeation) {
    return (
      <PreflightInterview
        mode="ideation"
        title={
          pendingIdeation.input.customPurpose ??
          getGenreRubric(pendingIdeation.input.genre).shortName.toLowerCase()
        }
        questions={pendingIdeation.questions}
        blindSpots={[]}
        variants={pendingIdeation.directions}
        onBack={() => void handleIdeationBack()}
        onContinue={handleIdeationContinue}
      />
    );
  }

  if (runId) {
    if (!run) {
      return (
        <div className="min-h-screen px-4">
          <PipelineProgress title="Preparing your draft" steps={FALLBACK_STEPS} />
        </div>
      );
    }
    if (run.status === "complete" && run.finalText) {
      return (
        <ReviewWorkspace
          run={{
            ...run,
            genre: run.genre,
            finalText: run.finalText,
          }}
          onStartOver={() => setRunId(null)}
        />
      );
    }
    if (run.status === "error") {
      return (
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
          <Card className="w-full paper-shadow">
            <CardHeader>
              <Badge variant="destructive" className="mb-2 w-fit">
                Editorial pass stopped
              </Badge>
              <CardTitle className="font-heading text-3xl">
                The draft is safe. The pipeline needs attention.
              </CardTitle>
              <CardDescription>{run.error}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                onClick={() => {
                  runPipeline({ runId }).catch((error: unknown) =>
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Retry did not complete",
                    ),
                  );
                }}
              >
                <RefreshCwIcon data-icon="inline-start" />
                Retry
              </Button>
              <Button variant="outline" onClick={() => setRunId(null)}>
                Return to draft
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen px-4">
        <PipelineProgress
          title={run.title}
          steps={run.steps}
          streamingText={run.streamingText}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/78 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <FeatherIcon />
            </span>
            <div>
              <p className="font-heading text-xl leading-none">Lede</p>
              <p className="mt-1 text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                Genre-native writing studio
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:flex">
              <LockKeyholeIcon data-icon="inline-start" />
              Private drafts
            </Badge>
            {clerkEnabled ? (
              <ClerkControls />
            ) : (
              <Badge variant="secondary">Setup mode</Badge>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 lg:py-18">
        <div className="flex min-w-0 flex-col gap-10">
          <section className="flex flex-col gap-5">
            <Badge variant="outline" className="w-fit">
              <BookOpenTextIcon data-icon="inline-start" />
              The rules of the form, built in
            </Badge>
            <h1 className="max-w-3xl font-heading text-5xl leading-[0.98] tracking-[-0.035em] text-balance sm:text-6xl lg:text-7xl">
              Keep your meaning.
              <br />
              <span className="text-copper">Strengthen the signal.</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Begin with an idea, a rough draft, research paper, link, video,
              screenshot, or the newsletter sitting in your inbox. Lede finds
              defensible angles, locks the evidence, and shapes the writing to
              its form.
            </p>
          </section>

          <GenerationStatusBanner enabled={workspaceReady} />

          <Separator />

          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
              Step 1 · Choose how you begin
            </p>
            <p className="text-sm text-muted-foreground">
              Every path ends in the same editorial pipeline: analysis, a
              rubric-guided rewrite, and a visible quality review.
            </p>
          </div>

          <ModeSwitcher value={entryMode} onChange={changeEntryMode} />

          <div
            id={`entry-panel-${entryMode}`}
            role="tabpanel"
            aria-labelledby={`entry-mode-${entryMode}`}
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          >
            {entryMode === "blank" ? (
              <ScratchStarter
                disabled={clerkEnabled && !workspaceReady}
                librarianEnabled={workspaceReady}
                disabledReason={clerkEnabled ? disabledReason : undefined}
                onUsePassage={(passage) => {
                  setShelfSeed(passage);
                  setShelfSeedGenre(undefined);
                  setShelfSeedRevision((revision) => revision + 1);
                  changeEntryMode("draft");
                }}
                onOpenRun={setRunId}
                onStart={handleStartFromScratch}
              />
            ) : null}

            {entryMode === "sources" ? (
              <SourceDock
                enabled={workspaceReady}
                disabledReason={disabledReason}
                onRunCreated={startPipeline}
              />
            ) : null}

            {entryMode === "draft" ? (
              <div className="flex flex-col gap-7">
                <div className="flex flex-col gap-1">
                  <h2 className="font-heading text-3xl tracking-[-0.02em]">
                    Already know what you want to say?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Paste the honest version and move straight into the
                    genre-native editor.
                  </p>
                </div>
                <NewRewriteForm
                  key={shelfSeedRevision}
                  disabled={clerkEnabled && !workspaceReady}
                  canDetect={workspaceReady}
                  initialDraft={shelfSeed}
                  initialGenre={shelfSeedGenre}
                  onOpenRun={setRunId}
                  disabledReason={
                    clerkEnabled
                      ? disabledReason
                      : "Setup mode uses a local sample result so you can review the complete tracked-changes experience."
                  }
                  onSubmit={handleSubmit}
                />
              </div>
            ) : null}
          </div>

          {recentDocuments && recentDocuments.length > 0 ? (
            <>
              <Separator />
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
                    Continue where you left off
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Reopen a recent piece to keep refining it in the same
                    editorial record.
                  </p>
                </div>
                <LibraryShelf
                  documents={recentDocuments}
                  onOpenRun={setRunId}
                  onEditDraft={(draftText, genre) => {
                    setShelfSeed(draftText);
                    setShelfSeedGenre(genre);
                    setShelfSeedRevision((revision) => revision + 1);
                    changeEntryMode("draft");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </div>
            </>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:pt-28">
          {workspaceReady ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
                Lede&apos;s memory of you
              </p>
              <p className="text-sm text-muted-foreground">
                Everything here quietly shapes every draft, interview, and
                rewrite — set it once, refine it as you go.
              </p>
            </div>
          ) : null}
          <GroundingCard enabled={workspaceReady} />
          <VoiceProfileCard enabled={workspaceReady} />
          <TeachLedePanel enabled={workspaceReady} />
          {workspaceReady ? null : (
          <Card className="sticky top-8 overflow-hidden [--card-spacing:--spacing(5)] paper-shadow">
            <CardHeader>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                One quiet interface
              </p>
              <CardTitle className="font-heading text-3xl leading-tight">
                Depth without a prompt-engineering course.
              </CardTitle>
              <CardDescription className="leading-relaxed">
                Three specialised models, one visible editorial record.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {[
                {
                  number: "01",
                  title: "Sources become evidence",
                  body: "Papers, links, images, and video become traceable claims.",
                },
                {
                  number: "02",
                  title: "Your angle leads",
                  body: "Suggestions respond to your interpretation, not a generic summary.",
                },
                {
                  number: "03",
                  title: "One editorial record",
                  body: "Source-backed drafts enter the same rubric, diff, and review flow.",
                },
              ].map((item) => (
                <div
                  key={item.number}
                  className="grid grid-cols-[2rem_1fr] gap-3"
                >
                  <span className="font-heading text-lg text-copper">
                    {item.number}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}
        </aside>
      </main>
    </div>
  );
}
