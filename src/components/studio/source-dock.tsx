"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  ImageIcon,
  LinkIcon,
  LoaderCircleIcon,
  PaperclipIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  VideoIcon,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { GenreId } from "@/lib/genres";
import { cn } from "@/lib/utils";

interface SourceAngle {
  _id?: Id<"sourceAngles">;
  sourceIds?: Id<"sources">[];
  interpretation?: string;
  id: string;
  title: string;
  thesis: string;
  rationale: string;
  genre: GenreId;
  purpose: string;
  outline: string[];
  factIds: string[];
}

interface SourceDockProps {
  enabled: boolean;
  disabledReason?: string;
  onRunCreated: (runId: Id<"runs">) => void;
}

const kindMeta = {
  text: { label: "Text", icon: FileTextIcon },
  url: { label: "Web", icon: LinkIcon },
  youtube: { label: "Video", icon: VideoIcon },
  pdf: { label: "PDF", icon: FileTextIcon },
  image: { label: "Image", icon: ImageIcon },
} as const;

function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export function SourceDock({
  enabled,
  disabledReason,
  onRunCreated,
}: SourceDockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<Id<"sources">>>(
    () => new Set(),
  );
  const [angles, setAngles] = useState<SourceAngle[]>([]);
  const [showRecentAngles, setShowRecentAngles] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [composingAngleId, setComposingAngleId] = useState<string | null>(null);

  const sources = useQuery(api.sources.list, enabled ? {} : "skip");
  const persistedAngles = useQuery(
    api.sources.listAngles,
    enabled ? {} : "skip",
  );
  const createText = useMutation(api.sources.createText);
  const createUrl = useMutation(api.sources.createUrl);
  const createFile = useMutation(api.sources.createFile);
  const generateUploadUrl = useMutation(api.sources.generateUploadUrl);
  const removeSource = useMutation(api.sources.remove);
  const markAngleSelected = useMutation(api.sources.markAngleSelected);
  const ingestSource = useAction(api.sourceActions.ingest);
  const suggestAngles = useAction(api.sourceActions.suggestAngles);
  const composeFromSources = useAction(api.sourceActions.composeFromSources);

  const selectedReadyIds = useMemo(
    () =>
      (sources ?? [])
        .filter(
          (source) => source.status === "ready" && selectedIds.has(source._id),
        )
        .map((source) => source._id),
    [selectedIds, sources],
  );
  const availableSourceIds = new Set((sources ?? []).map((source) => source._id));
  const visibleAngles =
    angles.length > 0
      ? angles
      : showRecentAngles
        ? (persistedAngles ?? [])
            .filter((angle) =>
              angle.sourceIds.every((sourceId) =>
                availableSourceIds.has(sourceId),
              ),
            )
            .slice(0, 4)
        : [];

  function queueIngestion(sourceId: Id<"sources">) {
    setSelectedIds((current) => new Set(current).add(sourceId));
    setShowRecentAngles(false);
    void ingestSource({ sourceId }).catch((error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "The source could not be read",
      );
    });
  }

  async function handleAddSource() {
    const value = input.trim();
    if (!enabled || value.length === 0) return;
    setIsAdding(true);
    try {
      const sourceId = isUrl(value)
        ? await createUrl({ url: value })
        : await createText({ text: value });
      setInput("");
      setAngles([]);
      setShowRecentAngles(false);
      queueIngestion(sourceId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add the source",
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleFile(file: File) {
    if (!enabled) return;
    if (
      file.type !== "application/pdf" &&
      !file.type.startsWith("image/")
    ) {
      toast.error("Upload a PDF or image");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Files must be smaller than 15 MB");
      return;
    }
    setIsAdding(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("The file upload failed");
      const result = (await response.json()) as {
        storageId?: Id<"_storage">;
      };
      if (!result.storageId) throw new Error("The upload returned no file id");
      const sourceId = await createFile({
        storageId: result.storageId,
        filename: file.name,
        mediaType: file.type,
        byteSize: file.size,
      });
      setAngles([]);
      setShowRecentAngles(false);
      queueIngestion(sourceId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not upload the file",
      );
    } finally {
      setIsAdding(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleSource(sourceId: Id<"sources">) {
    const next = new Set(selectedIds);
    if (next.has(sourceId)) next.delete(sourceId);
    else if (next.size < 8) next.add(sourceId);
    else toast.error("Choose up to eight sources at a time");
    setSelectedIds(next);
    setShowRecentAngles(next.size === 0);
    setAngles([]);
  }

  async function handleSuggestAngles() {
    if (selectedReadyIds.length === 0) return;
    setIsSuggesting(true);
    try {
      const result = await suggestAngles({
        sourceIds: selectedReadyIds,
        interpretation: interpretation.trim() || undefined,
      });
      setAngles(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not develop writing angles",
      );
    } finally {
      setIsSuggesting(false);
    }
  }

  async function handleCompose(angle: SourceAngle) {
    setComposingAngleId(angle.id);
    try {
      const sourceIds =
        angle.sourceIds && angle.sourceIds.length > 0
          ? angle.sourceIds
          : selectedReadyIds;
      const created = await composeFromSources({
        sourceIds,
        angle: {
          id: angle.id,
          title: angle.title,
          thesis: angle.thesis,
          rationale: angle.rationale,
          genre: angle.genre,
          purpose: angle.purpose,
          outline: angle.outline,
          factIds: angle.factIds,
        },
        interpretation:
          interpretation.trim() || angle.interpretation || undefined,
      });
      if (angle._id) {
        await markAngleSelected({ angleId: angle._id });
      }
      onRunCreated(created.runId);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not compose the grounded draft",
      );
      setComposingAngleId(null);
    }
  }

  return (
    <section aria-labelledby="source-dock-title" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2
          id="source-dock-title"
          className="font-heading text-3xl tracking-[-0.02em]"
        >
          Bring the material. Find the argument.
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Paste notes, an article, a newsletter, or any public link. Attach a
          paper or screenshot. Lede turns each source into claims you can trace.
        </p>
      </div>

      <Card className="overflow-visible paper-shadow">
        <CardHeader className="border-b">
          <CardTitle className="font-sans text-sm font-semibold">
            Start with anything
          </CardTitle>
          <CardDescription>
            URLs are recognised automatically, including public YouTube videos.
          </CardDescription>
          <CardAction>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!enabled || isAdding}
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperclipIcon data-icon="inline-start" />
              Attach PDF or image
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste source text, an email newsletter, or https://…"
            className="min-h-32 resize-y border-0 bg-muted/45 px-4 py-3 leading-6 shadow-none focus-visible:ring-1"
            maxLength={120_000}
            disabled={!enabled || isAdding}
          />
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              disabled={
                !enabled ||
                isAdding ||
                (isUrl(input) ? false : input.trim().length < 50)
              }
              onClick={() => void handleAddSource()}
            >
              {isAdding ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <PlusIcon data-icon="inline-start" />
              )}
              {isAdding
                ? "Adding source"
                : isUrl(input)
                  ? "Read this link"
                  : "Add to source desk"}
            </Button>
            <p className="text-xs leading-5 text-muted-foreground">
              {enabled
                ? "Up to 8 selected sources shape one piece."
                : disabledReason}
            </p>
          </div>
        </CardContent>
      </Card>

      {sources && sources.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Your recent sources
            </p>
            <span className="text-xs text-muted-foreground">
              {selectedReadyIds.length} ready selected
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sources.map((source) => {
              const meta = kindMeta[source.kind];
              const Icon = meta.icon;
              const selected = selectedIds.has(source._id);
              const ready = source.status === "ready";
              return (
                <div
                  key={source._id}
                  className={cn(
                    "group relative rounded-xl border bg-card transition-colors",
                    selected && "border-copper bg-accent/30",
                  )}
                >
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-4 pr-10 text-left disabled:cursor-wait"
                    disabled={!ready}
                    aria-pressed={selected}
                    onClick={() => toggleSource(source._id)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
                        selected && "bg-copper text-copper-foreground",
                      )}
                    >
                      {source.status === "processing" ||
                      source.status === "queued" ? (
                        <LoaderCircleIcon className="size-4 animate-spin" />
                      ) : selected ? (
                        <CheckIcon className="size-4" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {source.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                        {source.status === "error"
                          ? source.error
                          : source.summary ||
                            "Reading and indexing the source…"}
                      </span>
                      <span className="mt-2 block text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {meta.label} · {source.status}
                      </span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-2 right-2 opacity-60 hover:opacity-100"
                    aria-label={`Remove ${source.title}`}
                    onClick={() => {
                      void removeSource({ sourceId: source._id }).catch(
                        (error: unknown) =>
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Could not remove the source",
                          ),
                      );
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        next.delete(source._id);
                        return next;
                      });
                      setShowRecentAngles(
                        selectedIds.size === 0 ||
                          (selectedIds.size === 1 &&
                            selectedIds.has(source._id)),
                      );
                      setAngles([]);
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-2 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                What are you noticing?{" "}
                <span className="font-normal text-muted-foreground">
                  · optional
                </span>
              </span>
              <Textarea
                value={interpretation}
                onChange={(event) => {
                  setInterpretation(event.target.value);
                  setAngles([]);
                  setShowRecentAngles(false);
                }}
                placeholder="e.g. I think the interesting tension is between capability evaluations and what deployment incentives reward."
                className="min-h-20 resize-y"
                maxLength={2_000}
              />
            </label>
            <Button
              type="button"
              size="lg"
              disabled={
                selectedReadyIds.length === 0 ||
                isSuggesting ||
                composingAngleId !== null
              }
              onClick={() => void handleSuggestAngles()}
            >
              {isSuggesting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SparklesIcon data-icon="inline-start" />
              )}
              {isSuggesting ? "Developing angles" : "Suggest what I could write"}
            </Button>
          </div>
        </div>
      ) : null}

      {visibleAngles.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-copper uppercase">
              Four defensible directions
            </p>
            <h3 className="mt-1 font-heading text-3xl">
              Choose the one you want to make yours.
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleAngles.map((angle, index) => (
              <Card
                key={angle.id}
                className="group transition-transform duration-200 hover:-translate-y-0.5"
              >
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-heading text-xl text-copper">
                      0{index + 1}
                    </span>
                    <Badge variant="secondary">
                      {angle.genre.replace("-", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">{angle.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {angle.thesis}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <p className="text-xs leading-5 text-muted-foreground">
                    {angle.rationale}
                  </p>
                  <ol className="flex flex-col gap-2 border-l pl-4 text-xs leading-5">
                    {angle.outline.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-auto w-full justify-between"
                    disabled={composingAngleId !== null}
                    onClick={() => void handleCompose(angle)}
                  >
                    <span className="flex items-center gap-2">
                      {composingAngleId === angle.id ? (
                        <Spinner />
                      ) : (
                        <SparklesIcon />
                      )}
                      {composingAngleId === angle.id
                        ? "Writing grounded first draft"
                        : "Develop this angle"}
                    </span>
                    <ArrowRightIcon />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
