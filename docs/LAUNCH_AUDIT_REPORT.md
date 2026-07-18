# Launch audit report — security gates pass

Generated: 2026-07-18  
Branch: `cursor/finish-external-eval-workflow-f6c1` after demo-mode + rate-limit hardening

## Verdict

Still **not launch-ready**. Production demo-mode and AI rate-limit gaps from the
earlier audit are closed in code. Live Google / Anthropic / OpenAI generation
remains blocked until provider credits are restored. Independent blind writing
evaluation has not been run.

## What this pass closed

| Area | Result |
| --- | --- |
| Demo mode on `prod:*` / Vercel production | Fail-closed via `assertDemoModeAllowed` |
| Local demo without `ALLOW_PIPELINE_DEMO_MODE` | Fail-closed |
| Deploy gate `npm run assert:demo-off` | Added |
| `legalLens` rate limit | `aiUsage.reserve` / `release` |
| `deriveFromReferences` rate limit | `aiUsage.reserve` / `release` |
| `addSample` rate limit | `aiUsage.reserve` / `release` |
| Static audit for those gaps | `npm run audit:static` |
| Unit coverage for guards / rate-limit wiring / auth surface | `tests/unit/*` |

## What remains blocked / open

| Area | Priority | Status |
| --- | --- | --- |
| Live provider generation (Google / Anthropic / OpenAI) | P0 | Blocked — credits/quota |
| Live signed-in pipeline with demo mode off | P0 | Blocked on credits |
| Runtime auth isolation (User A cannot read User B) | P1 | Static surface scan only |
| Broader Playwright critical-path coverage | P1 | Open |
| Independent blind writing-quality eval | P1 | Open — see `docs/EVAL_WORKFLOW.md` |
| Moderate npm advisories | P2 | Triage, not raw-count blocker |

## Important distinction

`PIPELINE_DEMO_MODE=1` plus `ALLOW_PIPELINE_DEMO_MODE=1` is for local / cloud-agent
UI smoke only. It returns fixture editorial content and cannot prove copy quality.
Production must keep both flags off (`npm run assert:demo-off`).

## How to re-verify this pass

```bash
npm run check
npm run test:launch-gates
```
