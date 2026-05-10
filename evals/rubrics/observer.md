# Memory observer rubric

Score the observer's promotion decisions against expected behavior.

### correct_promotion
The observer promoted exactly the patterns that should have been
promoted given the episodic evidence. No false promotes (single-instance
patterns elevated to claims), no missed promotes (clear ≥3-instance
patterns left unrecorded).

- 5: All expected promotions made; no false promotes.
- 3: 1 false promote OR 1 missed promote.
- 1: Multiple false or missed promotes.

### appropriate_confidence
Confidence level (`low`/`med`/`high`) matches the evidence count and
strength. 1-2 supports = low, 3-4 = med, 5+ = high.

- 5: Confidence levels exactly right.
- 3: One claim off by one level.
- 1: Multiple claims with wildly wrong confidence.

### evidence_provenance
Every claim cites the specific episodic ids that support it. The cited
ids actually exist in the episodic file.

- 5: All claims fully cite real episodic ids.
- 1: Claims cite no evidence or fabricated ids.

### supersession_correctness
When new evidence contradicts an existing claim, the observer
supersedes the old claim (rather than creating a duplicate or ignoring
the conflict).

- 5: Contradictions handled by clean supersession.
- 3: Contradiction noticed but handled clumsily (e.g. duplicate claim).
- 1: Contradictions ignored or both claims left active.

### no_premature_promotion
Single-instance dramatic events do NOT become claims. Two instances are
"suggestive" — should be a `low`-confidence claim at most. Three or
more is the promotion threshold.

- 5: Bias correctly toward restraint.
- 1: Promotes one-off events to claims.

### output_format
Output is valid JSON matching the spec in
`.claude/agents/memory-observer.md`. No prose outside JSON.

- 5: Clean JSON, all four arrays present.
- 1: Invalid JSON or extraneous prose.
