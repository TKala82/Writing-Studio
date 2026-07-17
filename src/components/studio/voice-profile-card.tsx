"use client";

import { useAction, useQuery } from "convex/react";
import { AudioLinesIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { api } from "../../../convex/_generated/api";
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

interface VoiceProfileCardProps {
  enabled: boolean;
}

export function VoiceProfileCard({ enabled }: VoiceProfileCardProps) {
  const profile = useQuery(api.voiceProfiles.getMine, enabled ? {} : "skip");
  const addSample = useAction(api.voiceActions.addSample);
  const [sample, setSample] = useState("");
  const [showSample, setShowSample] = useState(false);
  const [isLearning, setIsLearning] = useState(false);

  if (!enabled) return null;

  async function handleLearn() {
    setIsLearning(true);
    try {
      await addSample({ text: sample });
      setSample("");
      setShowSample(false);
      toast.success("Voice profile updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not learn this sample",
      );
    } finally {
      setIsLearning(false);
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-3">
          <Badge variant="outline">
            <AudioLinesIcon data-icon="inline-start" />
            Voice memory
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {profile ? `${profile.sampleCount} samples` : "Not trained yet"}
          </span>
        </div>
        <CardTitle className="text-xl">
          {profile
            ? `${profile.spec.tone} · ${profile.spec.sentenceStyle}`
            : "Teach Lede what sounds like you."}
        </CardTitle>
        <CardDescription className="leading-5">
          Accepted drafts update this automatically. Add writing you already
          like to give Lede a stronger reference.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {profile ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.spec.distinctiveTraits.slice(0, 5).map((trait) => (
              <Badge key={trait} variant="secondary">
                {trait}
              </Badge>
            ))}
          </div>
        ) : null}
        {showSample ? (
          <>
            <Textarea
              value={sample}
              onChange={(event) => setSample(event.target.value)}
              placeholder="Paste a piece of your writing that sounds unmistakably like you…"
              className="min-h-36 resize-y font-document text-base leading-7"
              maxLength={40_000}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={sample.trim().length < 100 || isLearning}
                onClick={() => void handleLearn()}
              >
                {isLearning ? <Spinner data-icon="inline-start" /> : null}
                Learn this voice
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowSample(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setShowSample(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Add a writing sample
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
