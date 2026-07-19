"use client";

import { useAction, useConvex, useMutation } from "convex/react";
import {
  BookOpenIcon,
  Clock3Icon,
  FileTextIcon,
  LibraryBigIcon,
  PencilIcon,
  RefreshCwIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { getGenreRubric, type GenreId } from "@/lib/genres";

interface ShelfDocument {
  documentId: Id<"documents">;
  runId?: Id<"runs">;
  title: string;
  genre: GenreId;
  status: string;
  preview: string;
  wordCount: number;
  updatedAt: number;
  indexed: boolean;
  summary?: string;
  topics: string[];
  keyPassages: Array<{ text: string; whyReusable: string }>;
}

interface LibraryShelfProps {
  documents: ShelfDocument[];
  onOpenRun: (runId: Id<"runs">) => void;
  onEditDraft: (draftText: string, genre: GenreId) => void;
}

function relativeDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

export function LibraryShelf({
  documents,
  onOpenRun,
  onEditDraft,
}: LibraryShelfProps) {
  const [query, setQuery] = useState("");
  const [isOrganising, setIsOrganising] = useState(false);
  const [renamingId, setRenamingId] = useState<Id<"documents"> | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pendingId, setPendingId] = useState<Id<"documents"> | null>(null);
  const renameCommitInFlight = useRef(false);
  const convex = useConvex();
  const organiseShelf = useAction(api.libraryActions.organiseShelf);
  const renameDocument = useMutation(api.documents.rename);
  const removeDocument = useMutation(api.documents.remove);
  const unindexedCount = documents.filter((document) => !document.indexed).length;
  const grouped = useMemo(() => {
    const normalised = query.trim().toLowerCase();
    const filtered = normalised
      ? documents.filter((document) =>
          [
            document.title,
            document.summary,
            document.preview,
            ...document.topics,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalised)),
        )
      : documents;
    const groups = new Map<GenreId, ShelfDocument[]>();
    for (const document of filtered) {
      const current = groups.get(document.genre) ?? [];
      current.push(document);
      groups.set(document.genre, current);
    }
    return [...groups.entries()];
  }, [documents, query]);

  async function handleOrganise() {
    setIsOrganising(true);
    try {
      const result = await organiseShelf({ limit: 30 });
      if (result.queued === 0) {
        toast.success("Your shelf is already organised");
      } else {
        toast.success(
          `Librarian is organising ${result.queued} ${result.queued === 1 ? "work" : "works"}`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not organise the shelf",
      );
    } finally {
      setIsOrganising(false);
    }
  }

  function startRename(document: ShelfDocument) {
    setRenamingId(document.documentId);
    setRenameValue(document.title);
  }

  async function commitRename() {
    if (!renamingId || renameCommitInFlight.current) return;
    renameCommitInFlight.current = true;
    const title = renameValue.trim();
    const current = documents.find(
      (document) => document.documentId === renamingId,
    );
    setRenamingId(null);
    if (!current || !title || title === current.title) {
      renameCommitInFlight.current = false;
      return;
    }
    setPendingId(current.documentId);
    try {
      await renameDocument({ documentId: current.documentId, title });
      toast.success("Draft renamed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not rename this draft",
      );
    } finally {
      setPendingId(null);
      renameCommitInFlight.current = false;
    }
  }

  async function handleEdit(document: ShelfDocument) {
    setPendingId(document.documentId);
    try {
      const editable = await convex.query(api.documents.getEditableText, {
        documentId: document.documentId,
      });
      if (!editable) {
        toast.error("This draft is no longer available");
        return;
      }
      onEditDraft(
        editable.acceptedText ?? editable.draft,
        editable.genre as GenreId,
      );
      toast.success("Draft loaded into the editor — adjust it and resubmit");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not load this draft",
      );
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(document: ShelfDocument) {
    if (
      !window.confirm(
        `Delete "${document.title}" and its editorial record permanently?`,
      )
    ) {
      return;
    }
    setPendingId(document.documentId);
    try {
      await removeDocument({ documentId: document.documentId });
      toast.success("Draft deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete this draft",
      );
    } finally {
      setPendingId(null);
    }
  }

  if (documents.length === 0) return null;

  return (
    <section
      aria-labelledby="library-shelf-title"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <LibraryBigIcon className="size-4 text-copper" />
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Your shelf
            </p>
          </div>
          <h2
            id="library-shelf-title"
            className="mt-1 font-heading text-3xl tracking-[-0.02em]"
          >
            Past work, ready to work again.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Your private librarian groups each piece by form, identifies its
            themes, and keeps useful passages available for future drafts.
          </p>
        </div>
        <Button
          type="button"
          variant={unindexedCount > 0 ? "default" : "outline"}
          size="sm"
          disabled={isOrganising}
          onClick={() => void handleOrganise()}
        >
          {isOrganising ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          {unindexedCount > 0
            ? `Organise ${unindexedCount} ${unindexedCount === 1 ? "work" : "works"}`
            : "Shelf organised"}
        </Button>
      </div>

      <div className="relative max-w-lg">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search titles, summaries, or topics"
          className="h-10 bg-paper pl-9"
        />
      </div>

      {grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map(([genre, items]) => {
            const rubric = getGenreRubric(genre);
            return (
              <section key={genre} aria-labelledby={`shelf-${genre}`}>
                <div className="mb-3 flex items-center gap-3">
                  <h3
                    id={`shelf-${genre}`}
                    className="font-heading text-xl tracking-[-0.01em]"
                  >
                    {rubric.shortName}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {items.length}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((document) => (
                    <Card
                      key={document.documentId}
                      size="sm"
                      className="group relative overflow-hidden transition-transform hover:-translate-y-0.5"
                    >
                      <CardHeader>
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={
                              document.status === "complete"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {document.status}
                          </Badge>
                          {!document.indexed ? (
                            <Badge variant="outline">
                              <SparklesIcon data-icon="inline-start" />
                              Awaiting librarian
                            </Badge>
                          ) : null}
                        </div>
                        {renamingId === document.documentId ? (
                          <Input
                            autoFocus
                            value={renameValue}
                            maxLength={120}
                            aria-label="Draft title"
                            className="h-8 font-heading text-xl"
                            onChange={(event) =>
                              setRenameValue(event.target.value)
                            }
                            onBlur={() => void commitRename()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitRename();
                              } else if (event.key === "Escape") {
                                setRenamingId(null);
                              }
                            }}
                          />
                        ) : (
                          <CardTitle className="line-clamp-1 text-xl">
                            {document.title}
                          </CardTitle>
                        )}
                        <CardDescription className="line-clamp-3 leading-5">
                          {document.summary ?? document.preview}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-3">
                        {document.topics.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {document.topics.slice(0, 4).map((topic) => (
                              <span
                                key={topic}
                                className="rounded-full bg-accent px-2 py-1 text-[10px] text-accent-foreground"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpenIcon className="size-3" />
                              {document.wordCount} words
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock3Icon className="size-3" />
                              {relativeDate(document.updatedAt)}
                            </span>
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              disabled={pendingId === document.documentId}
                              title="Rename this draft"
                              aria-label={`Rename ${document.title}`}
                              onClick={() => startRename(document)}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              disabled={pendingId === document.documentId}
                              title="Edit the text and run a fresh editorial pass"
                              aria-label={`Edit and rework ${document.title}`}
                              onClick={() => void handleEdit(document)}
                            >
                              {pendingId === document.documentId ? (
                                <Spinner />
                              ) : (
                                <RefreshCwIcon />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              disabled={pendingId === document.documentId}
                              title="Delete this draft permanently"
                              aria-label={`Delete ${document.title}`}
                              onClick={() => void handleDelete(document)}
                            >
                              <Trash2Icon />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!document.runId}
                              title={
                                document.runId
                                  ? "Open in the review room"
                                  : "No review run yet"
                              }
                              onClick={() => {
                                if (document.runId) onOpenRun(document.runId);
                              }}
                            >
                              <FileTextIcon data-icon="inline-start" />
                              Open
                            </Button>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center">
          <SearchIcon className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Nothing matches that search.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a title, topic, or phrase from the summary.
          </p>
        </div>
      )}
    </section>
  );
}
