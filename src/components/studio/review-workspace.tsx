"use client";

import { useAction, useMutation } from "convex/react";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardIcon,
  ListChecksIcon,
  RotateCcwIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DeliveryBriefing } from "@/components/studio/delivery-briefing";
import { PracticeArena } from "@/components/studio/practice-arena";
import { ReadinessReport } from "@/components/studio/readiness-report";
import { ReviewGuide } from "@/components/studio/review-guide";
import { RubricScorecard } from "@/components/studio/rubric-scorecard";
import {
  SelectionContextMenu,
  type SelectionTool,
} from "@/components/studio/selection-context-menu";
import {
  SelectionToolsPanel,
  type LegalLensView,
  type RewordOption,
} from "@/components/studio/selection-tools-panel";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getGenreRubric,
  type GenreId,
  type GenreRubric,
} from "@/lib/genres";
import { extractLookupWord, lookupDefinition } from "@/lib/lexicon/dictionary";
import { lookupThesaurus } from "@/lib/lexicon/thesaurus";
import type { DictionaryResult, ThesaurusResult } from "@/lib/lexicon/types";
import {
  applyHunkDecisions,
  countChangedHunks,
  createSemanticDiff,
  type DiffSegment,
  type HunkDecision,
} from "@/lib/diff/semantic-diff";

interface ReviewRun {
  _id: Id<"runs">;
  documentId: Id<"documents">;
  title: string;
  genre: GenreId;
  demoScenario?: "fellowship" | "ideation";
  customRubric?: {
    name: string;
    description: string;
    baseGenre: GenreId;
    accent: string;
    systemPrompt: string;
    length: GenreRubric["length"];
    criteria: GenreRubric["criteria"];
    preferredPatterns: string[];
    discouragedPatterns: string[];
  };
  draft: string;
  finalText: string;
  factInventory?: Array<{
    id: string;
    claim: string;
    sourceText: string;
    sourceId?: string;
    sourceTitle?: string;
  }>;
  blindSpots?: Array<{
    id: string;
    label: string;
    whyItMatters: string;
    criterionId?: string;
  }>;
  changeLog?: Array<{ summary: string; reason: string; location: string }>;
  critique?: Array<{
    criterionId: string;
    label: string;
    score: number;
    passed: boolean;
    rationale: string;
    suggestion?: string;
  }>;
  deterministicFindings?: Array<{
    id: string;
    label: string;
    passed: boolean;
    detail: string;
  }>;
  metrics?: {
    wordCount: number;
    readabilityGrade: number;
    sentenceLengthDeviation: number;
    passiveVoiceEstimate: number;
  };
  shipProgress?: {
    readinessCheckedAt?: number;
    deliveryOpenedAt?: number;
    deliveryBriefingId?: Id<"deliveryBriefings">;
    practiceCompletedAt?: number;
    savedAt?: number;
  };
}

interface ReviewWorkspaceProps {
  run: ReviewRun;
  onStartOver: () => void;
  demoMode?: boolean;
}

function HeaderTooltip({
  children,
  content,
  id,
  onInteract,
}: {
  children: ReactNode;
  content: string;
  id?: string;
  onInteract?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <span
            id={id}
            className="inline-flex"
            onClickCapture={onInteract}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocusCapture={() => setOpen(true)}
            onBlurCapture={() => setOpen(false)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{content}</TooltipContent>
    </Tooltip>
  );
}

function renderWithPlaceholders(
  text: string,
  onPlaceholderClick?: (placeholder: string) => void,
) {
  return text.split(/(\[ADD:[^\]]+\])/g).map((part, index) =>
    part.startsWith("[ADD:") ? (
      onPlaceholderClick ? (
        <button
          key={`${part}-${index}`}
          type="button"
          className="mx-0.5 inline rounded bg-accent px-1 text-left text-accent-foreground underline decoration-dotted underline-offset-4 transition-colors hover:bg-copper hover:text-copper-foreground"
          title="Answer this missing-information prompt"
          onClick={() => onPlaceholderClick(part)}
        >
          {part}
        </button>
      ) : (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-accent px-1 text-accent-foreground"
        >
          {part}
        </mark>
      )
    ) : (
      <Fragment key={`${part.slice(0, 12)}-${index}`}>{part}</Fragment>
    ),
  );
}

