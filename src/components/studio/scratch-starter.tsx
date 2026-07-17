"use client";

import {
  ArrowRightIcon,
  MessageSquareTextIcon,
} from "lucide-react";
import { useState } from "react";

import type { Id } from "../../../convex/_generated/dataModel";
import { LibrarianSuggestions } from "@/components/studio/librarian-suggestions";
import { PurposePicker } from "@/components/studio/purpose-picker";
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

interface ScratchStarterProps {
  disabled: boolean;
  librarianEnabled: boolean;
  disabledReason?: string;
  onUsePassage: (passage: string) => void;
  onOpenRun?: (runId: Id<"runs">) => void;
  onStart: (input: {
    genre: GenreId;
    customPurpose?: string;
    requestId: string;
  }) => Promise<void>;
}

export function ScratchStarter({
  disabled,
  librarianEnabled,
  disabledReason,
  onUsePassage,
  onOpenRun,
  onStart,
}: ScratchStarterProps) {
  const [genre, setGenre] = useState<GenreId>("social-post");
  const [customPurpose, setCustomPurpose] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const shelfContext = `I am beginning a new ${getGenreRubric(genre).shortName}. ${
    customPurpose.trim()
      ? `Its purpose is: ${customPurpose.trim()}`
      : "I want to discover a useful direction by drawing on themes and passages from my previous work."
  }`;

  async function startInterview() {
    if (disabled || isStarting) return;
    const stableRequestId = requestId ?? crypto.randomUUID();
    setRequestId(stableRequestId);
    setIsStarting(true);
    try {
      await onStart({
        genre,
        customPurpose: customPurpose.trim() || undefined,
        requestId: stableRequestId,
      });
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <Card className="overflow-hidden border-copper/30 bg-[linear-gradient(135deg,var(--card),color-mix(in_oklab,var(--accent)_45%,var(--card)))] paper-shadow">
      <CardHeader className="gap-3">
        <CardTitle className="max-w-2xl font-heading text-3xl tracking-[-0.02em] sm:text-4xl">
          Start with a conversation, not a cursor.
        </CardTitle>
        <CardDescription className="max-w-2xl leading-6">
          Choose the form and tell Lede what you are trying to do. A short
          interview will uncover the audience, stakes, evidence, and point of
          view hiding behind the blank page.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <PurposePicker
          value={genre}
          onChange={(nextGenre) => {
            setGenre(nextGenre);
            setRequestId(null);
          }}
        />
        <LibrarianSuggestions
          draft={shelfContext}
          genre={genre}
          customPurpose={customPurpose}
          enabled={librarianEnabled}
          minimumDraftLength={1}
          onInsert={onUsePassage}
          onOpenRun={onOpenRun}
        />
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            value={customPurpose}
            onChange={(event) => {
              setCustomPurpose(event.target.value);
              setRequestId(null);
            }}
            placeholder="Optional: what do you need this piece to achieve?"
            maxLength={500}
          />
          <Button
            type="button"
            size="lg"
            disabled={disabled || isStarting}
            onClick={() => void startInterview()}
          >
            {isStarting ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <MessageSquareTextIcon data-icon="inline-start" />
            )}
            {isStarting ? "Preparing questions" : "Interview me"}
            {!isStarting ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
        </div>
        {disabledReason ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {disabledReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
