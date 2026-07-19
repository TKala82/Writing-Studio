# Lede prompt research programme

You are running one supervised prompt experiment, not implementing product
features. The objective is to improve blind paired writing quality on the
external development scenario set without weakening factual fidelity.

## Non-negotiable boundaries

- You may edit only:
  - `convex/lib/prompts.ts`
  - files under `src/lib/genres/`
- Never edit the evaluation harness, judge prompt, scoring code, vault loader,
  scenario files, tests, or this programme during an experiment.
- Never open, print, copy, or commit live holdout scenarios. The runner receives
  only the named external development set.
- Make one coherent hypothesis and one small diff per cycle.
- Do not optimize against mock scores. `EVAL_MOCK=1` proves orchestration only.
- A factual-fidelity regression is an automatic discard, even if mean score
  rises.
- Do not commit or push automatically. The first research runs are supervised;
  leave a keep/discard recommendation for human approval.

## One experiment cycle

1. Read `research/HYPOTHESES.md` and the current experiment ledger.
2. Select the first untested hypothesis that is not made obsolete by a prior
   result.
3. Record the baseline SHA and verify the working tree is clean.
4. Run the baseline against the external development set:

   ```bash
   npm run research:experiment -- --hypothesis "<short hypothesis>" --baseline
   ```

5. Edit only the allowlisted prompt or genre files.
6. Run `npm run check` and the prompt-diff allowlist guard.
7. Run the candidate against the exact same development set and seed:

   ```bash
   npm run research:experiment -- --hypothesis "<short hypothesis>"
   ```

8. Recommend **KEEP** only when all conditions hold:
   - mean paired delta improves by at least 3 points over the recorded baseline
     (or the higher pre-registered `EVAL_RESEARCH_MIN_IMPROVEMENT`);
   - the lower bootstrap bound does not worsen;
   - factual-fidelity failures do not increase;
   - no subgroup regresses by more than 3 points;
   - launch gates still pass.
9. Otherwise recommend **DISCARD** and restore the prompt files to the baseline
   content without touching unrelated work.
10. Append the result through the runner. Report the hypothesis, exact diff,
    scores, cost, and keep/discard recommendation.

## Holdout discipline

The external `dev` set is for repeated research. It is not launch evidence.
The formal `holdout` set must remain unseen until a frozen release candidate is
evaluated. Once a holdout set is used, publish or mark it burned and replace it
before the next formal decision.

## Stop conditions

Stop the cycle and report a blocker when:

- the working tree contains unrelated changes;
- the allowlist guard fails;
- provider or budget limits are reached;
- the development scenario set is absent;
- judge/model family separation cannot be maintained;
- the result cannot be compared to the baseline with the same configuration.