function DiffText({
  segments,
  onPlaceholderClick,
}: {
  segments: DiffSegment[];
  onPlaceholderClick?: (placeholder: string) => void;
}) {
  return (
    <>
      {segments.map((segment, index) => (
        <span
          key={`${segment.kind}-${index}-${segment.text.slice(0, 8)}`}
          className={
            segment.kind === "insert"
              ? "diff-insert"
              : segment.kind === "delete"
                ? "diff-delete"
                : undefined
          }
        >
          {renderWithPlaceholders(segment.text, onPlaceholderClick)}
        </span>
      ))}
    </>
  );
}

function expandToSentence(fullText: string, selection: string): string {
  const index = fullText.indexOf(selection);
  if (index < 0 || selection.split(/\s+/).length > 3) return selection;
  const before = fullText.slice(0, index);
  const after = fullText.slice(index + selection.length);
  const start =
    Math.max(before.lastIndexOf("."), before.lastIndexOf("?"), before.lastIndexOf("!")) +
    1;
  const relativeEnds = [after.indexOf("."), after.indexOf("?"), after.indexOf("!")]
    .filter((value) => value >= 0)
    .sort((a, b) => a - b);
  const endOffset = relativeEnds[0];
  const end =
    endOffset === undefined
      ? fullText.length
      : index + selection.length + endOffset + 1;
  return fullText.slice(start, end).trim() || selection;
}

function createDemoLegal(selection: string): LegalLensView {
  const lower = selection.toLowerCase();
  const hitPopia =
    /personal|data|consent|privacy|email|customer/.test(lower);
  const hitGift = /gift card|voucher|prepaid/.test(lower);
  return {
    applicable: [
      ...(hitPopia
        ? [
            {
              regimeId: "popia" as const,
              confidence: "medium" as const,
              whyItApplies:
                "The passage discusses personal information or customer contact details in a way that can engage POPIA processing duties.",
              relevantProvisions: [
                "POPIA s4–s5 — lawful, purpose-limited processing",
                "POPIA s18 — notification to data subjects",
              ],
              riskFlags: [
                "Claiming blanket consent covers all future uses",
              ],
              suggestedRewording:
                "We process the contact details you provide only for the stated purpose, and we will not share them without a lawful basis.",
            },
          ]
        : []),
      ...(hitGift
        ? [
            {
              regimeId: "gift-cards" as const,
              confidence: "high" as const,
              whyItApplies:
                "The text refers to prepaid value that CPA s63 treats as a prepaid certificate/gift instrument.",
              relevantProvisions: [
                "CPA s63 — prepaid certificates generally redeemable for at least three years",
              ],
              riskFlags: [
                "Advertising a gift card that expires in under three years without a lawful exception",
              ],
            },
          ]
        : []),
    ],
    notApplicable: [
      {
        regimeId: "eu-ai-act",
        reason: "No EU-facing AI system placement or deployer role is described.",
      },
      {
        regimeId: "crypto-stablecoins",
        reason: "No crypto-asset or stablecoin activity is described.",
      },
    ],
    overallNote:
      "Demo legal lens only. Connect Clerk and model keys for live regime matching. This is not legal advice.",
  };
}

