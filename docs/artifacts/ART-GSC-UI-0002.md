# ART-GSC-UI-0002 — Cortex Topology Command (design artifact)

**Version:** v1 — accepted
**Task:** GSC-0003 (first structured cross-agent continuation proof), detail view
**Owner/author:** Rob — concept mockup, described and registered by Claude Code
**Date:** 2026-09-03

## What this is

A companion design concept to `ART-GSC-UI-0001` (Cortex Operating Console).
Where ART-GSC-UI-0001 is the console's dashboard-level view (projects,
agents, environments, approvals at a glance), this artifact is the
**detail view for one live agent-to-agent handoff** — exactly the "Tasks
detail view" ART-GSC-UI-0001 left undesigned. It is a **design concept
only**; no code from this artifact has been built or deployed.

Source: a mockup image Rob shared directly in-session (not a hosted URL).
Described here in full so the concept survives independent of that one
chat transcript, per `FOUNDATIONS.md`'s "agents may forget, Cortex may
not" rule.

## What it shows

Titled "Cortex — Topology Command," with a status bar reading "Gateway
online" and a live UTC clock.

**Left column — topology graph**, top to bottom:
- A `Goldclaw` repository node, feeding down into three branch nodes
  (`main`, `develop`, `feature/cortex-cmd`) on the right and into three
  doc/schema file nodes (`architecture.md`, `runbooks/ops.md`,
  `schemas/*.json`) on the left.
- Below it, a task node `GSC-0003A · "Task · Vertical slice"`, wired to a
  `CLAW-HP` device node on its left (with `telemetry.stream`,
  `sys.metrics`, `health.ping` feeds) and to three context file nodes on
  its right (`context/mission.txt`, `security/policy.md`,
  `interfaces/api.yaml`).
- Below that, two agent nodes side by side — `Codex` and `Claude Code`
  (labeled `CC`) — each wired to its own tool/skill nodes (Codex:
  `skills/refactor.py`, `plugins/lint`, `tools/ast-grep`; Claude Code:
  `skills/code-review.md`, `plugins/semgrep`, `tools/unit-test`), and
  connected to each other by a horizontal "HANDOFF · COMPLETE" edge
  carrying the transfer timestamp.

This is a literal graph rendering of a handoff's dependency shape: which
repo/branch, which files were in context, which device executed it, which
agent-specific tools were available on each side — answering "what did
each agent actually have access to" for a transfer, not just "who did it."

**Center-bottom — live transfer log**, a terminal-style scrolling panel
showing the handoff play-by-play with per-line timestamps and agent
labels, e.g.:

```
14:22:08  Codex   > Preparing handoff package
14:22:09  Codex   > Creating archive: /tmp/cortex-handoff-7f2a.tgz
14:22:09  Codex   > Manifest: handoff.json (7.2 KB)
14:22:09  Codex   > Checksums: OK
14:22:10  Codex   > Transferring to Claude Code
14:22:10  Claude  > Received archive (512.4 KB)
14:22:10  Claude  > Verifying checksums
14:22:10  Claude  > Extracted to /workspace/.handoffs/7f2a
14:22:10  Claude  > Handoff accepted
14:22:10  System  > Handoff complete
```

This is the audit trail that makes a handoff verifiable after the fact,
not just at the moment it happens — checksums and an explicit accept step,
not an implicit "the next message showed up so it must have worked."

**Bottom command bar** — five dropdowns (Repository, Task, Device, Agent,
Context — the last a multi-select chip list of files) feeding a free-text
command composer with `/` for commands, `@` to mention, `#` for contexts,
and a character counter. Action buttons: **Dispatch** (Ctrl+Enter, primary
brass accent), **Stop** (Esc), **Continue** (Ctrl+K), and **Claude Review**
(Ctrl+R) — i.e., this is not read-only telemetry, it is an operating
console a human drives a handoff *from*.

**Right panel — "Selected run" inspector**, the structured record behind
the graph/log, showing exactly the fields captured in `docs/HANDOFF.md`'s
new "live agent-to-agent transfer record" extension: run ID, task ID,
started/completed timestamps and duration, status; a **Git before** block
(repo/branch/commit/author/time) and a **Git after** block (same, plus a
`+12 -1` change count and commit message); a **Session** block (per-agent
session IDs, each copyable); and a **Handoff state** checklist — package
created → transferred → verified → accepted → now executing — each row
green-checked with its own timestamp, the last row (`now executing`) shown
still in progress.

## Why this maps directly onto GSC-0003

GSC-0003 is specifically "Agent A begins a task, writes a Cortex-compatible
handoff, Agent B resumes using only that handoff, verifies the completed
portion, and continues" (`docs/open-work.md`). This mockup is that exact
scenario as a UI: Codex hands `GSC-0003A` to Claude Code, the graph shows
what context/tools each side had, the log shows the transfer mechanics
(archive, checksum, verify, accept), and the inspector panel is a literal
rendering of the handoff record schema. It is the strongest available
argument for the specific field set added to `docs/HANDOFF.md` in this
pass — the mockup was designed (independently) around the same fields the
canon already required, which is a good sign the schema is right rather
than arbitrary.

## Not yet designed (left for a future version or Phase B+)

- What the graph renders when a handoff fails partway (`handoff_state`
  extension's `failed` status) — no error/rollback state shown in v1.
- Multi-hop handoffs (A → B → C) — v1 shows exactly two agent nodes.
- How `CLAW-HP` device telemetry (`sys.metrics`, `health.ping`) actually
  gets sourced — no live data source wired, per Phase A being concept-only.

## Next steps / recommended next agent

- **Codex** — once GSC-0003's Phase B (structured ledger) exists per
  ART-GSC-UI-0001's handoff, this detail view is the natural second screen
  to implement after the console dashboard, backed by real
  `handoff_state`/`git_before`/`git_after` rows instead of seed data.
- No implementation authorized in this pass — canon/design registration
  only, consistent with the GSC-0001 stopping point pending Rob's approval.

## Handoff record

```yaml
task_id: GSC-0003
objective: >
  Register the "Cortex Topology Command" mockup as a companion design
  artifact to ART-GSC-UI-0001, and use it to extend docs/HANDOFF.md with a
  live agent-to-agent transfer record schema (git before/after, sessions,
  ordered handoff-state checklist) — the target shape for GSC-0003's
  cross-agent continuation proof.
project: goldclaw
repo: marzton/goldclaw
path: docs/artifacts/ART-GSC-UI-0002.md
environment: local
branch: docs/gsc-0003-handoff-spec
completed:
  - "Described and registered ART-GSC-UI-0002-v1 (Cortex Topology Command) from Rob's shared mockup."
  - "Extended docs/HANDOFF.md with the live agent-to-agent transfer record extension, matching the mockup's field set."
remaining:
  - "GSC-0003 Phase B: implement this detail view backed by a real ledger, once ART-GSC-UI-0001's Phase B lands."
  - "Design the failed/multi-hop states this v1 mockup doesn't cover."
tests: "None — documentation/design-artifact-only change."
evidence: "Mockup image shared in-session (not separately hosted); full description in this file."
blockers: []
decisions:
  - "Treated the mockup as informing/validating the handoff schema rather than replacing docs/HANDOFF.md's required-fields form — the mockup's fields are additive, for live transfers specifically."
artifacts:
  - "ART-GSC-UI-0002-v1 (accepted)"
approval_required: "None — design registration only, no production action taken."
recommended_next_capability: "None beyond what this session already has; Phase B implementation will need Cloudflare D1 preview write."
recommended_next_agent: "Codex — implementation owner once Phase B ledger work begins."
```
