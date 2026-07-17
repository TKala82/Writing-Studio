"use client";

import {
  BookOpenTextIcon,
  ScaleIcon,
  SparklesIcon,
  WholeWordIcon,
} from "lucide-react";

import type { SelectionTool } from "@/components/studio/selection-context-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { getLegalRegime, type LegalRegimeId } from "@/lib/legal";
import type { DictionaryResult } from "@/lib/lexicon/types";
import type { ThesaurusResult } from "@/lib/lexicon/types";

export interface RewordOption {
  rewrittenSelection: string;
  label: string;
}

export interface LegalLensView {
  applicable: Array<{
    regimeId: LegalRegimeId;
    confidence: "high" | "medium" | "low";
    whyItApplies: string;
    relevantProvisions: string[];
    riskFlags: string[];
    suggestedRewording?: string;
  }>;
  notApplicable: Array<{
    regimeId: LegalRegimeId;
    reason: string;
  }>;
  overallNote: string;
}

interface SelectionToolsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool: SelectionTool | null;
  selectedText: string;
  instruction: string;
  onInstructionChange: (value: string) => void;
  loading: boolean;
  error?: string;
  dictionary?: DictionaryResult | null;
  thesaurus?: ThesaurusResult | null;
  rewordOptions?: RewordOption[];
  rewordExplanation?: string;
  legal?: LegalLensView | null;
  onRunCustomReword: () => void;
  onApplyReword: (text: string) => void;
  onApplySynonym: (word: string) => void;
}

const titles: Record<SelectionTool, string> = {
  define: "Dictionary",
  synonyms: "Thesaurus",
  reword: "Reword options",
  legal: "Legal lens",
  custom: "Refine the selected passage",
};

