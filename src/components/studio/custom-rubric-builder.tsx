"use client";

import { useAction } from "convex/react";
import { BookCopyIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { GenreId } from "@/lib/genres";

interface CustomRubricBuilderProps {
  onCreated: (result: {
    rubricId: Id<"customRubrics">;
    baseGenre: GenreId;
  }) => void;
}

export function CustomRubricBuilder({
  onCreated,
}: CustomRubricBuilderProps) {
  const derive = useAction(api.rubricActions.deriveFromReferences);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [references, setReferences] = useState("");
  const [isDeriving, setIsDeriving] = useState(false);

  async function handleDerive() {
    const examples = references
      .split(/\n\s*---+\s*\n/)
      .map((reference) => reference.trim())
      .filter(Boolean);
    setIsDeriving(true);
    try {
      const result = await derive({ name, references: examples });
      onCreated(result);
      setOpen(false);
      setName("");
      setReferences("");
      toast.success("Custom form learned from your references");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not derive a custom form",
      );
    } finally {
      setIsDeriving(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Teach Lede a form from examples
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BookCopyIcon className="size-4 text-copper" />
          Learn a custom writing form
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Paste two or three examples you admire, separated by a line containing
          <code className="mx-1 rounded bg-muted px-1">---</code>. Lede learns
          their shared standards, not their subject matter.
        </p>
      </div>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Form name, e.g. Analytical fellowship update"
        maxLength={80}
      />
      <Textarea
        value={references}
        onChange={(event) => setReferences(event.target.value)}
        placeholder={"First reference…\n\n---\n\nSecond reference…"}
        className="min-h-52 resize-y font-document leading-7"
        maxLength={60_000}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={
            isDeriving ||
            name.trim().length < 3 ||
            references.split(/\n\s*---+\s*\n/).length < 2
          }
          onClick={() => void handleDerive()}
        >
          {isDeriving ? <Spinner data-icon="inline-start" /> : null}
          {isDeriving ? "Learning the form" : "Derive rubric"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
