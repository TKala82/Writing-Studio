import {
  CheckIcon,
  CircleIcon,
  LockKeyholeIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "active" | "complete" | "error";
  insight?: string;
}

interface PipelineProgressProps {
  title: string;
  steps: PipelineStep[];
  streamingText?: string;
}

export function PipelineProgress({
  title,
  steps,
  streamingText,
}: PipelineProgressProps) {
  const completed = steps.filter((step) => step.status === "complete").length;
  const activeIndex = steps.findIndex((step) => step.status === "active");
  const progress =
    ((completed + (activeIndex >= 0 ? 0.45 : 0)) / steps.length) * 100;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-10">
      <div className="flex flex-col gap-3 text-center">
        <Badge variant="outline" className="mx-auto">
          <LockKeyholeIcon data-icon="inline-start" />
          Facts locked before rewriting
        </Badge>
        <h1 className="font-heading text-4xl tracking-tight sm:text-5xl">
          The editor is reading closely.
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
          Each pass has one job. You will see the reasoning as a concise quality
          record, not a wall of model output.
        </p>
      </div>

      <Card className="paper-shadow [--card-spacing:--spacing(6)]">
        <CardHeader>
          <CardTitle className="truncate">{title}</CardTitle>
          <CardDescription>
            A multi-model editorial pass with a cross-family quality review.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Progress value={progress}>
            <ProgressLabel>Editorial progress</ProgressLabel>
          </Progress>
          <ol className="flex flex-col gap-1">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-lg px-2 py-3"
              >
                <span className="flex size-9 items-center justify-center rounded-full border bg-background">
                  {step.status === "complete" && <CheckIcon />}
                  {step.status === "active" && <Spinner />}
                  {step.status === "pending" && (
                    <CircleIcon className="text-muted-foreground" />
                  )}
                  {step.status === "error" && <XIcon />}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      0{index + 1}
                    </span>
                    {step.label}
                    {step.status === "active" && (
                      <SparklesIcon className="text-copper" />
                    )}
                  </span>
                  {step.insight && (
                    <span className="text-xs leading-relaxed text-muted-foreground">
                      {step.insight}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {streamingText ? (
            <div className="max-h-56 overflow-hidden rounded-xl border bg-paper p-4">
              <p className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-copper uppercase">
                Draft arriving live
              </p>
              <div className="whitespace-pre-wrap font-document text-sm leading-6 [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
                {streamingText}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
