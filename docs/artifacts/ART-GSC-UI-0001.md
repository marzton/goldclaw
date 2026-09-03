# ART-GSC-UI-0001 — Cortex Operating Console (design artifact)

**Version:** v1 — accepted
**Task:** GSC-0003 (visual Cortex preview shell), Phase A
**Owner/author:** Claude Code — UX/UI concept + information architecture
**Date:** 2026-09-03

## What this is

The first registered visual-design artifact for the GS Cortex operating
console, per `docs/CAPABILITIES.md`'s and the visual-interface brief's
Phase A requirement ("design artifact and UI shell" before implementation).
This is a **design concept, not a live deployment** — no code from this
artifact has been deployed to `cortex.goldshore.ai` or
`preview.cortex.goldshore.ai`, and no production infrastructure was touched
to produce it.

**Rendered concept:** https://claude.ai/code/artifact/be1bdf55-2034-4dae-a32a-3404ee1e297a

## Scope covered

Per the brief's first-panel list, this v1 mockup covers:

- **Attention / Approvals** — the console's primary question ("what needs
  the user"), rendered as a severity-striped action list (critical /
  warning), each row carrying task ID, requesting agent, and an explicit
  approve/review action. No implicit auto-approval affordance exists in the
  design — every row requires a deliberate action.
- **Projects** — Gold Shore, GearSwipe, Cortex Preview, Risk Radar,
  Personal/Admin, each with a canon-status pill (`on canon` / `phase A` /
  `verify`) rather than a binary healthy/unhealthy state, so drift is
  visible without being alarming.
- **Agents** — Codex, Claude Code, Gemini, ChatGPT, with a status dot
  (busy/idle/blocked), current task, and elapsed time — answers "what is
  happening" per-agent instead of only at the project level.
- **Environments & Drift** — local/preview/production rows with commit SHA
  and artifact version columns, and an explicit drift flag on the
  production row (since this artifact predates any Phase C deploy) — this
  is the one required "local/GitHub/preview drift example" from the
  acceptance criteria.
- **Credentials Metadata** — provider, identity, scope class, environment,
  and secret-reference location, with Reauthorize/Reduce-scope/Revoke
  actions. No secret values appear anywhere in the design, matching the
  canon's secrets rule.
- **Artifacts** — a registry row for this artifact itself
  (`ART-GSC-UI-0001` · v1 · accepted), establishing the pattern that every
  future artifact gets one row here.
- **Ask Cortex** — a conversational input with the brief's example
  commands as suggestion chips.

Not yet designed in this pass (left for a future artifact version): Tasks
detail view, CLAW Nodes detail view, Events log, and mobile/narrow
breakpoint beyond the two-column collapse already in the CSS.

## Design plan

- **Color** — deep graphite-blue ground (`#12161c`) and panel
  (`#1a212a`/`#1f2731`) rather than pure black, so panels read as raised
  instrument-panel surfaces, not flat cards. Accent is a literal brass/gold
  (`#c99a4b`) — a deliberate nod to "Gold Shore" rather than a generic
  SaaS blue or the terracotta/acid-green defaults called out as
  AI-generated tells. Semantic color is kept separate from the accent:
  sage (`#6fa98a`) for healthy/live, ochre (`#d9a441`) for watch/warn,
  rust (`#c1573d`) for critical/drift.
- **Type** — "Fraunces" (a serif with real personality) for the page name,
  panel numerals, and section-defining moments — evoking the "canon /
  registry / ledger" register the brief's language uses. "IBM Plex Sans"
  for all operating UI text. "IBM Plex Mono" for anything that is data:
  commit SHAs, task IDs, timestamps, artifact IDs — tabular figures throughout.
- **Layout** — a fixed left rail (console navigation across the brief's
  panel list, with live counts) plus a right-hand dashboard: a
  three-question status strip (What needs the user / What is alive / What
  is happening) above a two-column panel grid, collapsing to one column
  under 980px. Repeated row types (attention rows, project rows, agent
  rows, credential rows) share identical edge/padding/baseline rules so the
  panels read as one system rather than assorted card styles.

