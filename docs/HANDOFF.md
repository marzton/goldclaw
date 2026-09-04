# HANDOFF.md — Cross-Agent Handoff Protocol

The next agent must NOT need the previous agent's full conversation
transcript. This document defines what a handoff record must contain to
make that true, and where to put one until a real Cortex service exists.

## Where handoff records live today (pre-Cortex)

There is no Cortex service yet (see `CANON.md`). Until GSC-0004 or later,
persist handoffs as:

1. A structured section in `docs/open-work.md` (this repo), for
   cross-repo/ops-level handoffs, **or**
2. A GitHub issue/PR description or comment in the relevant repo, for
   task-scoped handoffs, **or**
3. A comment on the originating GitHub issue for the task ID.

Use whichever the receiving agent is most likely to check first for that
task. When in doubt, put it in `docs/open-work.md` and link to it from the
issue/PR.

## Required fields

Every handoff should minimally persist:

```yaml
task_id: GSC-0001            # stable ID, see NAMING.md
objective: >
  One or two sentences: what this task is trying to accomplish.
project: goldclaw             # which project/scope this belongs to
repo: marzton/goldclaw
path: /                       # relevant subdirectory, if narrower than repo root
environment: local            # local | preview | staging | prod
branch: claude/gsc-bootstrap-foundation-8uji3d
commit: <sha>                 # HEAD commit this handoff describes
completed:
  - "What was actually finished, as a checklist"
remaining:
  - "What is left, as a checklist"
tests: "What was run to verify `completed`, and its result"
evidence: "Links: PR URL, CI run URL, screenshot, command output"
blockers:
  - "Anything stopping progress, and what would unblock it"
decisions:
  - "Any nontrivial choice made and why, if not already in an ADR"
artifacts:
  - "ART-<PREFIX>-#### references, if any design/spec artifacts are involved"
approval_required: "What needs Rob's explicit sign-off before proceeding, if anything (see docs/CAPABILITIES.md and the approval model in FOUNDATIONS.md)"
recommended_next_capability: "e.g. 'Cloudflare wrangler preview write', 'Google Drive read'"
recommended_next_agent: "e.g. Codex — code review; Claude Code — implementation; Gemini — local IDE session"
```

## Example

```yaml
task_id: GSC-0001
objective: >
  Establish the canonical operating language, registry, and handoff
  protocol for Gold Shore Cortex before any implementation.
project: goldclaw
repo: marzton/goldclaw
path: /
environment: local
branch: claude/gsc-bootstrap-foundation-8uji3d
commit: <fill in at PR time>
completed:
  - "FOUNDATIONS.md, CANON.md, LEXICON.md, NAMING.md, REGISTRY.yaml created"
  - "docs/DECISIONS/ADR-0001-system-taxonomy.md created"
  - "docs/HANDOFF.md, docs/CAPABILITIES.md created"
remaining:
  - "GSC-0002: capability inventory across all runtimes/connectors"
  - "GSC-0003: first structured cross-agent continuation proof"
  - "Independent re-audit of goldshore-ai, gearswipe.com, risk-radar, rmarston-com/Marston-Portfolio manifests (this pass was goldclaw-scoped only)"
tests: "None — documentation-only change. No code/build/deploy affected."
evidence: "PR: <link>, issue: marzton/goldclaw#58"
blockers: []
decisions:
  - "See docs/DECISIONS/ADR-0001-system-taxonomy.md"
artifacts: []
approval_required: "Rob approval of the canon itself before any GSC-0002+ implementation begins, per issue #58 stopping point."
recommended_next_capability: "GitHub read access to goldshore-ai, gearswipe.com, risk-radar, rmarston-com, Marston-Portfolio for GSC-0002's audit"
recommended_next_agent: "Any agent with broadened repo access — task is read/audit, not implementation"
```

## Optional extension: live agent-to-agent transfer record

The required fields above cover a handoff written to a durable location
(`docs/open-work.md`, a PR, an issue comment) by an agent ending its turn.
A **live transfer** — one agent's runtime handing a task directly to
another agent's runtime, both active in the same session/tool (e.g. a
future Cortex console driving Codex → Claude Code) — needs a few
additional fields to be independently verifiable, not just described. This
extension is informed by the `ART-GSC-UI-0002` "Topology Command" design
concept (see `docs/artifacts/ART-GSC-UI-0002.md`) and is the target shape
for GSC-0003's continuation proof.

```yaml
run_id: run_7f2a9c1b            # unique per transfer attempt
task_id: GSC-0003A
from_agent: codex
to_agent: claude-code
started_at: "2026-09-03T14:22:08Z"
completed_at: "2026-09-03T14:22:10Z"
status: complete                # complete | failed | in_progress
git_before:
  repo: goldclaw
  branch: feature/cortex-cmd
  commit: a1c9d4e
  author: codex-bot
  time: "2026-09-03T14:21:02Z"
git_after:
  repo: goldclaw
  branch: feature/cortex-cmd
  commit: b7e3f19
  author: claude-code-bot
  time: "2026-09-03T14:22:11Z"
  changes: "+12 -1"
  message: "chore: implement cortex command surface vertical slice"
sessions:
  from_agent_session: cxs_3k8m7d9p
  to_agent_session: ccs_9n4v2q1r
handoff_state:                  # ordered checklist, each stage timestamped once reached
  - stage: package_created
    at: "2026-09-03T14:22:09Z"
  - stage: transferred
    at: "2026-09-03T14:22:10Z"
  - stage: verified
    at: "2026-09-03T14:22:10Z"
  - stage: accepted
    at: "2026-09-03T14:22:10Z"
  - stage: now_executing
    at: "2026-09-03T14:22:11Z"
```

The `git_before`/`git_after` pair is what makes a live transfer
independently checkable without trusting either agent's self-report: the
receiving agent's commit is verifiable against the sending agent's, same as
the required-fields `commit` field but split so a diff (`changes`) is
visible at the transfer boundary itself. `handoff_state` is a fixed,
ordered checklist (package created → transferred → verified → accepted →
now executing) — a transfer is not "done" until every stage before
`now_executing` has a timestamp; a stage stuck without one for longer than
the task's expected duration is the live-transfer equivalent of a stalled
CI check and should be treated as `blockers` in the required-fields sense.

This extension is additive — a handoff record satisfying the required
fields above is still a complete, valid handoff without it. Use it when the
transfer is live/tool-driven; use the required-fields-only form for a
written, asynchronous handoff (the common case today, pre-Cortex).

## Rules

- **Write the handoff before ending a session on unfinished work**, not
  just at task completion. A half-finished task with no handoff is the
  exact failure mode Cortex exists to prevent.
- **Completed work is not repeated.** If a handoff says schema work is
  done, the next agent validates it, it does not redo it from scratch.
- **Unknowns stay unknowns.** Do not fill in `blockers`/`remaining` with
  guesses to make the handoff look more complete than the work actually is.
  Use `verify` (see `CANON.md`/`REGISTRY.yaml` convention) rather than
  asserting.
- **Link, don't duplicate.** If detail already lives in an ADR, PR
  description, or `REGISTRY.yaml` entry, reference it by ID/link instead of
  re-explaining it in the handoff.
