"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArchiveRestoreIcon,
  BookMarkedIcon,
  CheckIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useRef, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { getGenreRubric, type GenreId } from "@/lib/genres";

interface TeachLedePanelProps {
  enabled: boolean;
}

interface DistilledPlaybook {
  title: string;
  genres: GenreId[];
  appliesToAll: boolean;
  tips: Array<{ kind: "do" | "avoid"; text: string }>;
}

export function TeachLedePanel({ enabled }: TeachLedePanelProps) {
  const entries = useQuery(api.playbook.listMine, enabled ? {} : "skip");
  const distill = useAction(api.playbookActions.distill);
  const save = useMutation(api.playbook.save);
  const setStatus = useMutation(api.playbook.setStatus);
  const remove = useMutation(api.playbook.remove);
  const [isOpen, setIsOpen] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [preview, setPreview] = useState<DistilledPlaybook | null>(null);
  const [isDistilling, setIsDistilling] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingEntryId, setPendingEntryId] =
    useState<Id<"playbookEntries"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!enabled) return null;

  async function handleUpload(file: File) {
    setIsConverting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/teach/convert", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as {
        markdown?: string;
        truncated?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.markdown) {
        throw new Error(payload.error ?? "Could not convert this file");
      }
      setIsOpen(true);
      setPreview(null);
      setEmailContent(payload.markdown);
      if (payload.truncated) {
        toast.warning(
          "The resource was longer than 30,000 characters, so it was trimmed. Review the text before distilling.",
        );
      } else {
        toast.success(`Converted ${file.name} — review, then distill`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not convert this file",
      );
    } finally {
      setIsConverting(false);
    }
  }

  async function handleDistill() {
    setIsDistilling(true);
    try {
      const result = await distill({ emailContent });
      setPreview(result);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not distill this email",
      );
    } finally {
      setIsDistilling(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    setIsSaving(true);
    try {
      await save({
        ...preview,
        sourceText: emailContent,
      });
      setEmailContent("");
      setPreview(null);
      setIsOpen(false);
      toast.success("Best practices added to Lede's playbook");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save this playbook entry",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatus(
    entryId: Id<"playbookEntries">,
    status: "active" | "archived",
  ) {
    setPendingEntryId(entryId);
    try {
      await setStatus({ entryId, status });
      toast.success(status === "active" ? "Guidance restored" : "Guidance archived");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update guidance",
      );
    } finally {
      setPendingEntryId(null);
    }
  }

  async function handleRemove(entryId: Id<"playbookEntries">) {
    if (!window.confirm("Delete this playbook entry permanently?")) return;
    setPendingEntryId(entryId);
    try {
      await remove({ entryId });
      toast.success("Playbook entry deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete guidance",
      );
    } finally {
      setPendingEntryId(null);
    }
  }

  const activeCount =
    entries?.filter((entry) => entry.status === "active").length ?? 0;

  return (
    <Card
      size="sm"
      className="overflow-hidden border-copper/20 bg-[linear-gradient(150deg,var(--card),color-mix(in_oklab,var(--accent)_35%,var(--card)))]"
    >
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-3">
          <Badge variant="outline" className="border-copper/25 text-copper">
            <BookMarkedIcon data-icon="inline-start" />
            Best-practice playbook
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {activeCount} active
          </span>
        </div>
        <CardTitle className="font-heading text-2xl leading-tight">
          Teach Lede what your inbox teaches you.
        </CardTitle>
        <CardDescription className="leading-5">
          Paste an expert email, or upload a guide, article, or deck. Lede
          extracts reusable rules, asks you to approve them, then applies them
          only to matching forms.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isOpen ? (
          <div className="flex flex-col gap-3 border-t border-copper/15 pt-4">
            {preview ? (
              <>
                <div className="rounded-lg border border-copper/20 bg-background/70 p-3">
                  <div className="flex items-start gap-2">
                    <SparklesIcon className="mt-0.5 size-4 shrink-0 text-copper" />
                    <div className="min-w-0">
                      <p className="font-heading text-lg leading-tight">
                        {preview.title}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {preview.appliesToAll ? (
                          <Badge variant="secondary">All writing forms</Badge>
                        ) : (
                          preview.genres.map((genre) => (
                            <Badge key={genre} variant="secondary">
                              {getGenreRubric(genre).shortName}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2">
                    {preview.tips.map((tip, index) => (
                      <li
                        key={`${tip.kind}-${index}`}
                        className="grid grid-cols-[1rem_1fr] gap-2 text-xs leading-5"
                      >
                        {tip.kind === "do" ? (
                          <CheckIcon className="mt-1 size-3 text-emerald-600" />
                        ) : (
                          <XIcon className="mt-1 size-3 text-destructive" />
                        )}
                        <span>{tip.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => void handleSave()}
                  >
                    {isSaving ? <Spinner data-icon="inline-start" /> : null}
                    Approve and save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={() => setPreview(null)}
                  >
                    Back to email
                  </Button>
                </div>
              </>
            ) : (
              <>
                <label
                  htmlFor="teach-lede-email"
                  className="text-xs font-semibold"
                >
                  Best-practices resource
                </label>
                <Textarea
                  id="teach-lede-email"
                  value={emailContent}
                  onChange={(event) => setEmailContent(event.target.value)}
                  placeholder="Paste the useful email or resource here, or upload a file below. Signatures, links, and promotions will be ignored…"
                  className="min-h-52 resize-y font-document leading-6"
                  maxLength={30_000}
                />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Review every extracted rule before it becomes active. The
                  original resource is stored only as a short provenance
                  excerpt.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={
                      emailContent.trim().length < 100 ||
                      isDistilling ||
                      isConverting
                    }
                    onClick={() => void handleDistill()}
                  >
                    {isDistilling ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <SparklesIcon data-icon="inline-start" />
                    )}
                    {isDistilling ? "Distilling" : "Distill tips"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isDistilling || isConverting}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isConverting ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <UploadIcon data-icon="inline-start" />
                    )}
                    {isConverting ? "Converting" : "Upload a file"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isDistilling || isConverting}
                    onClick={() => {
                      setIsOpen(false);
                      setEmailContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setIsOpen(true)}
            >
              <PlusIcon data-icon="inline-start" />
              Paste a lesson
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={isConverting}
              onClick={() => fileInputRef.current?.click()}
            >
              {isConverting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <UploadIcon data-icon="inline-start" />
              )}
              {isConverting ? "Converting" : "Upload a resource"}
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.docx,.pptx,.xlsx,.csv,.html,.htm,.epub,.msg,.txt,.md,.markdown"
          aria-label="Upload a best-practices resource"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleUpload(file);
          }}
        />

        {entries && entries.length > 0 ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Saved field notes
            </p>
            {entries.slice(0, 6).map((entry) => {
              const isPending = pendingEntryId === entry._id;
              return (
                <div
                  key={entry._id}
                  className="rounded-lg border bg-background/55 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {entry.appliesToAll
                          ? "All forms"
                          : entry.genres
                              .map(
                                (genre) =>
                                  getGenreRubric(genre as GenreId).shortName,
                              )
                              .join(" · ")}
                        {" · "}
                        {entry.tips.length} tips
                      </p>
                    </div>
                    <Badge
                      variant={
                        entry.status === "active" ? "secondary" : "outline"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      disabled={isPending}
                      aria-label={
                        entry.status === "active"
                          ? `Archive ${entry.title}`
                          : `Restore ${entry.title}`
                      }
                      onClick={() =>
                        void handleStatus(
                          entry._id,
                          entry.status === "active" ? "archived" : "active",
                        )
                      }
                    >
                      {isPending ? (
                        <Spinner />
                      ) : (
                        <ArchiveRestoreIcon />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      disabled={isPending}
                      aria-label={`Delete ${entry.title}`}
                      onClick={() => void handleRemove(entry._id)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
