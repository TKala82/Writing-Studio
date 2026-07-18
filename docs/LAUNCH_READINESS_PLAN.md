# Launch readiness plan

This plan turns the first-pass audit (`docs/LAUNCH_AUDIT_REPORT.md`) into an ordered fix sequence. Do not mark the product launch-ready until every P0 item is closed and the P1 checklist is signed off.

## Goal

Ship Lede with:
- a real multi-model editorial pipeline (not demo fixtures),
- authenticated private workspaces,
- abuse protections on AI spend,
- regression tests for the critical path,
- and an external check that fellowship-prompt quality holds up outside the product.

## Phase 0 — Unblock live AI (P0)

1. Top up / replace billing for:
   - Google Generative AI
   - Anthropic
   - OpenAI
2. Confirm with a one-shot smoke (already scriptable from the audit notes):
   - Google `generateText` returns text
   - Anthropic `generateText` returns text
   - OpenAI `generateText` returns text
3. Set Convex / production env:
   - `PIPELINE_DEMO_MODE` unset or `0`
   - model IDs pinned intentionally
4. Re-run signed-in Playwright critical path with demo mode off.
5. Exit criteria: one complete live pipeline finishes with review UI and no provider quota errors.

## Phase 1 — Production safety gates (P0/P1)

1. Fail boot or deploy when `PIPELINE_DEMO_MODE` is enabled in production.
2. Add `aiUsage.reserve` (or equivalent) to:
   - `selectionActions.legalLens`
   - `rubricActions.deriveFromReferences`
   - `voiceActions.addSample`
3. Document intentional exceptions only if a path is non-AI or locally free.
4. Add a CI job: `npm run check && npm test && npx playwright test`
5. Exit criteria: static audit reports zero missing rate limits on public AI actions; CI green on main.

## Phase 2 — Critical-path e2e completeness (P1)

Extend Playwright beyond “reach scorecard”:

| Flow | Assertions |
| --- | --- |
| Review decisions | Accept/reject hunks change text; Save writes shelf item |
| Delivery | Open “Prepare to deliver”, generate briefing in live mode |
| Practice | Start session, reply, finish, see feedback |
| Sources | Paste text + public URL success; localhost/private URL rejected |
| Uploads | Oversized / wrong MIME rejected; valid PDF/image accepted |
| Blank ideation | Interview → compose → pipeline |
| Custom rubric | Derive from references; use in rewrite |
| Voice | Add sample; later rewrite preserves traits |
| Auth gate | Signed-out user cannot invoke Convex AI actions |

Exit criteria: these flows have automated coverage or an explicit manual sign-off sheet with date/owner.

## Phase 3 — Backend isolation and abuse (P1/P2)

1. Ownership tests for documents, runs, sources, practice sessions, briefings.
2. Concurrent `claimRun` conflict behavior.
3. AI lease release on success and failure.
4. Input bounds: draft size, source text 120k, URL length, file 15MB.
5. Prompt-injection fixtures in drafts/sources that attempt to override system instructions / leak secrets.

Exit criteria: written test evidence that cross-user reads fail and leases do not stick.

## Phase 4 — Independent writing-quality proof (P1)

Follow `docs/EVAL_WORKFLOW.md` and freeze a brief with `docs/EVAL_BRIEF_TEMPLATE.md`.

1. Store live scenarios only in the external vault (never this repo).
2. Run Builder → generator (treatment vs control) → blind judges.
3. Require the predeclared passing rule (paired improvement, no fidelity regression).
4. Publish burned outputs after the decision.

Exit criteria: signed evaluation brief with pass/fail decision. In-app demo scores do not count.

## Phase 5 — Dependency and polish (P2/P3)

1. Revisit npm moderate advisories; upgrade Next/Clerk when safe patches exist.
2. Unify public-URL validation helpers; add DNS/redirect tests around `sourceActions`.
3. Firefox/WebKit smoke + basic a11y pass on home, preflight, review.
4. Add error toasts/recovery copy for quota exhaustion (currently a launch UX risk).
5. Optional: visual snapshots for home, preflight, review.

## Suggested ownership board

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| L0.1 | Restore provider credits | P0 | Open |
| L0.2 | Disable demo mode in prod | P0 | Open |
| L0.3 | Live pipeline e2e green | P0 | Open |
| L1.1 | Rate-limit uncapped AI actions | P1 | Open |
| L1.2 | CI test gate | P1 | Open |
| L2.1 | Expand Playwright flows | P1 | Open |
| L3.1 | Auth isolation tests | P1 | Open |
| L4.1 | External blind eval | P1 | Open |
| L5.1 | npm advisories review | P2 | Open |
| L5.2 | Cross-browser + a11y | P2 | Open |

## Definition of launch-ready

All of the following are true:

1. Live pipeline works with demo mode off.
2. P0/P1 board items closed or explicitly waived in writing.
3. `npm run check`, `npm test`, and critical Playwright suite pass in CI.
4. External prompt evaluation brief exists with a pass decision or an accepted risk waiver.
5. Production secrets reviewed; `PIPELINE_DEMO_MODE` absent.

## Current known-good baseline

Already green in this environment (with demo mode on):

- compile/lint/typecheck/build
- 17 unit tests
- 7 Playwright tests including signed-in critical path
- Clerk ticket sign-in
- Convex auth present on scanned public functions
- SSRF hostname unit rejects

Do not interpret that baseline as production readiness until Phase 0 and Phase 1 are done.
