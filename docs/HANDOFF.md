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
