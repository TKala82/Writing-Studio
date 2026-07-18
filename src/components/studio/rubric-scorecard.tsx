import {
  CheckCircle2Icon,
  CircleAlertIcon,
  GaugeIcon,
  LibraryIcon,
  ListChecksIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { computeScorecardPercent } from "@/lib/analysis/scorecard";
import type { GenreRubric } from "@/lib/genres";

interface CritiqueItem {
  criterionId: string;
  label: string;
  score: number;
  passed: boolean;
  rationale: string;
  suggestion?: string;
}

interface Finding {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface Metrics {
  wordCount: number;
  readabilityGrade: number;
  sentenceLengthDeviation: number;
  passiveVoiceEstimate: number;
}

interface Change {
  summary: string;
  reason: string;
  location: string;
}

interface Fact {
  id: string;
  claim: string;
  sourceText: string;
  sourceId?: string;
  sourceTitle?: string;
}

interface RubricScorecardProps {
  rubric: GenreRubric;
  critique: CritiqueItem[];
  findings: Finding[];
  metrics?: Metrics;
  changeLog: Change[];
  factInventory: Fact[];
}

export function RubricScorecard({
  rubric,
  critique,
  findings,
  metrics,
  changeLog,
  factInventory,
}: RubricScorecardProps) {
  const judgmentItems = rubric.criteria
    .filter((criterion) => criterion.kind === "judgment")
    .map(
      (criterion): CritiqueItem =>
        critique.find((item) => item.criterionId === criterion.id) ?? {
          criterionId: criterion.id,
          label: criterion.label,
          score: 1,
          passed: false,
          rationale: "The editorial review did not assess this criterion.",
          suggestion: "Run the quality review again before submitting.",
        },
    );
  const score = computeScorecardPercent({
    criteria: rubric.criteria,
    critique,
    findings,
  });

  return (
    <aside className="flex h-full min-h-0 flex-col border-l bg-card/70">
      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Editorial record
            </p>
            <h2 className="mt-1 font-heading text-2xl">Rubric scorecard</h2>
          </div>
          <Badge variant={score >= 80 ? "default" : "secondary"}>
            {score}%
          </Badge>
        </div>
        <Progress value={score}>
          <ProgressLabel>{rubric.shortName} proficiency</ProgressLabel>
        </Progress>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-6 px-5 py-5">
          {factInventory.some((fact) => fact.sourceTitle) ? (
            <>
              <section className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
                  <LibraryIcon />
                  Source evidence
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Claims available to the editor. Quoted lines show their
                  supporting source passage.
                </p>
                <div className="flex flex-col gap-3">
                  {factInventory.slice(0, 12).map((fact) => (
                    <div
                      key={`${fact.sourceId}-${fact.id}`}
                      className="rounded-lg border bg-background/55 p-3"
                    >
                      <p className="text-xs font-medium leading-relaxed">
                        {fact.claim}
                      </p>
                      <p className="mt-2 border-l-2 pl-2 font-document text-xs leading-relaxed text-muted-foreground">
                        “{fact.sourceText}”
                      </p>
                      <p className="mt-2 truncate text-[10px] font-semibold tracking-[0.1em] text-copper uppercase">
                        {fact.sourceTitle}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <Separator />
            </>
          ) : null}

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
              <ListChecksIcon />
              Genre judgment
            </h3>
            <div className="flex flex-col gap-3">
              {judgmentItems.map((item) => (
                <div
                  key={item.criterionId}
                  className="grid grid-cols-[1.1rem_1fr] gap-2"
                >
                  {item.passed ? (
                    <CheckCircle2Icon className="mt-0.5" />
                  ) : (
                    <CircleAlertIcon className="mt-0.5 text-copper" />
                  )}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {item.score}/4
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.rationale}
                    </p>
                    {item.suggestion && !item.passed && (
                      <p className="text-xs leading-relaxed text-foreground">
                        Next: {item.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
              <GaugeIcon />
              Measured checks
            </h3>
            <div className="flex flex-col gap-3">
              {findings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {finding.passed ? (
                      <CheckCircle2Icon />
                    ) : (
                      <CircleAlertIcon className="text-copper" />
                    )}
                    {finding.label}
                  </span>
                  <span className="max-w-36 text-right leading-relaxed text-muted-foreground">
                    {finding.detail}
                  </span>
                </div>
              ))}
            </div>
            {metrics && (
              <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Words</dt>
                  <dd className="mt-0.5 font-semibold">{metrics.wordCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reading grade</dt>
                  <dd className="mt-0.5 font-semibold">
                    {metrics.readabilityGrade}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Rhythm variance</dt>
                  <dd className="mt-0.5 font-semibold">
                    {metrics.sentenceLengthDeviation}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Passive estimate</dt>
                  <dd className="mt-0.5 font-semibold">
                    {metrics.passiveVoiceEstimate}%
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <Separator />

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase">
              Change log
            </h3>
            <ol className="flex flex-col gap-3">
              {changeLog.map((change, index) => (
                <li
                  key={`${change.location}-${index}`}
                  className="grid grid-cols-[1.25rem_1fr] gap-2 text-xs"
                >
                  <span className="font-heading text-base text-copper">
                    {index + 1}.
                  </span>
                  <span>
                    <span className="font-medium">{change.summary}</span>
                    <span className="mt-0.5 block leading-relaxed text-muted-foreground">
                      {change.location} · {change.reason}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