export function ReviewWorkspace({
  run,
  onStartOver,
  demoMode = false,
}: ReviewWorkspaceProps) {
  const rubric: GenreRubric = run.customRubric
    ? {
        id: run.customRubric.baseGenre,
        name: run.customRubric.name,
        shortName: run.customRubric.name,
        description: run.customRubric.description,
        icon: "file",
        accent: run.customRubric.accent,
        systemPrompt: run.customRubric.systemPrompt,
        length: run.customRubric.length,
        criteria: run.customRubric.criteria,
        preferredPatterns: run.customRubric.preferredPatterns,
        discouragedPatterns: run.customRubric.discouragedPatterns,
      }
    : getGenreRubric(run.genre);
  const [revisionText, setRevisionText] = useState(run.finalText);
  const hunks = useMemo(
    () => createSemanticDiff(run.draft, revisionText),
    [revisionText, run.draft],
  );
  const [decisions, setDecisions] = useState<Record<string, HunkDecision>>({});
  const [selectedText, setSelectedText] = useState("");
  const [selectionInstruction, setSelectionInstruction] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<SelectionTool | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loadingTool, setLoadingTool] = useState(false);
  const [toolError, setToolError] = useState<string | undefined>();
  const [dictionary, setDictionary] = useState<DictionaryResult | null>(null);
  const [thesaurus, setThesaurus] = useState<ThesaurusResult | null>(null);
  const [rewordOptions, setRewordOptions] = useState<RewordOption[]>([]);
  const [rewordExplanation, setRewordExplanation] = useState("");
  const [legal, setLegal] = useState<LegalLensView | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyAfterSave, setDirtyAfterSave] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const rewriteSelection = useAction(api.pipelineActions.rewriteSelection);
  const runLegalLens = useAction(api.selectionActions.legalLens);
  const saveAcceptedText = useMutation(api.documents.saveAcceptedText);
  const markShipProgress = useMutation(api.documents.markShipProgress);
  const ship = run.shipProgress;
  const readinessVisited = Boolean(ship?.readinessCheckedAt);
  const deliveryVisited = Boolean(ship?.deliveryOpenedAt);
  const practiceVisited = Boolean(ship?.practiceCompletedAt);
  const isSaved = Boolean(ship?.savedAt);
  const showPostSaveCta = isSaved && !dirtyAfterSave;

  function persistShipProgress(patch: {
    readinessChecked?: boolean;
    deliveryOpened?: boolean;
    practiceCompleted?: boolean;
    saved?: boolean;
  }) {
    if (demoMode) return;
    void markShipProgress({ runId: run._id, ...patch }).catch(
      (error: unknown) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save review progress",
        );
      },
    );
  }
  const changedCount = countChangedHunks(hunks);
  const acceptedCount = hunks.filter(
    (hunk) => hunk.changed && decisions[hunk.id] === "accepted",
  ).length;
  const rejectedCount = hunks.filter(
    (hunk) => hunk.changed && decisions[hunk.id] === "rejected",
  ).length;
  const pendingCount = changedCount - acceptedCount - rejectedCount;
  const currentText = useMemo(
    () => applyHunkDecisions(hunks, decisions),
    [decisions, hunks],
  );
  const wordLookupEnabled = Boolean(extractLookupWord(selectedText));

  function setAllDecisions(decision: HunkDecision) {
    setDirtyAfterSave(true);
    setDecisions(
      Object.fromEntries(
        hunks
          .filter((hunk) => hunk.changed)
          .map((hunk) => [hunk.id, decision]),
      ),
    );
  }

  function readSelection(): string | null {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !articleRef.current?.contains(selection.anchorNode)
    ) {
      return null;
    }
    const value = selection.toString().trim();
    return value.length >= 2 ? value : null;
  }

  function handleContextMenu(event: React.MouseEvent<HTMLElement>) {
    const value = readSelection();
    if (!value) return;
    event.preventDefault();
    setSelectedText(value);
    setMenu({ x: event.clientX, y: event.clientY });
    setToolError(undefined);
  }

  function resetToolResults() {
    setDictionary(null);
    setThesaurus(null);
    setRewordOptions([]);
    setRewordExplanation("");
    setLegal(null);
    setToolError(undefined);
  }

  function openPlaceholder(placeholder: string) {
    setSelectedText(placeholder);
    setSelectionInstruction("");
    resetToolResults();
    setActiveTool("custom");
    setPanelOpen(true);
  }

  async function runReword(instruction: string, selection = selectedText) {
    setLoadingTool(true);
    setToolError(undefined);
    try {
      if (demoMode) {
        const isPlaceholder = /^\[ADD:[^\]]+\]$/.test(selection.trim());
        const suppliedDetail = instruction
          .trim()
          .replace(
            /^replace\s+(?:the\s+)?placeholder\s+with\s+/i,
            "",
          );
        if (isPlaceholder && suppliedDetail) {
          const sentenceDetail = suppliedDetail.replace(
            /^./,
            (character) => character.toUpperCase(),
          );
          const directReplacement = /[.!?]$/.test(sentenceDetail)
            ? sentenceDetail
            : `${sentenceDetail}.`;
          setRewordOptions([
            {
              label: "Use supplied detail",
              rewrittenSelection: directReplacement,
            },
            {
              label: "Connect it to the argument",
              rewrittenSelection: `This matters because ${suppliedDetail
                .replace(/[.!?]$/, "")
                .replace(/^./, (character) => character.toLowerCase())}.`,
            },
          ]);
          setRewordExplanation(
            "Demo alternatives use only the detail you supplied; no new fact was added.",
          );
          return;
        }
        const expanded = expandToSentence(currentText, selection);
        setRewordOptions([
          {
            label: "Tighter",
            rewrittenSelection: expanded.replace(/\s+/g, " ").replace(/,\s+/g, ", "),
          },
          {
            label: "Clearer",
            rewrittenSelection: `${expanded} [ADD: refine this claim with one concrete detail]`,
          },
        ]);
        setRewordExplanation(
          "Demo alternatives only. Connect Clerk and model keys for live fact-locked rewrites.",
        );
        return;
      }
      const result = await rewriteSelection({
        runId: run._id,
        genre: run.genre,
        selection,
        instruction,
        surroundingText: currentText,
      });
      setRewordOptions(result.options);
      setRewordExplanation(result.explanation);
    } catch (error) {
      setToolError(
        error instanceof Error ? error.message : "Could not rewrite selection",
      );
    } finally {
      setLoadingTool(false);
    }
  }

  async function handleToolSelect(tool: SelectionTool) {
    setMenu(null);
    setActiveTool(tool);
    setPanelOpen(true);
    resetToolResults();
    setSelectionInstruction("");

    if (tool === "custom") return;

    if (tool === "define") {
      setLoadingTool(true);
      try {
        setDictionary(await lookupDefinition(selectedText));
      } catch (error) {
        setToolError(
          error instanceof Error ? error.message : "Dictionary lookup failed",
        );
      } finally {
        setLoadingTool(false);
      }
      return;
    }

    if (tool === "synonyms") {
      setLoadingTool(true);
      try {
        setThesaurus(await lookupThesaurus(selectedText));
      } catch (error) {
        setToolError(
          error instanceof Error ? error.message : "Thesaurus lookup failed",
        );
      } finally {
        setLoadingTool(false);
      }
      return;
    }

    if (tool === "reword") {
      const target = expandToSentence(currentText, selectedText);
      setSelectedText(target);
      await runReword(
        "Offer clearer alternatives that preserve meaning, voice, and every locked fact.",
        target,
      );
      return;
    }

    if (tool === "legal") {
      setLoadingTool(true);
      try {
        if (demoMode) {
          setLegal(createDemoLegal(selectedText));
        } else {
          setLegal(
            await runLegalLens({
              selection: selectedText,
              surroundingText: currentText,
            }),
          );
        }
      } catch (error) {
        setToolError(
          error instanceof Error ? error.message : "Legal lens failed",
        );
      } finally {
        setLoadingTool(false);
      }
    }
  }

  function confirmDecisionReset(): boolean {
    if (Object.keys(decisions).length === 0) return true;
    return window.confirm(
      "Applying this change will clear your accept/reject decisions for every edit. Continue?",
    );
  }

  function applyReplacement(next: string) {
    if (!selectedText || !currentText.includes(selectedText)) {
      toast.error("The selected passage changed. Select it again.");
      return;
    }
    if (!confirmDecisionReset()) return;
    setRevisionText(currentText.replace(selectedText, next));
    setDecisions({});
    setDirtyAfterSave(true);
    setPanelOpen(false);
    setActiveTool(null);
    toast.success("Selection updated");
  }

  function applySynonym(word: string) {
    const lookup = extractLookupWord(selectedText);
    if (!lookup) {
      toast.error("Select a word to replace");
      return;
    }
    if (!currentText.includes(selectedText)) {
      toast.error("The selected passage changed. Select it again.");
      return;
    }
    if (!confirmDecisionReset()) return;
    const replacedSelection = selectedText.replace(
      new RegExp(`\\b${lookup}\\b`, "i"),
      word,
    );
    setRevisionText(currentText.replace(selectedText, replacedSelection));
    setDecisions({});
    setDirtyAfterSave(true);
    setPanelOpen(false);
    setActiveTool(null);
    toast.success(`Replaced with “${word}”`);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(currentText);
    toast.success("Accepted version copied");
  }

  async function handleSave() {
    if (demoMode) {
      toast.info("Connect Clerk and model keys to save live drafts");
      return;
    }
    setIsSaving(true);
    try {
      const criterionIds = (run.critique ?? []).map(
        (criterion) => criterion.criterionId,
      );
      const explicitDecisions = hunks
        .filter(
          (hunk) =>
            hunk.changed &&
            (decisions[hunk.id] === "accepted" ||
              decisions[hunk.id] === "rejected"),
        )
        .map((hunk) => ({
          hunkId: hunk.id,
          decision: decisions[hunk.id] as "accepted" | "rejected",
          criterionIds,
        }));
      await saveAcceptedText({
        documentId: run.documentId,
        runId: run._id,
        acceptedText: currentText,
        revisionText,
        decisions: explicitDecisions,
      });
      setDirtyAfterSave(false);
      toast.success("Accepted version saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setIsSaving(false);
    }
  }

  const scorecard = (
    <RubricScorecard
      rubric={rubric}
      critique={run.critique ?? []}
      findings={run.deterministicFindings ?? []}
      metrics={run.metrics}
      changeLog={run.changeLog ?? []}
      factInventory={run.factInventory ?? []}
    />
  );

  const nextStep =
    pendingCount > 0
      ? {
          label: `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} left · review next`,
          targetId: "tracked-changes",
        }
      : !readinessVisited
        ? { label: "Changes resolved · check readiness", targetId: "readiness" }
        : !deliveryVisited
          ? { label: "Ready to adapt · prepare delivery", targetId: "delivery" }
          : !practiceVisited
            ? { label: "Briefing ready · practise next", targetId: "practice" }
            : !isSaved
              ? { label: "Review complete · save result", targetId: "save" }
              : { label: "Saved · copy when ready", targetId: "copy" };

  function followNextStep() {
    if (nextStep.targetId === "tracked-changes") {
      articleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      articleRef.current?.focus({ preventScroll: true });
      return;
    }
    const target = document.getElementById(`review-control-${nextStep.targetId}`);
    const button = target?.matches("button")
      ? target
      : target?.querySelector("button");
    if (button instanceof HTMLButtonElement) button.click();
  }

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/88 px-4 py-3 backdrop-blur-md lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <HeaderTooltip content="The writing form and rubric used for this review.">
            <Badge variant="outline">{rubric.shortName}</Badge>
          </HeaderTooltip>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{run.title}</h1>
            <p className="text-xs text-muted-foreground">
              {changedCount} change groups · {acceptedCount} accepted ·{" "}
              {rejectedCount} rejected
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden h-7 border border-copper/25 bg-accent/45 px-2.5 text-[11px] text-foreground sm:inline-flex"
            onClick={followNextStep}
          >
            {nextStep.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HeaderTooltip
            id="review-control-readiness"
            content="Check whether this version is ready to share."
          >
            <ReadinessReport
              text={currentText}
              critique={run.critique ?? []}
              findings={run.deterministicFindings ?? []}
              blindSpots={run.blindSpots ?? []}
              wordRange={{
                min: rubric.length.minWords,
                max: rubric.length.maxWords,
              }}
              strongestClaim={run.factInventory?.[0]?.claim}
              onOpened={() => persistShipProgress({ readinessChecked: true })}
            />
          </HeaderTooltip>
          <HeaderTooltip
            id="review-control-delivery"
            content="Turn the piece into a practical delivery briefing."
          >
            <DeliveryBriefing
              documentId={run.documentId}
              demoMode={demoMode}
              demoScenario={run.demoScenario}
              onOpened={() => persistShipProgress({ deliveryOpened: true })}
            />
          </HeaderTooltip>
          <HeaderTooltip
            id="review-control-practice"
            content="Rehearse questions and objections with an AI coach."
          >
            <PracticeArena
              documentId={run.documentId}
              demoMode={demoMode}
              demoScenario={run.demoScenario}
              onCompleted={() =>
                persistShipProgress({ practiceCompleted: true })
              }
            />
          </HeaderTooltip>
          <HeaderTooltip content="Start another piece. Save or copy this one first.">
            <Button variant="ghost" size="sm" onClick={onStartOver}>
              <RotateCcwIcon data-icon="inline-start" />
              New draft
            </Button>
          </HeaderTooltip>
          <HeaderTooltip content="Restore your original wording for every proposed edit.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllDecisions("rejected")}
            >
              <XIcon data-icon="inline-start" />
              Reject all
            </Button>
          </HeaderTooltip>
          <HeaderTooltip content="Keep Lede's revised wording for every proposed edit.">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAllDecisions("accepted")}
            >
              <CheckIcon data-icon="inline-start" />
              Accept all
            </Button>
          </HeaderTooltip>
          <HeaderTooltip content="Open the genre rubric and measured quality checks.">
            <span className="inline-flex">
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="outline" size="sm" className="xl:hidden" />
                  }
                >
                  <ListChecksIcon data-icon="inline-start" />
                  Quality
                </SheetTrigger>
                <SheetContent className="w-[92vw] p-0 sm:max-w-md">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Rubric scorecard</SheetTitle>
                    <SheetDescription>
                      Genre criteria and measured quality checks.
                    </SheetDescription>
                  </SheetHeader>
                  {scorecard}
                </SheetContent>
              </Sheet>
            </span>
          </HeaderTooltip>
          <HeaderTooltip
            id="review-control-copy"
            content="Copy the current accepted version to your clipboard."
          >
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <ClipboardIcon data-icon="inline-start" />
              Copy
            </Button>
          </HeaderTooltip>
          <HeaderTooltip
            id="review-control-save"
            content="Save this version and its editorial decisions to your private shelf."
          >
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {demoMode ? "Preview only" : isSaved ? "Saved" : "Save result"}
            </Button>
          </HeaderTooltip>
          <HeaderTooltip content="Learn what every review control does and see the recommended order.">
            <ReviewGuide />
          </HeaderTooltip>
        </div>
      </div>

      {showPostSaveCta ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-accent/35 px-4 py-2.5 lg:px-6">
          <p className="text-xs text-muted-foreground">
            Saved to your private shelf. Next: prepare to deliver, practise, or
            start a new draft.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const target = document.getElementById(
                  "review-control-delivery",
                );
                const button = target?.matches("button")
                  ? target
                  : target?.querySelector("button");
                if (button instanceof HTMLButtonElement) button.click();
              }}
            >
              Prepare to deliver
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const target = document.getElementById(
                  "review-control-practice",
                );
                const button = target?.matches("button")
                  ? target
                  : target?.querySelector("button");
                if (button instanceof HTMLButtonElement) button.click();
              }}
            >
              Practise
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onStartOver}>
              New draft
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <main className="min-w-0 px-3 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            <div>
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Tracked changes
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Highlight text and right-click for dictionary, thesaurus,
                reword options, or the legal lens.
              </p>
            </div>

            <article
              id="tracked-changes"
              ref={articleRef}
              tabIndex={-1}
              onContextMenu={handleContextMenu}
              className="min-h-[68vh] rounded-sm border bg-paper px-6 py-8 font-document text-[1.08rem] leading-[1.85] whitespace-pre-wrap paper-shadow sm:px-10 sm:py-12"
            >
              {hunks.map((hunk) => {
                const decision = decisions[hunk.id] ?? "pending";
                if (!hunk.changed) {
                  return (
                    <Fragment key={hunk.id}>
                      {renderWithPlaceholders(
                        hunk.revisedText,
                        openPlaceholder,
                      )}
                    </Fragment>
                  );
                }
                return (
                  <span
                    key={hunk.id}
                    className="group/change my-1 inline rounded-md ring-1 ring-transparent transition-colors hover:ring-border"
                  >
                    {decision === "pending" && (
                      <DiffText
                        segments={hunk.segments}
                        onPlaceholderClick={openPlaceholder}
                      />
                    )}
                    {decision === "accepted" &&
                      renderWithPlaceholders(
                        hunk.revisedText,
                        openPlaceholder,
                      )}
                    {decision === "rejected" &&
                      renderWithPlaceholders(
                        hunk.originalText,
                        openPlaceholder,
                      )}
                    <span className="mx-1 inline-flex translate-y-0.5 gap-0.5 rounded-md border bg-popover p-0.5 opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover/change:opacity-100 sm:group-focus-within/change:opacity-100">
                      <button
                        type="button"
                        aria-label="Accept this change"
                        onClick={() =>
                          (setDirtyAfterSave(true),
                          setDecisions((current) => ({
                            ...current,
                            [hunk.id]: "accepted",
                          })))
                        }
                        className="flex size-6 items-center justify-center rounded hover:bg-secondary"
                      >
                        <CheckIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Reject this change"
                        onClick={() =>
                          (setDirtyAfterSave(true),
                          setDecisions((current) => ({
                            ...current,
                            [hunk.id]: "rejected",
                          })))
                        }
                        className="flex size-6 items-center justify-center rounded hover:bg-secondary"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    </span>
                  </span>
                );
              })}
            </article>
          </div>
        </main>
        <div className="hidden min-h-0 xl:block">{scorecard}</div>
      </div>

      <SelectionContextMenu
        open={menu !== null}
        x={menu?.x ?? 0}
        y={menu?.y ?? 0}
        wordLookupEnabled={wordLookupEnabled}
        onClose={() => setMenu(null)}
        onSelect={(tool) => void handleToolSelect(tool)}
      />

      <SelectionToolsPanel
        open={panelOpen}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) setActiveTool(null);
        }}
        tool={activeTool}
        selectedText={selectedText}
        instruction={selectionInstruction}
        onInstructionChange={setSelectionInstruction}
        loading={loadingTool}
        error={toolError}
        dictionary={dictionary}
        thesaurus={thesaurus}
        rewordOptions={rewordOptions}
        rewordExplanation={rewordExplanation}
        legal={legal}
        onRunCustomReword={() => void runReword(selectionInstruction)}
        onApplyReword={applyReplacement}
        onApplySynonym={applySynonym}
      />
    </div>
  );
}