export function SelectionToolsPanel({
  open,
  onOpenChange,
  tool,
  selectedText,
  instruction,
  onInstructionChange,
  loading,
  error,
  dictionary,
  thesaurus,
  rewordOptions,
  rewordExplanation,
  legal,
  onRunCustomReword,
  onApplyReword,
  onApplySynonym,
}: SelectionToolsPanelProps) {
  if (!tool) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[82vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">
            {titles[tool]}
          </SheetTitle>
          <SheetDescription>
            {tool === "legal"
              ? "Informational regime spotting against curated SA commercial-law summaries. Not legal advice."
              : "The same fact inventory and voice constraints remain active for any rewrite."}
          </SheetDescription>
        </SheetHeader>

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pb-2">
          <blockquote className="max-h-28 overflow-y-auto rounded-lg bg-muted p-4 font-document text-base leading-relaxed">
            {selectedText}
          </blockquote>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              Working on the selection…
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {tool === "define" && dictionary ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline gap-3">
                <h3 className="font-heading text-3xl">{dictionary.word}</h3>
                {dictionary.phonetic ? (
                  <span className="text-sm text-muted-foreground">
                    {dictionary.phonetic}
                  </span>
                ) : null}
              </div>
              {dictionary.senses.map((sense) => (
                <div key={`${sense.partOfSpeech}-${sense.definitions[0]}`}>
                  <Badge variant="outline" className="mb-2">
                    <BookOpenTextIcon data-icon="inline-start" />
                    {sense.partOfSpeech}
                  </Badge>
                  <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-6">
                    {sense.definitions.map((definition) => (
                      <li key={definition}>{definition}</li>
                    ))}
                  </ol>
                  {sense.example ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      “{sense.example}”
                    </p>
                  ) : null}
                  {sense.synonyms.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {sense.synonyms.map((synonym) => (
                        <Button
                          key={synonym}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onApplySynonym(synonym)}
                        >
                          {synonym}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {tool === "synonyms" && thesaurus ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <WholeWordIcon className="size-4 text-copper" />
                <h3 className="font-heading text-2xl">{thesaurus.word}</h3>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Synonyms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {thesaurus.synonyms.map((synonym) => (
                    <Button
                      key={synonym}
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onApplySynonym(synonym)}
                    >
                      {synonym}
                    </Button>
                  ))}
                </div>
              </div>
              {thesaurus.related.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Related meanings
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {thesaurus.related.map((word) => (
                      <Button
                        key={word}
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onApplySynonym(word)}
                      >
                        {word}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {(tool === "reword" || tool === "custom") &&
          rewordOptions &&
          rewordOptions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {rewordExplanation ? (
                <p className="text-sm text-muted-foreground">
                  {rewordExplanation}
                </p>
              ) : null}
              {rewordOptions.map((option) => (
                <div
                  key={`${option.label}-${option.rewrittenSelection.slice(0, 24)}`}
                  className="rounded-xl border bg-card p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge variant="secondary">{option.label}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        onApplyReword(option.rewrittenSelection)
                      }
                    >
                      Use this
                    </Button>
                  </div>
                  <p className="font-document text-base leading-7">
                    {option.rewrittenSelection}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {tool === "custom" && (!rewordOptions || rewordOptions.length === 0) ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="selection-instruction">
                  What should change?
                </FieldLabel>
                <Input
                  id="selection-instruction"
                  value={instruction}
                  onChange={(event) => onInstructionChange(event.target.value)}
                  placeholder="Make the connection to my research question more specific"
                  autoFocus
                />
                <FieldDescription>
                  Ask for one change at a time to preserve the surrounding voice.
                </FieldDescription>
              </Field>
            </FieldGroup>
          ) : null}

          {tool === "legal" && legal ? (
            <div className="flex flex-col gap-5">
              <div className="rounded-lg border border-copper/30 bg-accent/40 px-3 py-2 text-xs leading-5">
                <ScaleIcon className="mb-1 inline size-3.5 text-copper" />{" "}
                {legal.overallNote}
              </div>

              {legal.applicable.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No curated regime strongly matched this passage.
                </p>
              ) : (
                legal.applicable.map((item) => {
                  const regime = getLegalRegime(item.regimeId);
                  return (
                    <div
                      key={item.regimeId}
                      className="rounded-xl border bg-card p-4"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-xl">
                          {regime.shortName}
                        </h3>
                        <Badge variant="outline">{regime.jurisdiction}</Badge>
                        <Badge variant="secondary">{item.confidence}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {item.whyItApplies}
                      </p>
                      <ul className="mt-3 flex flex-col gap-1.5 text-xs leading-5">
                        {item.relevantProvisions.map((provision) => (
                          <li key={provision} className="border-l-2 pl-2">
                            {provision}
                          </li>
                        ))}
                      </ul>
                      {item.riskFlags.length > 0 ? (
                        <div className="mt-3">
                          <p className="text-[10px] font-semibold tracking-[0.12em] text-copper uppercase">
                            Risk flags
                          </p>
                          <ul className="mt-1 list-disc pl-4 text-xs leading-5">
                            {item.riskFlags.map((flag) => (
                              <li key={flag}>{flag}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {item.suggestedRewording ? (
                        <div className="mt-3 rounded-lg bg-muted p-3">
                          <p className="mb-2 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                            Cautious rewording
                          </p>
                          <p className="font-document text-sm leading-6">
                            {item.suggestedRewording}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="mt-3"
                            onClick={() =>
                              onApplyReword(item.suggestedRewording!)
                            }
                          >
                            Use this rewording
                          </Button>
                        </div>
                      ) : null}
                      <p className="mt-3 text-[10px] text-muted-foreground">
                        Library reviewed {regime.lastReviewed} ·{" "}
                        {regime.disclaimerScope}
                      </p>
                    </div>
                  );
                })
              )}

              {legal.notApplicable.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    Likely not engaged
                  </p>
                  <ul className="flex flex-col gap-2 text-xs leading-5 text-muted-foreground">
                    {legal.notApplicable.map((item) => (
                      <li key={item.regimeId}>
                        <span className="font-medium text-foreground">
                          {getLegalRegime(item.regimeId).shortName}:
                        </span>{" "}
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {tool === "custom" && (!rewordOptions || rewordOptions.length === 0) ? (
          <SheetFooter>
            <Button
              onClick={onRunCustomReword}
              disabled={loading || !instruction.trim()}
            >
              {loading ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              Rewrite selection
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
