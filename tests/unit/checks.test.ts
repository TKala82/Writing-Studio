import { describe, expect, it } from "vitest";

import { runDeterministicChecks } from "@/lib/analysis/checks";
import { motivationStatementRubric } from "@/lib/genres/motivation-statement";

const STRONG_DRAFT = `In a third-year seminar I compared three public-sector algorithmic
accountability frameworks and found they used incompatible definitions of
"explanation." I wrote a 3,200-word paper proposing a shared comparison table,
presented it to 18 classmates, and revised it after two classmates challenged
my treatment of affected communities. That revision left me with a sharper
question: how do procurement teams evaluate explanation claims before buying
automated decision systems? The challenge was not finding more frameworks. It
was deciding which definition of explanation would change a purchase decision.

I want to use this fellowship's weekly research clinics to turn that question
into a public research memo others can reuse. The eight-week structure would
force me to choose one procurement setting, one evaluation method, and one
clear failure mode rather than collecting frameworks without a decision rule.
I have never published a public research memo, so the final deliverable is the
capability I still lack. Clinic feedback from technical and policy researchers
would help me test whether a buyer-facing checklist survives contact with real
procurement language instead of remaining a seminar exercise.

By the end of the programme I would produce a short memo that maps how two
procurement teams currently check explanation claims and names one concrete
test a non-specialist buyer could run. That output follows from the seminar
work already completed and from the clinic feedback I do not yet have. If the
memo only restates known frameworks, it has failed. If it gives a buyer one
decision rule they can apply under time pressure, it has succeeded.

I am not asking the fellowship to invent my topic. I am asking it to supply the
missing pressure: repeated critique, an interdisciplinary cohort, and a public
deadline that turns a course paper into an evaluation artifact others can
inspect, contest, and improve. The seminar already proved I can compare
frameworks carefully. What remains is learning to choose one buyer-relevant
failure mode, defend that choice in front of people who disagree, and leave
behind a test that does not depend on my presence to remain useful.`;

function ensureMinWords(text: string, minWords: number): string {
  let draft = text.trim();
  let words = draft.split(/\s+/).filter(Boolean).length;
  let n = 1;
  while (words < minWords) {
    draft += ` Additional detail ${n}: the clinic critique would force a sharper buyer-facing decision rule.`;
    words = draft.split(/\s+/).filter(Boolean).length;
    n += 1;
  }
  return draft;
}

describe("runDeterministicChecks", () => {
  it("passes a dense motivation draft inside the target band", () => {
    const draft = ensureMinWords(
      STRONG_DRAFT,
      motivationStatementRubric.length.minWords,
    );
    const result = runDeterministicChecks(draft, motivationStatementRubric);
    expect(result.metrics.wordCount).toBeGreaterThanOrEqual(
      motivationStatementRubric.length.minWords,
    );
    expect(result.metrics.wordCount).toBeLessThanOrEqual(
      motivationStatementRubric.length.maxWords,
    );
    expect(result.findings.find((finding) => finding.id === "word-count")?.passed).toBe(
      true,
    );
    expect(
      result.findings.find((finding) => finding.id === "banned-phrases")?.passed,
    ).toBe(true);
  });

  it("fails stock AI phrasing and under-length drafts", () => {
    const weak =
      "I have always been passionate about AI. In today's rapidly evolving technological landscape this prestigious programme would be a dream come true.";
    const result = runDeterministicChecks(weak, motivationStatementRubric);
    expect(result.findings.find((finding) => finding.id === "word-count")?.passed).toBe(
      false,
    );
    expect(
      result.findings.find((finding) => finding.id === "banned-phrases")?.passed,
    ).toBe(false);
    expect(result.bannedPhrases.length).toBeGreaterThan(0);
  });

  it("detects negative parallelism across repeated calls", () => {
    const text =
      "It's not just a fellowship; it's a launching pad. " +
      "This is not just training — this is the next chapter.";
    const first = runDeterministicChecks(text, motivationStatementRubric);
    const second = runDeterministicChecks(text, motivationStatementRubric);
    expect(first.bannedPhrases.some((phrase) => phrase.includes("negative parallelism"))).toBe(
      true,
    );
    expect(second.bannedPhrases.some((phrase) => phrase.includes("negative parallelism"))).toBe(
      true,
    );
  });
});