Both light and dark themes are implemented via CSS custom properties keyed
off `prefers-color-scheme` and an explicit `data-theme` override, per the
brief's authenticated-console requirement to work across surfaces/devices.

## Acceptance criteria status (against the visual-interface brief)

| Criterion | Status |
|---|---|
| Authenticated preview URL loads | N/A at this phase — this is the design artifact, not the deployed shell |
| Shows projects/tasks/agents/environments/properties from seeded data | ✅ shown with realistic seed data drawn from `docs/repo-index.md` and the property inventory |
| Displays explicit approval queue | ✅ Attention & Approvals panel |
| Displays runtime capability differences instead of model-wide assumptions | ✅ Agents panel shows per-agent status/task rather than a single "AI" status |
| Credential metadata without secret values | ✅ Credentials Metadata panel |
| One local/GitHub/preview drift example | ✅ Environments & Drift table, production row |
| Ask Cortex input surface | ✅ present, tied to example commands from the brief (simulated, not wired to state) |
| Mobile and laptop layouts usable | ✅ two-column grid collapses to one column under 980px |
| Preview changes isolated from production | ✅ nothing in this artifact touches deployed infrastructure |

## Next steps / recommended next agent

- **Codex** — implementation owner for Phase B/C: turn the accepted
  layout/tokens above into the actual Worker/app shell (per
  `docs/architecture-sop.md` conventions) once a structured ledger (D1) and
  provider registry exist to back these panels with real data instead of
  seed data. Do not reinterpret the accepted layout — treat this artifact
  as the source of truth for IA/visual design.
- **Gemini** — review the Credentials Metadata panel's Google-specific rows
  once OAuth client cleanup / property inventory (GSC-0002) is further
  along, to confirm the field set (identity/scope/environment/secret
  reference) matches what Google-side auditing actually needs to show.

## Handoff record

```yaml
task_id: GSC-0003
objective: >
  Produce the first registered Cortex UI design artifact (Phase A of the
  visual Cortex preview shell) per the visual-interface brief, without
  touching production infrastructure.
project: goldclaw
repo: marzton/goldclaw
path: docs/artifacts/ART-GSC-UI-0001.md
environment: local
branch: claude/cortex-setup-state-p6i4c4
completed:
  - "Read GS Cortex Bootstrap Canon, Runtime Bootstrap Prompt, Agent Role Prompts, External Property Inventory, and Visual Interface & Preview Architecture Brief (uploaded documents)."
  - "Authored ART-GSC-UI-0001-v1, the Cortex Operating Console design concept, as a Claude Artifact."
  - "Registered the artifact and its acceptance-criteria status in this document."
remaining:
  - "Tasks and CLAW Nodes detail views, Events log — not yet designed."
  - "Phase B (structured ledger + provider registry) and Phase C (GitHub/Cloudflare read integrations) implementation."
tests: "None — design artifact only, no code shipped."
evidence: "https://claude.ai/code/artifact/be1bdf55-2034-4dae-a32a-3404ee1e297a"
blockers:
  - "None for Phase A. Phase B needs a decision on the structured ledger (D1 is the current lowest-friction candidate per the property inventory)."
decisions:
  - "Accent color chosen as literal brass/gold rather than generic SaaS blue or AI-cliché terracotta/acid-green, to tie the console visually to 'Gold Shore'."
  - "Semantic status color (sage/ochre/rust) kept distinct from the brass accent so urgency signals don't compete with brand color."
artifacts:
  - "ART-GSC-UI-0001-v1 (accepted)"
approval_required: "None — this is a design artifact within authorized preview/documentation scope, no production action taken."
recommended_next_capability: "Cloudflare D1 preview write (for Phase B ledger); GitHub read (for Phase C environment/drift wiring)"
recommended_next_agent: "Codex — implementation owner for Phase B/C"
```
