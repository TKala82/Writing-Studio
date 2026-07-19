<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This repo is **Lede**, a Next.js 16 + Convex + Clerk writing studio with an AI editorial pipeline (Google Gemini → Anthropic → OpenAI).

### Services & how to run them
- The environment is defined in `.cursor/environment.json`. It runs two long-lived terminals: **Convex** (`npx convex dev`) and **Next.js** (`bash scripts/agent-env-setup.sh start`, which sets Convex deployment env vars then `npm run dev` on port 3000). Prefer these over ad-hoc commands.
- Lint/typecheck: `npm run lint`, `npm run typecheck` (or `npm run check`). Unit tests run with `npm test`; signed-in browser tests run with `npm run test:e2e`; launch gates run with `npm run test:launch-gates`.

### Non-obvious caveats
- **Required runtime secrets:** `scripts/agent-env-setup.sh` hard-fails if `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` is missing. It writes `.env.local` (frontend) and sets the same on the Convex deployment.
- **Convex runs in anonymous local mode** (`CONVEX_AGENT_MODE=anonymous`) with no Convex account. Deployment env vars are applied by the `start` script *after* the backend is up — so a bare `npx convex dev --once` during install fails on `CLERK_JWT_ISSUER_DOMAIN` until those are set; this is expected on first boot.
- **Clerk is a development instance** (`pk_test_...`). For UI login testing, use a `+clerk_test` email address so the new-device verification OTP is the fixed code **`424242`**. The provided `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` may not work directly (e.g. `TEST_USER_EMAIL` holding a `user_...` ID, or the account lacking password login); when needed, provision a password-enabled `+clerk_test` user via the Clerk Backend API using `CLERK_SECRET_KEY` (`POST https://api.clerk.com/v1/users`).
- **AI pipeline dependency:** the first pipeline step (`convex/pipelineActions.ts` → preflight) calls Google Gemini. If `GOOGLE_GENERATIVE_AI_API_KEY`'s project is out of quota/credits, the run fails with `AI_RetryError ... prepayment credits are depleted` (HTTP 429) and no rewrite is produced — this is external billing, not a code bug. The model IDs are configurable via `GOOGLE_ANALYSIS_MODEL`, `ANTHROPIC_REWRITE_MODEL`, `OPENAI_CRITIQUE_MODEL` (see `convex/lib/models.ts`).
- **Demo mode:** `PIPELINE_DEMO_MODE=1` only works with `ALLOW_PIPELINE_DEMO_MODE=1`, and never on `prod:*` Convex deployments. `scripts/agent-env-setup.sh` sets the allow flag when demo mode is present. Production must keep both off (`npm run assert:demo-off`). Demo success is UI smoke, not writing-quality proof.
- **Launch gates:** `npm run test:launch-gates` runs the demo-off assert, static Convex audit (auth + AI rate limits), and unit tests.
- **External prompt evaluation:** `npm run eval -- --set dev --mock` rehearses orchestration without API spend. Live `dev` and `holdout` scenario JSON stays in the external vault selected by `EVAL_VAULT_DIR`. Never copy it into the repository.
- **Prompt research:** `research/program.md` defines the supervised loop. `npm run research:guard` enforces that experiments touch only `convex/lib/prompts.ts` or `src/lib/genres/*`.
