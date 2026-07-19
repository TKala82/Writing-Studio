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

type DetectedGenre =
  | "motivation-statement"
  | "resume"
  | "cover-letter"
  | "social-post"
  | "forum-essay"
  | "research-statement"
  | "outreach-email"
  | "policy-brief"
  | "social-thread";

/** Heuristic classifier for local demo mode (no live model keys). */
export function demoDetectGenre(draft: string): {
  genre: DetectedGenre;
  confidence: "high" | "medium" | "low";
  reason: string;
} {
  const text = draft.toLowerCase();
  const rules: Array<{
    genre: DetectedGenre;
    score: number;
    reason: string;
  }> = [
    {
      genre: "resume",
      score:
        Number(/\b(experience|education|skills|employment)\b/.test(text)) * 2 +
        Number(/\b(bachelor|master|phd|linkedin)\b/.test(text)),
      reason: "Looks like a résumé: credentials and experience sections.",
    },
    {
      genre: "cover-letter",
      score:
        Number(/\b(dear hiring|i am writing to apply|vacancy|position)\b/.test(text)) *
          3 +
        Number(/\b(cover letter|application for)\b/.test(text)) * 2,
      reason: "Reads as a cover letter addressed to a hiring decision.",
    },
    {
      genre: "outreach-email",
      score:
        Number(/\b(hi |hello |dear )\b/.test(text)) +
        Number(/\b(would you|could we|follow up|intro)\b/.test(text)) +
        Number(/\bsubject:|best regards|kind regards\b/.test(text)),
      reason: "Looks like outreach email: greeting and a concrete ask.",
    },
    {
      genre: "social-thread",
      score:
        Number(/\b(1\/|2\/|thread|tweet)\b/.test(text)) * 3 +
        Number((text.match(/\n\d+[\.\/]/g) ?? []).length),
      reason: "Looks like a numbered social thread.",
    },
    {
      genre: "social-post",
      score:
        Number(draft.trim().length < 900) +
        Number(/\b(linkedin|post|hook|audience)\b/.test(text)),
      reason: "Short, post-like draft suited to a social update.",
    },
    {
      genre: "policy-brief",
      score:
        Number(/\b(policy|regulation|recommendation|stakeholders)\b/.test(text)) *
          2 +
        Number(/\b(brief|executive summary)\b/.test(text)),
      reason: "Uses policy-brief framing and recommendations.",
    },
    {
      genre: "research-statement",
      score:
        Number(/\b(research agenda|methodology|hypothesis|contribution)\b/.test(text)) *
          2 +
        Number(/\b(literature|findings|methods)\b/.test(text)),
      reason: "Sounds like a research statement or statement of purpose.",
    },
    {
      genre: "forum-essay",
      score:
        Number(/\b(i argue|in this essay|counterargument|however)\b/.test(text)) *
          2 +
        Number(draft.trim().length > 1200),
      reason: "Longer argumentative prose suited to a forum essay.",
    },
    {
      genre: "motivation-statement",
      score:
        Number(
          /\b(fellowship|motivation|why i|programme|program|aspir)\b/.test(text),
        ) * 2 +
        Number(/\b(learn|contribute|opportunity)\b/.test(text)),
      reason: "Motivation / fellowship language and personal trajectory.",
    },
  ];

  const ranked = [...rules].sort((a, b) => b.score - a.score);
  const best = ranked[0];
  if (!best || best.score <= 0) {
    return {
      genre: "motivation-statement",
      confidence: "low",
      reason:
        "Demo classifier: no strong format cues; defaulting to fellowship statement.",
    };
  }
  return {
    genre: best.genre,
    confidence: best.score >= 3 ? "high" : best.score >= 2 ? "medium" : "low",
    reason: `Demo classifier: ${best.reason}`,
  };
}

/** Local / cloud-agent fixture when live model keys are unavailable. */
export function demoIdeationInterview(genreName: string) {
  return {
    questions: [
      {
        id: "audience",
        question: `Who will read this ${genreName}, and what decision should it help them make?`,
        whyItMatters:
          "Audience and decision shape tone, evidence, and what belongs in the opening.",
        answerHint: "e.g. A fellowship selection committee deciding whom to shortlist",
      },
      {
        id: "evidence",
        question:
          "What concrete experience, project, or evidence can you already put on the page?",
        whyItMatters:
          "A grounded first draft needs material you already have, not invented credentials.",
        answerHint: "Name one project, result, or moment you can describe precisely",
      },
      {
        id: "stakes",
        question: "What changes for you if this piece succeeds—or fails?",
        whyItMatters:
          "Stakes keep the draft honest about urgency without forcing false certainty.",
        answerHint: "Describe the next step this writing unlocks for you",
      },
      {
        id: "uncertainty",
        question:
          "Where are you still unsure, and what would you rather leave open than invent?",
        whyItMatters:
          "Strong early drafts preserve uncertainty instead of papering over gaps.",
        answerHint: "Name the gap you want the draft to mark as [ADD: …]",
      },
    ],
    directions: [
      {
        id: "evidence-first",
        label: "Lead with proof",
        approach:
          "Open on the strongest concrete experience, then turn it into the reader's decision.",
        openingDirection:
          "Start in the moment the evidence became hard to ignore.",
      },
      {
        id: "decision-first",
        label: "Lead with the reader's decision",
        approach:
          "State the decision the piece supports, then supply only the evidence that moves it.",
        openingDirection:
          "Give the reader the choice before the biography.",
      },
      {
        id: "question-first",
        label: "Lead with the open question",
        approach:
          "Begin from honest uncertainty, then show the work that makes the question worth asking.",
        openingDirection:
          "Name the unresolved question before claiming a settled path.",
      },
    ],
  };
}

