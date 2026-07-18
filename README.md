# Lede — Genre-native writing studio

Lede turns drafts and source material into genre-native writing while locking
facts, preserving voice, and exposing every edit for review. It can read pasted
text, public web and YouTube links, PDFs, and images; suggest evidence-grounded
angles; then route the chosen angle through the same tracked editorial pipeline.
Writing formats include fellowship statements, CVs, cover letters, social
posts and threads, forum essays, research statements, outreach email, and
policy briefs. Lede can also derive a private rubric from two or three examples
of a form you admire.

Before a live rewrite, a short interview asks only for missing information that
would materially change the piece, surfaces blind spots, and offers divergent
editorial directions. Drafts, source angles, voice traits, and explicit
accept/reject decisions persist to the private workspace. The pipeline streams
the first rewrite, re-judges up to two targeted revisions, and ends with a
submission-readiness report.

## Local setup

1. Install dependencies and create the local Convex deployment:

```bash
npm install
npx convex dev --once
```

2. Copy `.env.example` to `.env.local` and add Clerk's publishable and secret
keys. In Clerk, create a Convex JWT template named `convex`.

3. Set secrets on the Convex deployment, because the model pipeline runs inside
Convex actions:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://your-clerk-domain"
npx convex env set GOOGLE_GENERATIVE_AI_API_KEY "..."
npx convex env set ANTHROPIC_API_KEY "..."
npx convex env set OPENAI_API_KEY "..."
```

Optional model overrides use `GOOGLE_ANALYSIS_MODEL`,
`ANTHROPIC_REWRITE_MODEL`, and `OPENAI_CRITIQUE_MODEL` in the same Convex
environment.

4. Run Convex and Next.js in separate terminals:

```bash
npm run dev:convex
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without Clerk keys, the app
enters setup mode and offers a local fellowship example so the tracked-changes
and scorecard experience can still be reviewed.

Source uploads accept PDFs and images up to 15 MB. Pasted sources are limited to
120,000 characters, and one composition can use up to eight ready sources.

In the review workspace, highlight text and right-click for dictionary,
thesaurus, multi-option rewording, or a curated South African commercial-law
lens (POPIA, CPA, gift cards, loyalty, crypto, King governance, plus EU AI Act
for EU-facing AI content). Legal results are informational spotting against
typed regime summaries—not legal advice.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## External prompt evaluation

The signed-in demo pipeline verifies product behavior; its score is not
independent evidence that the production prompt is better. For blind A/B
testing against the Oxford, Georgetown, MIT, Princeton, and Yale guidance
synthesis, use the separately isolated Builder, generator, and judge workflow
in [docs/EVAL_WORKFLOW.md](docs/EVAL_WORKFLOW.md). Freeze the run in advance
with [docs/EVAL_BRIEF_TEMPLATE.md](docs/EVAL_BRIEF_TEMPLATE.md), and keep live
benchmark scenarios outside this repository.
