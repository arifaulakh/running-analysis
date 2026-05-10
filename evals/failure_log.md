# Failure log

Every notable failure of the coach (or its subagents) gets an entry here:
what failed, the smallest fixture that reproduces it, and the fix.

This file is the single artifact that proves the project iterated on real
failures rather than shipping a happy-path demo. Append to it; never
delete entries.

## Entry template

```
### YYYY-MM-DD — short title

**Symptom.** What the agent did wrong.
**Trigger.** What I asked / what data was present.
**Diagnosis.** Why it happened.
**Fix.** Prompt change / schema change / new procedural rule. Cite the
file and line if applicable.
**Eval.** Path to the fixture that now catches this regression.
```

## Entries

<!-- First entry will land here as soon as the coach gets something wrong. -->
