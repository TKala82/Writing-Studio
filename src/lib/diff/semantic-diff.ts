import DiffMatchPatch from "diff-match-patch";

export type DiffKind = "equal" | "delete" | "insert";

export interface DiffSegment {
  kind: DiffKind;
  text: string;
}

export interface DiffHunk {
  id: string;
  segments: DiffSegment[];
  originalText: string;
  revisedText: string;
  changed: boolean;
}

export type HunkDecision = "accepted" | "rejected" | "pending";

const dmp = new DiffMatchPatch();
dmp.Diff_Timeout = 1;

function kindFromOperation(operation: number): DiffKind {
  if (operation === DiffMatchPatch.DIFF_INSERT) return "insert";
  if (operation === DiffMatchPatch.DIFF_DELETE) return "delete";
  return "equal";
}

function createHunk(segments: DiffSegment[], index: number): DiffHunk {
  const originalText = segments
    .filter((segment) => segment.kind !== "insert")
    .map((segment) => segment.text)
    .join("");
  const revisedText = segments
    .filter((segment) => segment.kind !== "delete")
    .map((segment) => segment.text)
    .join("");
  return {
    id: `change-${index}`,
    segments,
    originalText,
    revisedText,
    changed: segments.some((segment) => segment.kind !== "equal"),
  };
}

function isStrongBoundary(text: string): boolean {
  return text.length > 72 || text.includes("\n\n");
}

function diffSegments(originalText: string, revisedText: string): DiffSegment[] {
  const rawDiffs = dmp.diff_main(originalText, revisedText);
  dmp.diff_cleanupSemantic(rawDiffs);
  dmp.diff_cleanupSemanticLossless(rawDiffs);
  return rawDiffs.map(([operation, text]) => ({
    kind: kindFromOperation(operation),
    text,
  }));
}

function createParagraphDiff(
  originalText: string,
  revisedText: string,
): DiffHunk[] | null {
  const originalParagraphs = originalText.split(/\n{2,}/);
  const revisedParagraphs = revisedText.split(/\n{2,}/);
  if (originalParagraphs.length === 1 && revisedParagraphs.length === 1) {
    return null;
  }

  const paragraphCount = Math.max(
    originalParagraphs.length,
    revisedParagraphs.length,
  );
  return Array.from({ length: paragraphCount }, (_, index) => {
    const separator = index < paragraphCount - 1 ? "\n\n" : "";
    const original = `${originalParagraphs[index] ?? ""}${separator}`;
    const revised = `${revisedParagraphs[index] ?? ""}${separator}`;
    return createHunk(diffSegments(original, revised), index);
  });
}

export function createSemanticDiff(
  originalText: string,
  revisedText: string,
): DiffHunk[] {
  const paragraphDiff = createParagraphDiff(originalText, revisedText);
  if (paragraphDiff) return paragraphDiff;

  const hunks: DiffHunk[] = [];
  let changeBuffer: DiffSegment[] = [];

  const flushChanges = (): void => {
    if (changeBuffer.length === 0) return;
    hunks.push(createHunk(changeBuffer, hunks.length));
    changeBuffer = [];
  };

  for (const segment of diffSegments(originalText, revisedText)) {
    if (segment.kind === "equal" && isStrongBoundary(segment.text)) {
      flushChanges();
      hunks.push(createHunk([segment], hunks.length));
      continue;
    }
    changeBuffer.push(segment);
  }
  flushChanges();

  return hunks;
}

export function applyHunkDecisions(
  hunks: DiffHunk[],
  decisions: Readonly<Record<string, HunkDecision>>,
): string {
  return hunks
    .map((hunk) => {
      if (!hunk.changed) return hunk.revisedText;
      return decisions[hunk.id] === "rejected"
        ? hunk.originalText
        : hunk.revisedText;
    })
    .join("");
}

export function countChangedHunks(hunks: DiffHunk[]): number {
  return hunks.filter((hunk) => hunk.changed).length;
}
