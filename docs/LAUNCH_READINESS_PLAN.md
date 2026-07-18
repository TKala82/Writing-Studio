# Launch readiness plan

Ordered fix sequence after the first-pass audit. Do not mark launch-ready until
every P0 item is closed and the revised P1 checklist is signed off.

## Goal

Ship Lede with:

- a real multi-model editorial pipeline (not demo fixtures);
- authenticated private workspaces;
- abuse protections on AI spend;
- regression tests for the critical path;
- an external check that fellowship-prompt quality holds up outside the product.

## Revised priority order

1. Production demo-mode guard + AI rate limits (**done in repo**)
2. Restore provider credits and configure quota / budget alerts (**operator**)
3. Live signed-in pipeline with demo mode off (**blocked on credits**)
4. Auth-isolation + failure-path coverage (**partially started**)
5. Independent blind writing evaluation via `docs/EVAL_WORKFLOW.md`

## Phase 0 — Production safety gates (code)

| ID | Item | Status |
| --- | --- | --- |
| L0.1 | Fail closed when `PIPELINE_DEMO_MODE` is on for `prod:*` / Vercel production | Done — `assertDemoModeAllowed` |
| L0.2 | Require `ALLOW_PIPELINE_DEMO_MODE=1` for local/cloud demos | Done |
| L0.3 | Deploy gate `npm run assert:demo-off` | Done |
| L0.4 | Rate-limit `legalLens`, `deriveFromReferences`, `addSample` | Done |
| L0.5 | Static audit fails if those rate limits regress | Done — `npm run audit:static` |

Exit criteria for this phase: `npm run test:launch-gates` passes.

## Phase 1 — Unblock live AI (operator)

1. Top up / replace billing for Google Generative AI, Anthropic, and OpenAI.
2. Configure budget alerts / hard caps on each provider project.
3. Confirm one-shot `generateText` smoke on all three providers.
4. Set Convex / production env:
   - `PIPELINE_DEMO_MODE` unset or `0`
   - `ALLOW_PIPELINE_DEMO_MODE` unset or `0`
   - model IDs pinned intentionally
5. Re-run the signed-in critical path with demo mode off.

Exit criteria: one complete live pipeline finishes with review UI and no provider
quota errors. Demo-mode e2e success does **not** satisfy this phase.

## Phase 2 — Critical-path confidence (P1)

| ID | Item | Status |
| --- | --- | --- |
| L2.1 | Unit tests for demo guard + rate-limit wiring | Done |
| L2.2 | Static auth-surface scan for public Convex exports | Done (static) |
| L2.3 | Runtime User A / User B isolation tests | Open |
| L2.4 | Expand Playwright beyond happy path (accept/reject, delivery, practice, sources, uploads) | Open |
| L2.5 | Provider 429 / quota error UX | Open |
| L2.6 | CI job: `check` + `test:launch-gates` (+ Playwright when secrets present) | Open |

## Phase 3 — Independent writing-quality proof (P1)

Follow `docs/EVAL_WORKFLOW.md`. Store live scenarios only in the external vault
at `C:\Users\shabs\OneDrive\Documents\scenarios-vault`. In-app demo scores do
not count.

Exit criteria: signed evaluation brief with pass/fail decision, or an explicit
written risk waiver.

## Phase 4 — Dependency and polish (P2)

1. Triage the 15 moderate npm advisories by runtime reachability; do not treat
   the raw count as a launch blocker.
2. Unify public-URL validation helpers; add DNS/redirect tests.
3. Firefox/WebKit smoke + basic a11y.
4. Observability for pipeline stage failures and AI lease leaks.

## Definition of launch-ready

1. Live pipeline works with demo mode off.
2. P0/P1 board items closed or explicitly waived in writing.
3. `npm run check` and `npm run test:launch-gates` pass in CI.
4. External prompt evaluation brief exists with a pass decision or accepted waiver.
5. Production secrets reviewed; `PIPELINE_DEMO_MODE` absent.

## Commands

```bash
npm run check
npm run test:launch-gates
# After credits restored and demo mode off:
# npx playwright test
# node scripts/record-pipeline-demo.mjs   # only as UI smoke, never as quality proof
```