export function demoComposeFromInterview(args: {
  genreName: string;
  directionLabel: string;
  answers: Array<{ questionId: string; question: string; answer: string }>;
}): {
  facts: Array<{ id: string; claim: string; sourceText: string }>;
  title: string;
  draft: string;
  factIdsUsed: string[];
} {
  const facts = args.answers.slice(0, 6).map((item, index) => {
    const sourceText = item.answer.trim().slice(0, 180);
    return {
      id: `demo-fact-${index + 1}`,
      claim: `The writer stated: ${sourceText}`,
      sourceText,
    };
  });
  const body = args.answers
    .map((item) => item.answer.trim())
    .filter(Boolean)
    .join("\n\n");
  const draft = [
    `This first ${args.genreName.toLowerCase()} draft follows the "${args.directionLabel}" direction.`,
    "",
    body ||
      "[ADD: answer at least two interview questions so the draft can use your own material.]",
    "",
    "What remains open should stay marked rather than invented:",
    "[ADD: any missing evidence, programme detail, or outcome you still need to decide.]",
  ].join("\n");
  return {
    facts,
    title: `Draft: ${args.directionLabel}`,
    draft,
    factIdsUsed: facts.map((fact) => fact.id),
  };
}

const PLAYBOOK_GENRE_CUES: Array<{
  genre: GenreId;
  pattern: RegExp;
}> = [
  { genre: "motivation-statement", pattern: /\b(fellowship|motivation|application essay)\b/i },
  { genre: "resume", pattern: /\b(r[eé]sum[eé]|cv|work experience)\b/i },
  { genre: "cover-letter", pattern: /\b(cover letter|job application|hiring manager)\b/i },
  { genre: "social-post", pattern: /\b(social post|linkedin post|short-form post)\b/i },
  { genre: "forum-essay", pattern: /\b(forum essay|long-form essay|argumentative essay)\b/i },
  { genre: "research-statement", pattern: /\b(research statement|research agenda|methodology)\b/i },
  { genre: "outreach-email", pattern: /\b(outreach email|cold email|follow-up email)\b/i },
  { genre: "policy-brief", pattern: /\b(policy brief|policy memo|recommendation)\b/i },
  { genre: "social-thread", pattern: /\b(social thread|twitter thread|x thread)\b/i },
];

/**
 * Deterministic fallback for previewing the Teach Lede flow without a model key.
 * It deliberately extracts only explicit advice; it does not invent a doctrine.
 */
export function demoDistillPlaybook(emailContent: string): {
  title: string;
  genres: GenreId[];
  appliesToAll: boolean;
  tips: Array<{ kind: "do" | "avoid"; text: string }>;
} {
  const content = emailContent.trim();
  const subjectMatch = content.match(/^subject:\s*(.+)$/im);
  const firstLine = content.split(/\r?\n/).find((line) => line.trim().length >= 3);
  const titleSource = subjectMatch?.[1] ?? firstLine ?? "Email writing guidance";
  const title = titleSource.replace(/^[-*#\s]+/, "").trim().slice(0, 120);

  const genres = PLAYBOOK_GENRE_CUES.filter(({ pattern }) =>
    pattern.test(content),
  ).map(({ genre }) => genre);
  const appliesToAll = genres.length === 0;

  const candidateLines = content
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 18 && line.length <= 500)
    .filter((line) => !/^subject:/i.test(line));
  const uniqueLines = [...new Set(candidateLines)];
  const tips = uniqueLines.slice(0, 8).map((text) => ({
    kind: /\b(avoid|don't|do not|never|instead of|stop)\b/i.test(text)
      ? ("avoid" as const)
      : ("do" as const),
    text,
  }));

  return {
    title: title.length >= 3 ? title : "Email writing guidance",
    genres,
    appliesToAll,
    tips:
      tips.length > 0
        ? tips
        : [
            {
              kind: "do",
              text: "Review the pasted guidance and keep only advice stated explicitly in the source.",
            },
          ],
  };
}
