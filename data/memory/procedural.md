# Procedural memory

Hard rules. The Coach treats these as system-prompt-level constraints.

Format: `- [proc_<n>] (<source>, <date>) <rule text>`

Sources: `user-explicit` | `user-implicit` | `agent-default`.

<!-- Default rules below; user rules will be appended as set. -->

- [proc_001] (agent-default, 2026-05-10) Always ask before changing the plan.
- [proc_002] (agent-default, 2026-05-10) Don't invent numbers — if a metric isn't in the data, speak qualitatively.
- [proc_003] (agent-default, 2026-05-10) Procedural rules win over semantic claims; semantic claims win over inferred patterns.
