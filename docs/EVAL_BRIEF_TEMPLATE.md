# External evaluation brief

Complete and freeze this brief before revealing benchmark scenarios.

## Run identity

- Evaluation ID:
- Date (UTC):
- Owner:
- Repository URL:
- Frozen commit SHA:
- Production prompt file(s):
- Production prompt hash:
- Scenario-set ID and hash:
- Rubric version and hash:
- Randomization seed:

## Hypothesis and decision rule

- Primary hypothesis:
- Minimum meaningful paired improvement:
- Factual-fidelity tolerance:
- Required confidence interval:
- Subgroups that must not regress:
- Predeclared exclusions:
- Stopping rule:

## Generation

- Runtime / Builder:
- Generator model and exact version:
- Model parameters:
- Token limit:
- Treatment prompt source:
- Control prompt:
- Number of scenarios:
- Number of generations per condition:
- Timeout and retry policy:

## Blind judging

- Judge model(s) and exact versions:
- Judge parameters:
- Number of judges per pair:
- Tie-break rule:
- Evidence citation required: yes / no
- Repository access disabled: yes / no
- Prompt labels removed: yes / no
- Output order randomized: yes / no

## Source guidance

For each source, record URL, retrieval time, content hash or archive reference,
and the rubric requirements derived from it.

| Institution | URL | Retrieved UTC | Hash / archive | Derived requirements |
| --- | --- | --- | --- | --- |
| Oxford |  |  |  |  |
| Georgetown |  |  |  |  |
| MIT |  |  |  |  |
| Princeton |  |  |  |  |
| Yale |  |  |  |  |

## Results

- Treatment mean:
- Control mean:
- Mean paired delta:
- 95% bootstrap confidence interval:
- Treatment win / tie / loss:
- Treatment factual-fidelity failures:
- Control factual-fidelity failures:
- Inter-judge agreement:
- Subgroup deltas:
- Runtime:
- Input / output tokens:
- Estimated cost:
- Timeouts / retries:

## Decision and limitations

- Decision: pass / fail / exploratory
- Decision-rule calculation:
- Known limitations:
- Deviations from this brief:
- Human reviewer sign-off:
- Artifact manifest and hashes:
