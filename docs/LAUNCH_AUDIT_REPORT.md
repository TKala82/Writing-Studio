# Launch audit report — first pass

Generated: 2026-07-18T14:20:00.000Z  
Branch: `cursor/finish-external-eval-workflow-f6c1`  
Environment: Cloud agent anonymous Convex + Next.js on localhost:3000

## Verdict

The app is **not launch-ready**. Critical-path product UX works under demo mode, automated unit/e2e gates mostly pass, but **live AI generation is blocked by depleted provider credits** on Google, Anthropic, and OpenAI. Several medium-risk production gaps remain.

## Executive summary

| Area | Result |
| --- | --- |
| Lint + typecheck | Passed |
| Production build | Passed |
| Unit tests (17) | Passed |
| Playwright e2e (7) | Passed |
| Signed-in draft → preflight → review | Passed (**via `PIPELINE_DEMO_MODE=1`**) |
| Provider API key auth / models list | Passed |
| Live model generation (Google / Anthropic / OpenAI) | **Failed — credits depleted** |
| Static Convex auth/returns scan | No critical auth gaps; 3 medium rate-limit gaps |
| Production dependency audit | 15 moderate, 0 high/critical |
| Independent writing-quality eval | **Not run** (external workflow still required) |

## What was tested

### 1. Compile / static quality
- `npm run check` — pass
- `npm run build` — pass (after fixing a readonly scorecard typing issue introduced during harness work)

### 2. Unit tests (`npm test`)
Coverage added under `tests/unit/`:
- Deterministic checks / banned phrases / negative parallelism
- Scorecard aggregation (missing critiques fail closed)
- Semantic diff accept/reject
- Public URL / SSRF hostname rejects
- Dictionary word extraction
- Demo-mode env parsing

Result: **17/17 passed**

### 3. End-to-end (Playwright)
- Unsigned home + mobile viewport
- Feature surface inventory
- Signed-in draft path with Clerk ticket
- Preflight interview completion
- Review workspace with tracked changes + scorecard
- Sources mode ingest affordances
- Blank/ideation mode starter
- Review toolbar buttons confirmed present: Readiness, Prepare to deliver, Practise, Save

Result: **7/7 passed**

Artifacts: `artifacts/launch-audit/` (gitignored), including `review-toolbar.png`

### 4. Backend / security static audit
Script: `scripts/static-launch-audit.mjs`

Findings:
1. `convex/rubricActions.ts:deriveFromReferences` — public AI action without `aiUsage.reserve`
2. `convex/selectionActions.ts:legalLens` — public AI action without `aiUsage.reserve`
3. `convex/voiceActions.ts:addSample` — public AI action without `aiUsage.reserve`

No public function was found missing auth or returns validators in the scanned chunks.

SSRF hostname rejects covered by unit tests for localhost / RFC1918 / link-local / non-HTTP schemes.

### 5. AI provider probes
Models-list / auth:
- OpenAI: pass
- Google: pass
- Anthropic: pass

Live generation (`generateText` smoke):
- Google: **fail** — prepayment credits depleted
- Anthropic: **fail** — credit balance too low
- OpenAI: **fail** — quota exceeded

Therefore the multi-model editorial pipeline cannot be validated live in this environment. E2E success used demo mode only.

### 6. Dependency audit
`npm audit --omit=dev`:
- critical: 0
- high: 0
- moderate: 15
- low: 0

Primarily Next/PostCSS and Clerk UI / Solana transitive advisories. No non-breaking direct fix available for current package pins.

## Failures and gaps to sort

### P0 — launch blockers
1. **Live AI credits exhausted** for Google, Anthropic, and OpenAI. Production rewrite/critique/analysis cannot run.
2. **`PIPELINE_DEMO_MODE` must be forced off in production.** It is currently useful for demos and was enabled during this audit; a production deploy with it on would fake editorial quality.

### P1 — high priority before launch
3. Rate-limit three uncapped AI actions: `legalLens`, `deriveFromReferences`, `addSample`.
4. Add a production smoke check that fails deploy if `PIPELINE_DEMO_MODE` is truthy.
5. Run at least one live signed-in pipeline (demo mode off) after credits are restored; assert scorecard + factual fidelity.
6. Expand e2e beyond happy path:
   - accept/reject hunks + save to shelf
   - open Delivery briefing and generate
   - open Practice arena start/reply/finish
   - source URL ingest success + private URL rejection in UI
   - PDF/image upload limits
   - custom rubric derivation
   - voice profile sample
   - library shelf suggestions
7. Complete the external blind evaluation in `docs/EVAL_WORKFLOW.md` (treatment vs control) — in-app scores are not independent evidence.

### P2 — should-fix for launch confidence
8. Resolve or explicitly waive the 15 moderate npm advisories.
9. Deduplicate URL validation between `src/lib/security/public-url.ts` and `convex/sourceActions.ts` DNS-pinning path; add redirect/DNS unit tests.
10. Cross-browser e2e (Firefox/WebKit) and basic a11y checks (labels, focus order, dialogs).
11. Auth isolation tests: User A cannot read User B documents/runs/sources.
12. Error-path UX: provider 429/quota, malformed model JSON, concurrent run claim conflicts.

### P3 — nice-to-have / post-launch
13. Visual regression screenshots for major states.
14. Load/performance budget on homepage and review workspace.
15. Observability: structured logs/alerts for pipeline stage failures and AI lease leaks.

## Important caveats

- Passing demo-mode e2e proves the UI state machine and Convex persistence path, **not** live model quality.
- Delivery/Practice controls are present in the review toolbar (`Prepare to deliver`, `Practise`); an earlier body-text probe missed British spelling / wording and was a false negative.
- Independent fellowship-prompt efficacy still requires the isolated Builder → generator → blind-judge workflow.

## How to re-run this audit

```bash
# Servers: Convex + Next (see .cursor/environment.json)
npm run check
npm test
npx playwright test
node scripts/static-launch-audit.mjs
npm run test:audit   # full orchestrated runner
```

Restore provider credits, set `PIPELINE_DEMO_MODE=0`, then re-run the signed-in Playwright critical path and a live generation smoke before calling the release green.
