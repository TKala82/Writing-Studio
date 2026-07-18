import type { GenreId } from "../../src/lib/genres";
import { runDeterministicChecks } from "../../src/lib/analysis/checks";
import { getGenreRubric } from "../../src/lib/genres";

export function isDemoPipelineEnabled(): boolean {
  const value = process.env.PIPELINE_DEMO_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export function demoPreflight() {
  return {
    questions: [
      {
        id: "contribution",
        question:
          "What concrete contribution do you want this fellowship to make possible?",
        whyItMatters:
          "Selection readers need a specific research ambition, not a generic desire to learn.",
        answerHint:
          "e.g. Produce an evaluation write-up others can reuse to probe hidden model tendencies",
      },
      {
        id: "evidence",
        question:
          "Which prior project is the strongest evidence that you can do this work?",
        whyItMatters:
          "The opening case should rest on work you have already done, not on enthusiasm alone.",
        answerHint:
          "Name the project, scope, and what it taught you that still shapes your question.",
      },
      {
        id: "fit",
        question:
          "What programme feature would change your next research step, and why?",
        whyItMatters:
          "Programme fit is persuasive only when tied to a missing capability or decision.",
        answerHint:
          "If you do not know yet, say so—the editor will keep the gap visible.",
      },
    ],
    blindSpots: [
      {
        id: "programme-feature",
        label: "Specific programme feature",
        whyItMatters:
          "Strong motivation statements name one resource and the decision it unlocks.",
        criterionId: "programme-fit",
      },
      {
        id: "future-output",
        label: "Concrete post-programme output",
        whyItMatters:
          "Readers need a usable success condition beyond 'learn more about AI safety'.",
        criterionId: "trajectory",
      },
    ],
    variants: [
      {
        id: "evidence-first",
        label: "Lead with proof",
        approach:
          "Open on the evaluation harness, then turn uncertainty into a research question.",
        openingDirection:
          "Start in the moment the 300-prompt experiment made a hidden tendency hard to ignore.",
      },
      {
        id: "question-first",
        label: "Lead with the research question",
        approach:
          "State the open question early, then show the evidence that made it urgent.",
        openingDirection:
          "Give the reader the sharpest version of the question before the biography.",
      },
      {
        id: "fit-first",
        label: "Lead with programme fit",
        approach:
          "Name the missing capability first, then prove you are ready to use it.",
        openingDirection:
          "Begin with the decision the fellowship would let you make more rigorously.",
      },
    ],
  };
}

const DEMO_FINAL = `My interest in AI safety became concrete while building a small evaluation harness for language-model outputs. Across 300 prompts, I tested how models handled conflicting instructions. The project left me with a question I want to investigate more rigorously: how much can behavioural evidence tell us about tendencies that are not visible in a model's ordinary responses?

That question drew me toward evaluations and mechanistic interpretability during an introductory AI safety course. I do not yet know which direction offers my strongest contribution, but I have started narrowing the uncertainty through independent work rather than treating the fellowship as a substitute for it.

After the fellowship, I intend to [ADD: state the concrete research output or decision this programme would enable]. My goal is not simply to learn more about AI safety. It is to identify a tractable research direction and produce work that helps others assess advanced systems more reliably.`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DemoStepStatus = "pending" | "active" | "complete" | "error";

interface DemoStep {
  id: string;
  label: string;
  status: DemoStepStatus;
  insight?: string;
}

export async function buildDemoPipelineResult(args: {
  draft: string;
  genre: GenreId;
  onProgress: (update: {
    stage:
      | "analyzing"
      | "proposing"
      | "rewriting"
      | "critiquing"
      | "revising"
      | "complete";
    steps: DemoStep[];
    extras?: Record<string, unknown>;
  }) => Promise<void>;
}): Promise<void> {
  const rubric = getGenreRubric(args.genre);
  let current: DemoStep[] = [
    { id: "analyze", label: "Understanding your draft", status: "pending" },
    { id: "propose", label: "Planning precise changes", status: "pending" },
    { id: "rewrite", label: "Rewriting with your rubric", status: "pending" },
    { id: "critique", label: "Running the quality review", status: "pending" },
    { id: "revise", label: "Applying the final polish", status: "pending" },
  ];

  const setStep = (
    id: string,
    status: DemoStepStatus,
    insight?: string,
  ): DemoStep[] =>
    current.map((step) =>
      step.id === id
        ? { ...step, status, insight: insight ?? step.insight }
        : step,
    );

  current = setStep("analyze", "active");
  await args.onProgress({ stage: "analyzing", steps: current });
  await sleep(1200);

  const facts = [
    {
      id: "fact-1",
      claim: "Built an evaluation harness for language-model outputs",
      sourceText:
        "Last year I built a small evaluation harness for language-model outputs as an independent project.",
    },
    {
      id: "fact-2",
      claim: "Tested conflicting instructions across 300 prompts",
      sourceText:
        "It tested whether models followed conflicting instructions across 300 prompts.",
    },
    {
      id: "fact-3",
      claim: "Completed an introductory AI safety course",
      sourceText:
        "later completed an introductory AI safety course. I especially enjoyed the sections on evaluations and mechanistic interpretability.",
    },
  ];
  const voiceSpec = {
    tone: "precise and reflective",
    formality: "professional",
    perspective: "first-person",
    sentenceStyle: "varied, concrete sentences with calibrated uncertainty",
    distinctiveTraits: ["evidence-led", "research-curious", "understated"],
    preserve: ["300-prompt experiment", "evaluations interest", "honest uncertainty"],
  };
  const proposedChanges = [
    {
      summary: "Open with visible proof",
      reason: "Selection reviewers need a concrete reason to keep reading.",
      location: "Opening paragraph",
    },
    {
      summary: "Turn uncertainty into a research question",
      reason: "Calibrated uncertainty is stronger than a generic passion claim.",
      location: "Paragraphs one and two",
    },
    {
      summary: "Expose missing programme evidence",
      reason: "A placeholder is safer than inventing fit.",
      location: "Programme-fit paragraph",
    },
  ];

  current = setStep(
    "analyze",
    "complete",
    `Locked ${facts.length} factual claims and mapped the voice`,
  );
  current = setStep(
    "propose",
    "complete",
    `Planned ${proposedChanges.length} focused edits`,
  );
  current = setStep("rewrite", "active");
  await args.onProgress({
    stage: "rewriting",
    steps: current,
    extras: {
      factInventory: facts,
      voiceSpec,
      proposedChanges,
    },
  });
  await sleep(900);

  // Stream the rewrite in chunks so the progress UI feels alive on camera.
  const finalText =
    args.genre === "motivation-statement" ? DEMO_FINAL : args.draft.trim();
  const chunkSize = Math.max(80, Math.floor(finalText.length / 4));
  for (
    let end = chunkSize;
    end < finalText.length;
    end += chunkSize
  ) {
    await args.onProgress({
      stage: "rewriting",
      steps: current,
      extras: { streamingText: finalText.slice(0, end) },
    });
    await sleep(450);
  }

  const checks = runDeterministicChecks(finalText, rubric);
  const changeLog = proposedChanges;
  current = setStep(
    "rewrite",
    "complete",
    `${checks.metrics.wordCount} words · grade ${checks.metrics.readabilityGrade}`,
  );
  current = setStep("critique", "active");
  await args.onProgress({
    stage: "critiquing",
    steps: current,
    extras: {
      streamingText: finalText,
      rewrittenText: finalText,
      changeLog,
      metrics: checks.metrics,
      deterministicFindings: checks.findings,
      bannedPhrases: checks.bannedPhrases,
    },
  });
  await sleep(1100);

  const critique = [
    {
      criterionId: "front-loaded-case",
      label: "Strongest case appears first",
      score: 4,
      passed: true,
      rationale:
        "The opening now starts with specific evidence rather than a broad claim.",
    },
    {
      criterionId: "specificity",
      label: "Passes the Any Applicant test",
      score: 3,
      passed: true,
      rationale:
        "The evaluation project and 300-prompt scope make the central case distinctive.",
    },
    {
      criterionId: "programme-fit",
      label: "Programme fit is precise",
      score: 2,
      passed: false,
      rationale:
        "The source does not provide a specific programme feature to connect to.",
      suggestion:
        "Replace the highlighted placeholder with one programme resource and why it matters.",
    },
  ];

  current = setStep("critique", "complete", "1 precise issue found");
  current = setStep("revise", "active");
  await args.onProgress({
    stage: "revising",
    steps: current,
    extras: { critique },
  });
  await sleep(1000);

  current = setStep(
    "revise",
    "complete",
    "Stopped after 1 revision with 1 issue still visible",
  );
  await args.onProgress({
    stage: "complete",
    steps: current,
    extras: {
      finalText,
      changeLog,
      critique,
      metrics: checks.metrics,
      deterministicFindings: checks.findings,
      bannedPhrases: checks.bannedPhrases,
    },
  });
}
