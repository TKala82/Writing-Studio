"use client";

import { useAction } from "convex/react";
import {
  ArrowUpRightIcon,
  BookMarkedIcon,
  LibraryBigIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getGenreRubric, type GenreId } from "@/lib/genres";

interface LibrarianSuggestion {
  documentId: Id<"documents">;
  runId?: Id<"runs">;
  title: string;
  genre: GenreId;
  passage: string;
  whyRelevant: string;
  howToAdapt: string;
}

interface LibrarianSuggestionsProps {
  draft: string;
  genre: GenreId;
  customPurpose?: string;
  enabled: boolean;
  minimumDraftLength?: number;
  onInsert: (passage: string) => void;
  onOpenRun?: (runId: Id<"runs">) => void;
}

export function LibrarianSuggestions({
  draft,
  genre,
  customPurpose,
  enabled,
  minimumDraftLength = 50,
  onInsert,
  onOpenRun,
}: LibrarianSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<LibrarianSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const suggestFromShelf = useAction(api.libraryActions.suggestFromShelf);
  const canSearch = enabled && draft.trim().length >= minimumDraftLength;

  async function searchShelf() {
    if (!canSearch) return;
    setIsSearching(true);
    try {
      const result = await suggestFromShelf({
        draft,
        genre,
        customPurpose: customPurpose?.trim() || undefined,
      });
      setSuggestions(result);
      if (result.length === 0) {
        toast.info(
          "No strong match yet. Organise more work on your shelf or add detail to this draft.",
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The librarian could not search your shelf",
      );
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <section
      aria-labelledby="librarian-suggestions-title"
      className="overflow-hidden rounded-xl border border-copper/25 bg-[linear-gradient(145deg,var(--card),color-mix(in_oklab,var(--accent)_42%,var(--card)))]"
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <LibraryBigIcon className="size-4" />
          </span>
          <div>
            <p
              id="librarian-suggestions-title"
              className="text-sm font-semibold"
            >
              Pull from your shelf
            </p>
            <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
              Lede looks for relevant passages in your previous work, explains
              the connection, and leaves you to decide how to reuse them.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canSearch || isSearching}
          onClick={() => void searchShelf()}
        >
          {isSearching ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          {isSearching
            ? "Searching your shelf"
            : suggestions.length > 0
              ? "Search again"
              : "Find useful passages"}
        </Button>
      </div>

      {!enabled ? (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          Sign in to build a private shelf and reuse past work.
        </p>
      ) : draft.trim().length < minimumDraftLength ? (
        <p className="border-t px-5 py-3 text-xs text-muted-foreground">
          Add a little more context so the librarian can judge what is relevant.
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="grid gap-px border-t bg-border lg:grid-cols-2">
          {suggestions.map((suggestion) => {
            const rubric = getGenreRubric(suggestion.genre);
            return (
              <article
                key={`${suggestion.documentId}-${suggestion.passage}`}
                className="flex flex-col gap-4 bg-card px-5 py-5"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{rubric.shortName}</Badge>
                    <span className="line-clamp-1 text-xs font-medium">
                      {suggestion.title}
                    </span>
                  </div>
                  <blockquote className="mt-3 border-l-2 border-copper pl-3 font-document text-sm leading-6">
                    “{suggestion.passage}”
                  </blockquote>
                </div>
                <div className="space-y-2 text-xs leading-5 text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">
                      Why now:
                    </span>{" "}
                    {suggestion.whyRelevant}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      Adapt it:
                    </span>{" "}
                    {suggestion.howToAdapt}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onInsert(suggestion.passage);
                      toast.success("Passage added to your draft");
                    }}
                  >
                    <PlusIcon data-icon="inline-start" />
                    Insert
                  </Button>
                  {suggestion.runId && onOpenRun ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenRun(suggestion.runId!)}
                    >
                      <BookMarkedIcon data-icon="inline-start" />
                      Open original
                      <ArrowUpRightIcon data-icon="inline-end" />
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
