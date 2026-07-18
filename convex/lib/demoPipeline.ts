import type { GenreId } from "../../src/lib/genres";
import { runDeterministicChecks } from "../../src/lib/analysis/checks";
import { getGenreRubric } from "../../src/lib/genres";

function isTruthyFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

type EnvLike = Record<string, string | undefined>;

/**
 * Production deployments must never serve fixture editorial content.
 * Local / anonymous Convex may, but only with ALLOW_PIPELINE_DEMO_MODE=1.
 */
export function isProductionLikeDeployment(
  env: EnvLike = process.env,
): boolean {
  if (isTruthyFlag(env.LEDE_FORCE_PRODUCTION_GUARDS)) return true;
  const deployment = env.CONVEX_DEPLOYMENT?.trim() ?? "";
  if (deployment.startsWith("prod:")) return true;
  if (env.VERCEL_ENV === "production") return true;
  return false;
}

export function assertDemoModeAllowed(env: EnvLike = process.env): void {
  if (!isTruthyFlag(env.PIPELINE_DEMO_MODE)) return;
  if (isProductionLikeDeployment(env)) {
    throw new Error(
      "PIPELINE_DEMO_MODE cannot be enabled in production. Unset it (or set 0) and redeploy.",
    );
  }
  if (!isTruthyFlag(env.ALLOW_PIPELINE_DEMO_MODE)) {
    throw new Error(
      "PIPELINE_DEMO_MODE requires ALLOW_PIPELINE_DEMO_MODE=1 outside production.",
    );
  }
}

export function isDemoPipelineEnabled(env: EnvLike = process.env): boolean {
  if (!isTruthyFlag(env.PIPELINE_DEMO_MODE)) return false;
  assertDemoModeAllowed(env);
  return true;
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

const DEMO_FINAL = `Across 300 prompts, I watched a small test tool reveal a gap. A language model could seem to understand a task, then act in a very different way when two instructions clashed. I built the tool as an independent project to test which direction a model would follow. The results did not give me a neat answer. They gave me a better question: what can behaviour show us about model traits that normal use may hide?

Building the tool changed how I handle doubt. I had to turn a broad safety concern into cases I could test. I had to decide what counted as a real failure and look for patterns, not striking single outputs. When a result was unclear, I rewrote the prompt and checked whether the same behaviour appeared again. I learned that evaluation is not just a final score for a finished model. A good test helps define a risk so that people can study it.

An introductory AI safety course then gave me a wider map of the field. I was drawn to evaluations and mechanistic interpretability. They approach the same problem from different sides. Evaluations show what a system does under chosen conditions. Interpretability may help explain why it does it. I do not yet know where I can add the most value. I want to settle that question through real research, not wait for a syllabus to choose for me.

The fellowship's small-group mentoring and repeated project feedback would help me take that next step. I want to work with an evaluations researcher to sharpen one useful question and design a stronger test. I also want to learn when behavioural evidence needs support from interpretability methods. I would bring a habit of testing ideas on my own, writing down failures, and changing course when the evidence demands it. I would also bring the view of someone who has tried to turn a broad concern into a repeatable test.

By the end of the fellowship, I aim to produce a short public report and a reusable test plan for conflicting instructions. The report would state what the study can and cannot support. Other researchers could then repeat it or improve the design. In the longer term, I want to help labs and independent auditors assess advanced systems with more care. This fellowship is the right next step because it links a question I have already begun to test with the mentoring and hard feedback needed to make the work useful to others.`;

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
      summary: "Connect programme fit to a next step",
      reason:
        "The mentoring format now leads to a defined experiment and public output.",
      location: "Final two paragraphs",
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
      score: 4,
      passed: true,
      rationale:
        "The 300-prompt test, prompt revisions, and conflicting-instruction question make the case distinctive.",
    },
    {
      criterionId: "evidence",
      label: "Claims are backed by evidence",
      score: 4,
      passed: true,
      rationale:
        "Each claim about research ability is tied to a concrete choice made while building and revising the test.",
    },
    {
      criterionId: "programme-fit",
      label: "Programme fit is precise",
      score: 3,
      passed: true,
      rationale:
        "Small-group mentoring and repeated project feedback are connected to a stronger experiment and reusable output.",
    },
    {
      criterionId: "agency",
      label: "Signals agency and autonomy",
      score: 4,
      passed: true,
      rationale:
        "The applicant independently built, revised, and interpreted a test before seeking the fellowship.",
    },
  ];

  current = setStep("critique", "complete", "Every rubric check passed");
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
    "Passed after 1 targeted revision",
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
