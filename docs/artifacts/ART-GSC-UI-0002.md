# ART-GSC-UI-0002 — Cortex Topology Command (design artifact, external submission)

**Version:** v1 — proposed (not accepted; see "Status" below)
**Task:** GSC-0003 (visual Cortex preview shell)
**Source:** Supplied inline as an image in a Claude Code chat session
(2026-09-03), not authored by Claude Code. No source file (HTML/Figma/
image asset) was provided alongside it — this document is a written
record of what the image shows, not a redistributable copy of it. If the
original design file exists, attach it here (e.g. as a repo asset or a
linked Figma/artifact URL) so future agents aren't relying on a prose
description of a picture.
**Recorded by:** Claude Code, on request to "register as a new
artifact/ADR" rather than build or critique.

## What this is

A second, distinct design direction for the Cortex operating console,
alongside the already-accepted `ART-GSC-UI-0001-v1` ("Cortex Operating
Console"). Where ART-GSC-UI-0001 is an **attention/approvals-first
dashboard** (list-based panels: Attention, Projects, Agents, Environments,
Credentials, Artifacts, Ask Cortex), this submission — "Cortex — Topology
Command" — is a **graph-and-command-first console**: it visualizes the
live relationship between a repo, a task, a device (CLAW node), and the
agents working it as a node graph, with a command composer and a
per-run inspector panel, rather than a list of status rows.

## What it shows

- **Top bar:** page title, a "Gateway online" status pill, current UTC
  timestamp, and a UTC/timezone selector.
- **Topology graph (main canvas):**
  - `Goldclaw` **Repository** node (active), linked to reference files
    (`architecture.md`, `runbooks/ops.md`, `schemas/*.json`) and branch
    nodes (`main`, `develop`, `feature/cortex-cmd`).
  - `GSC-0003A` **Task · Vertical slice** node at the center, wired to the
    repository/branches above it.
  - `CLAW-HP` **Device** node to one side, linked to live telemetry
    sources (`telemetry.stream`, `sys.metrics`, `health.ping`) — this is
    the first design artifact to visualize a CLAW node as a first-class
    graph citizen with its own telemetry edges, per the CLAW concept in
    `LEXICON.md`/`ADR-0001`.
  - Context files feeding the task (`context/mission.txt`,
    `security/policy.md`, `interfaces/api.yaml`).
  - Two **Agent** nodes, `Codex` and `Claude Code`, each below the task,
    each with their own skill/tool edges (`skills/refactor.py`,
    `plugins/lint`, `tools/ast-grep` for Codex; `skills/code-review.md`,
    `plugins/semgrep`, `tools/unit-test` for Claude Code) — a direct visual
    answer to the brief's "runtime capability differences instead of
    model-wide assumptions" acceptance criterion, at the tool/skill level
    rather than just a status string.
  - A horizontal **handoff edge** between the two agent nodes, labeled
    `HANDOFF · COMPLETE` with a timestamp.
- **Event log panel** (center-bottom): a scrolling, timestamped transcript
  of the handoff itself — package prep, archive creation, checksum
  verification, transfer, receipt, extraction, acceptance, completion.
- **Command composer** (bottom bar): explicit Repository / Task / Device /
  Agent selectors, a context-chip multi-select (files attached to the next
  command), a free-text "Compose a command, plan, or directive..." input,
  and Dispatch / Stop / Continue / "Claude Review" actions with keyboard
  shortcuts (`Ctrl+Enter`, `Esc`, `Ctrl+K`, `Ctrl+R`).
- **Selected-run inspector** (right sidebar): this is the artifact's
  strongest idea. For the selected handoff run it shows Run ID, Task,
  Started/Completed/Duration/Status, then **Git before/after** blocks
  (repository, branch, commit, author, time — separately for the state
  Codex handed off from and the state Claude Code produced), a diff
  summary (`+12 -1` and the commit message), both agents' session IDs, and
  a **Handoff state checklist** (Package created → Transferred → Verified
  → Accepted → Now executing) with per-step timestamps.

## Relationship to existing canon

The "Selected run" inspector's field set is, almost verbatim, the
`docs/HANDOFF.md` required-fields schema rendered as UI: task ID,
repo/branch/commit (twice — before and after), agent/session identity,
and a discrete completion checklist stand in for that document's
`task_id`/`repo`/`branch`/`commit`/`completed`/`decisions`/evidence
fields. That is a meaningfully different — and arguably more
implementation-ready — translation of the canon into UI than
ART-GSC-UI-0001's Attention/Approvals panel attempted, which summarized
handoffs as one-line rows rather than a structured before/after record.
Any future merged design should preserve this git-before/after framing
rather than flattening it back into prose.

It also visualizes `CLAW-HP` as a graph node with real telemetry edges,
which is new: `REGISTRY.yaml`'s `CLAW-CONCEPT` entry notes "no CLAW nodes
formally registered yet" — this design assumes at least one (`CLAW-HP`,
matching the `goldshore-ai/CLAUDE.md` device map's "HP Laptop") is live
and instrumented. That's a design assumption, not a verified fact; no
telemetry pipeline for CLAW nodes exists per the current canon.

## How it relates to ART-GSC-UI-0001 (not a replacement)

These two designs answer different halves of the brief's three questions
("what is alive / what is happening / what needs the user"):

| | ART-GSC-UI-0001 (Operating Console) | ART-GSC-UI-0002 (Topology Command) |
|---|---|---|
| Primary question answered | What needs the user (approvals-first) | What is happening (live execution graph) |
| Structure | List panels (rows) | Node graph + inspector |
| Best at | Scanning many projects/agents/credentials at once | Understanding one task's actual git/agent state in depth |
| Command surface | "Ask Cortex" (conversational only) | Structured command composer with explicit repo/task/device/agent targeting, plus conversational input |
| Weak spot | Approvals row lacks the git before/after depth this design has | No visible approvals/attention queue — an urgent cross-project item has nowhere to surface |

**Recommendation:** treat these as two views/routes of the same console
rather than competing designs — an Attention-first landing view
(ART-GSC-UI-0001) with a per-task Topology/Command view
(ART-GSC-UI-0002) reachable by drilling into a task or agent row. Neither
should be marked `accepted` as *the* console design until that
relationship is explicitly decided; this document intentionally leaves
ART-GSC-UI-0001-v1's `accepted` status untouched.

## Status

**Proposed, not accepted.** Per `FOUNDATIONS.md`'s artifact-continuity
rule (at most one accepted version per artifact ID) and because this is a
different artifact ID (`ART-GSC-UI-0002`) from a different, unverified
source, this is recorded for canon continuity and future reference, not
adopted as the implementation target. No implementation work should treat
this as accepted without an explicit decision from Rob (or whoever owns
Cortex UI acceptance) — same gate as GSC-0003 Phase B+ generally.

## Open questions for whoever accepts/rejects this

- Is `Gateway online` a real health signal (of what — TANGENT? a Cortex
  API?) or a placeholder string? No such gateway exists yet per
  `CANON.md`'s "Cortex status."
- Where does live telemetry for `CLAW-HP` (`telemetry.stream`,
  `sys.metrics`, `health.ping`) actually come from? No CLAW telemetry
  pipeline is registered in `REGISTRY.yaml` today.
- Should "Claude Review" (`Ctrl+R`) in the command bar map to this
  session's own PR-review/babysitting behavior, or is it a distinct,
  simpler in-console review action? Worth resolving before Phase B, since
  the two have very different implementation costs.
- Does the command composer dispatch real work (a real Codex/Claude Code
  run) or is `Dispatch` here scoped to Cortex-internal actions only? The
  brief's authority model requires approval gates for anything
  production-affecting — this UI doesn't show one on the Dispatch action
  itself, which needs resolving before this becomes implementation-ready.

## Handoff record

```yaml
task_id: GSC-0003
objective: >
  Record an externally-submitted Cortex UI design concept ("Topology
  Command") as a registered artifact for canon continuity, compare it to
  the already-accepted ART-GSC-UI-0001, and flag open questions before any
  implementation treats it as accepted.
project: goldclaw
repo: marzton/goldclaw
path: docs/artifacts/ART-GSC-UI-0002.md
environment: local
branch: claude/cortex-setup-state-p6i4c4
completed:
  - "Described and registered the submitted design concept as ART-GSC-UI-0002-v1 (proposed)."
  - "Compared it against ART-GSC-UI-0001-v1 and docs/HANDOFF.md's field schema."
  - "Flagged open questions (gateway health signal, CLAW telemetry pipeline, Claude Review scope, dispatch approval gate) that block treating this as accepted."
remaining:
  - "A decision on whether ART-GSC-UI-0001 and ART-GSC-UI-0002 become two views of one console, or one supersedes the other."
  - "The source design file (if one exists beyond the submitted image) should be attached to this record."
tests: "None — design record only, no code shipped."
evidence: "Image supplied inline in this chat session; no external URL available to link."
blockers:
  - "No decision yet on which design (or combination) is authoritative — see 'Relationship to existing canon' and 'Open questions' above."
decisions:
  - "Did not mark this artifact accepted, since it arrived unverified (no author, no source file) and duplicating an accepted-status conflict with ART-GSC-UI-0001 would violate the single-accepted-version rule without an explicit resolution decision."
artifacts:
  - "ART-GSC-UI-0002-v1 (proposed, not accepted)"
  - "ART-GSC-UI-0001-v1 (accepted, unchanged by this record)"
approval_required: "Whether to accept either design, merge them into one, or reject this submission — needs Rob's decision, not an agent's."
recommended_next_capability: "None additional — this is a documentation-only record."
recommended_next_agent: "Claude Code or Gemini — UX critique to resolve the two-designs question once Rob indicates a preference; Codex only after that's settled."
```
