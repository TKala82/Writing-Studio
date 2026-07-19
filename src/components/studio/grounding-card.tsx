"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CircleCheckIcon,
  CompassIcon,
  PencilLineIcon,
} from "lucide-react";
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

interface GroundingCardProps {
  enabled: boolean;
}

export function GroundingCard({ enabled }: GroundingCardProps) {
  const profile = useQuery(api.writerProfile.getMine, enabled ? {} : "skip");
  const save = useMutation(api.writerProfile.save);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [aboutMe, setAboutMe] = useState("");
  const [objectives, setObjectives] = useState("");
  const [audience, setAudience] = useState("");

  if (!enabled) return null;

  function openEditor() {
    setAboutMe(profile?.aboutMe ?? "");
    setObjectives(profile?.objectives ?? "");
    setAudience(profile?.audience ?? "");
    setIsOpen(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await save({
        aboutMe: aboutMe.trim() || undefined,
        objectives: objectives.trim() || undefined,
        audience: audience.trim() || undefined,
      });
      setIsOpen(false);
      toast.success("Writer grounding updated across Lede");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save your writer grounding",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const completedSections = profile
    ? [profile.aboutMe, profile.objectives, profile.audience].filter(Boolean)
        .length
    : 0;

  return (
    <Card
      size="sm"
      className="overflow-hidden border-primary/15 bg-[linear-gradient(155deg,var(--card),color-mix(in_oklab,var(--primary)_5%,var(--card)))]"
    >
      <CardHeader>
        <div className="mb-1 flex items-center justify-between gap-3">
          <Badge variant="outline">
            <CompassIcon data-icon="inline-start" />
            Writer grounding
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {completedSections > 0
              ? `${completedSections}/3 sections`
              : "Not grounded yet"}
          </span>
        </div>
        <CardTitle className="font-heading text-2xl leading-tight">
          Give every feature the same north star.
        </CardTitle>
        <CardDescription className="leading-5">
          Your background, current objective, and usual readers guide every
          interview, angle, rewrite, and delivery briefing.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isOpen ? (
          <div className="flex flex-col gap-4 border-t border-primary/10 pt-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="grounding-about" className="text-xs font-semibold">
                Who you are
              </label>
              <Textarea
                id="grounding-about"
                value={aboutMe}
                onChange={(event) => setAboutMe(event.target.value)}
                placeholder="Your background, domain experience, and the perspective you bring…"
                className="min-h-28 resize-y font-document leading-6"
                maxLength={1_500}
              />
              <p className="text-[11px] text-muted-foreground">
                Context, not a résumé. Include only what should shape your
                writing.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="grounding-objectives"
                className="text-xs font-semibold"
              >
                What you are working toward
              </label>
              <Textarea
                id="grounding-objectives"
                value={objectives}
                onChange={(event) => setObjectives(event.target.value)}
                placeholder="The decisions, applications, research questions, or outcomes that matter now…"
                className="min-h-28 resize-y font-document leading-6"
                maxLength={1_500}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="grounding-audience"
                className="text-xs font-semibold"
              >
                Who you usually write for
              </label>
              <Textarea
                id="grounding-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="Selection committees, technical peers, policy teams, potential collaborators…"
                className="min-h-24 resize-y font-document leading-6"
                maxLength={1_500}
              />
            </div>

            <p className="text-[11px] leading-4 text-muted-foreground">
              Grounding shapes intent and relevance. Lede will never use it as
              evidence for a factual claim.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={() => void handleSave()}
              >
                {isSaving ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <CircleCheckIcon data-icon="inline-start" />
                )}
                Save grounding
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isSaving}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {profile ? (
              <div className="grid gap-2 border-t border-primary/10 pt-4">
                {profile.aboutMe ? (
                  <p className="line-clamp-2 text-xs leading-5">
                    <span className="font-semibold">You:</span>{" "}
                    {profile.aboutMe}
                  </p>
                ) : null}
                {profile.objectives ? (
                  <p className="line-clamp-2 text-xs leading-5">
                    <span className="font-semibold">Working toward:</span>{" "}
                    {profile.objectives}
                  </p>
                ) : null}
                {profile.audience ? (
                  <p className="line-clamp-2 text-xs leading-5">
                    <span className="font-semibold">Readers:</span>{" "}
                    {profile.audience}
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={openEditor}
            >
              <PencilLineIcon data-icon="inline-start" />
              {profile ? "Edit grounding" : "Add your context"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
