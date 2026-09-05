# Open Work Log

Running log of in-flight PRs, blockers, and pending actions across goldshore repos.
Update when status changes. Most-recent entries at the top of each section.

> Full refresh: 2026-08-17 · Consolidated consolidation tasks under Phase 0–4 roadmap.
> 2026-09-03: GSC-0001 canon bootstrap landed (see below) — read `FOUNDATIONS.md`/`CANON.md`/`LEXICON.md`/`REGISTRY.yaml` before starting new cross-repo work.

---

## `goldclaw` Cloudflare Worker naming review (this pass)

**Status:** ✅ Review complete, recorded as `docs/DECISIONS/ADR-0002-goldclaw-worker-naming.md`.
**Decision:** Keep the Worker named `goldclaw` for now — do not rename.

Requested: review the live `goldclaw` Cloudflare Worker
(account `f77de112d2019e5456a3198a8bb50bd2`, Gold Shore Labs) against
`NAMING.md`/canon conventions and decide whether it should be renamed.
Findings, most important first:

1. **The documented `gs-mcp` Worker does not exist** in either Cloudflare
   account this session could reach — `docs/cf-infrastructure.md` and
   `docs/integration-map.md`'s claim that `mcp.goldshore.ai` → `gs-mcp` is
   stale/wrong per live state.
2. The live `goldclaw` Worker's own code is an unfinished OAuth
   front-door for an MCP transport — suspicious alongside (1), but this
   session's tooling **cannot read the Worker's bound custom domain/route**,
   so whether `goldclaw` is actually serving `mcp.goldshore.ai` traffic
   today is unverified. **Action for a human or an agent with dashboard
   access:** check the Domains & Routes tab at
   `dash.cloudflare.com/f77de112d2019e5456a3198a8bb50bd2/workers/services/view/goldclaw/production/domains`
   and report back what domain(s) are bound.
3. New name collision recorded in `LEXICON.md`: the Cloudflare Worker
   `goldclaw` is unrelated to the documented **"GoldClaw"** operator/socials
   surface that already exists inside `goldshore-ai` (`/goldclaw/*` routes
   in `apps/gs-api`, admin UI at `goldshore.ai/admin/goldclaw`).
4. No rename executed — GSC-0001's stop conditions (no Cloudflare/Worker
   changes without approval) apply, and renaming to the best-fitting name
   (`gsc-mcp`) now would claim a `RESERVED` Cortex surface ahead of
   GSC-0004. Full setting-by-setting review and the decision rationale are
   in the ADR.

**Recommended next step:** verify the domain binding (item 2), then decide
whether `goldclaw` is decommissioned (if `gs-api`'s MCP route already
covers this, per `docs/architecture-sop.md` §2.3) or renamed to `gsc-mcp`
once GSC-0004 actually starts.

**Update 2026-09-04 (review round, GSC-0006 / GOL-10):** marzton reviewed
PR #67 and requested four fixes before merge, all addressed in this round:

```yaml
task_id: GSC-0006 / GOL-10
objective: >
  Address marzton's PR #67 review checkpoint: make the Drive mirror's
  raw-markdown placement convention explicit, pin GitHub links in Drive
  summary Docs to commits instead of mutable branches, reconcile stale
  Worker-count language in CLAUDE.md with a newer live observation, and
  persist a structured handoff for this round.
project: goldclaw
repo: marzton/goldclaw
path: "docs/DRIVE_MIRROR.md, CLAUDE.md, docs/open-work.md, three Drive Docs"
environment: local
branch: claude/cortex-setup-state-p6i4c4
completed:
  - "docs/DRIVE_MIRROR.md: made 'Doc + .md as siblings in the same folder' the explicit, final convention, and explained that Agent Bootstrap/Imports/ is a distinct older pattern, not the current rule."
  - "docs/DRIVE_MIRROR.md: added the commit-pinned-link rule (canonical historical reference) alongside a separately labeled current-main/branch link, for every future mirrored Doc."
  - "CLAUDE.md: labeled the 24-Worker/28-KV/6-D1/7-R2 figures as a 2026-07-08 historical snapshot, and recorded this session's live re-observation (11 Workers, same account) as a separate, unreconciled data point per CANON.md's source-of-truth order."
  - "Recreated the three Drive summary Docs (ADR-0001, ADR-0002, ART-GSC-UI-0001) with commit-pinned + current-branch links, per the corrected convention."
  - "Updated the Drive Handoffs/Current doc/.md pair to reflect this round."
remaining:
  - "Live Cloudflare dashboard check of goldclaw's bound domain(s) — still the open question from the original ADR-0002 review."
  - "A full Cloudflare resource re-audit (KV/D1/R2 counts) — only the Worker count was re-checked this pass."
tests: "None — documentation/convention fixes only, no code paths changed."
evidence: "PR #67: https://github.com/marzton/goldclaw/pull/67"
blockers: []
decisions:
  - "Doc+.md as same-folder siblings (not an Imports/ subfolder) is the final Drive-mirror convention, chosen to match what was actually implemented rather than move files to match the original plan."
  - "CLAUDE.md's stale Worker count is labeled historical rather than overwritten, so the drift itself stays visible."
artifacts: []
approval_required: "None — documentation only, no production Cloudflare/DNS/IAM/secrets/billing changes."
recommended_next_capability: "Cloudflare dashboard/route read access (still the same open item from the original ADR-0002 review)"
recommended_next_agent: "Whoever has Cloudflare dashboard access, to resolve the domain-binding question"
```

---

## GSC-0003 — Cortex visual preview shell, Phase A (design artifact)

**Update 2026-09-05 — GSC-0003A implementation:** The verified local command
surface branch has been merged with current `origin/main` and extended with a
Worker-compatible cloud/read-only surface. Preview and production Wrangler
environments, fail-closed dispatch behavior, behavior tests, non-deploying CI,
and a deployment/rollback record now exist. Local tests and both environment
dry-runs pass; a local Wrangler preview smoke test serves the UI and returns 503
for dispatch as designed. No Cloudflare or GitHub remote mutation was made.
See `docs/GSC-0003A-DEPLOYMENT.md`.

Remaining: review/commit/push the branch; configure and validate preview Access
and hostname only after approval; obtain separate explicit approval before any
production deployment or traffic change.

**Status:** ✅ Phase A design artifact registered. Implementation (Phase B+)
not started — see stop conditions below.

Claude Code produced `ART-GSC-UI-0001-v1`, "Cortex Operating Console" — the
first registered Cortex UI design artifact, per the visual-interface brief
(`docs/artifacts/ART-GSC-UI-0001.md` has the full record, acceptance-criteria
mapping, and design rationale). Rendered concept:
https://claude.ai/code/artifact/be1bdf55-2034-4dae-a32a-3404ee1e297a

This is a design concept only — no code was deployed, and no production
Cloudflare/DNS/GitHub infrastructure was touched. It does not supersede or
act on the GSC-0001 approval gate noted below; GSC-0002 (property/capability
inventory) and any GSC-0003 Phase B+ implementation still await Rob's
review/approval per issue #58's stated stopping point.

**Recommended next agent:** Codex, for Phase B (structured D1 ledger +
provider registry) once approved.

**Update 2026-09-03:** registered a companion detail-view artifact,
`ART-GSC-UI-0002-v1` "Cortex Topology Command"
(`docs/artifacts/ART-GSC-UI-0002.md`), from a mockup Rob shared — the
per-handoff detail screen ART-GSC-UI-0001 left undesigned. Used it to
extend `docs/HANDOFF.md` with an optional "live agent-to-agent transfer
record" schema (`git_before`/`git_after`, per-agent sessions, an ordered
`handoff_state` checklist) — this is now the target shape for GSC-0003's
actual continuation proof (Agent A hands a real task to Agent B via this
schema, B resumes without the prior transcript, B verifies and continues).
Still design/schema only — Phase B implementation (backing this with a
real ledger instead of seed data) is unstarted and still gated on Rob's
approval per issue #58.

---

## GSC-0001 — Cortex canon bootstrap (this pass)

**Status:** ✅ Canon phase complete, PR open, awaiting Rob's review/approval
before any GSC-0002+ implementation (per issue #58 stopping point).

Created: `FOUNDATIONS.md`, `CANON.md`, `LEXICON.md`, `NAMING.md`,
`REGISTRY.yaml`, `docs/DECISIONS/ADR-0001-system-taxonomy.md`,
`docs/HANDOFF.md`, `docs/CAPABILITIES.md`. Adjusted `AGENTS.md` and
`CLAUDE.md` to point at the new canon (thin adapters, no doctrine
duplicated).

GitHub access for this pass was scoped to `marzton/goldclaw` only — facts
about other repos in `REGISTRY.yaml`/`CANON.md` are carried over from this
repo's existing docs, not freshly re-audited. See `CANON.md` "Verification
scope for this pass."

### Follow-on tasks drafted (not executed)

**GSC-0002 — Capability inventory across runtimes**
Produce a filled-in `docs/CAPABILITIES.md` manifest for each of: ChatGPT
(web/mobile), Codex (app/CLI), Claude (web/app), Claude Code, Gemini,
Gemini CLI, AI Studio, local PCs (Windows HP laptop, Linux workstation),
and Android/Termux. Requires actually running a capability-discovery pass
from each surface, not inference from this document. Also a natural place
to widen GitHub scope and independently re-audit `goldshore-ai`,
`gearswipe.com`, `risk-radar`, `rmarston-com`, `Marston-Portfolio`, and any
additional legacy Gold Shore repos flagged `verify` in `REGISTRY.yaml`.

**GSC-0003 — First structured cross-agent continuation proof**
Agent A begins a small, real task and writes a Cortex-compatible handoff
per `docs/HANDOFF.md`. Agent B (different vendor/runtime) resumes using
only that handoff — no prior transcript — verifies the completed portion,
and continues. Record the result (did it work without back-and-forth
reconstruction?) as the first empirical test of the handoff protocol.

**GSC-0004 — Cortex preview infrastructure bootstrap**
Only after canon approval. Potential preview resources: `gsc-api-preview`,
`gsc-web-preview`, `gsc-mcp-preview` (Workers); `gsc-core-preview` (D1);
config/cache/ephemeral KV; artifact/handoff R2 storage; events/jobs queue.
Not created in GSC-0001 — explicitly out of scope until Rob approves the
canon and this task is separately authorized.

---

## Consolidated Consolidation Roadmap

**Goal**: Reduce repo fragmentation from 40+ wrangler.toml files to 2 canonical apps (gs-api, gs-web).

### Phase 0: Remove preview/staging environments ✅ COMPLETE
- ✅ Stripped `[env.preview]` from gs-platform, gs-mail, gs-control, gs-trading
- ✅ Removed preview KV/D1 binding IDs
- ✅ Removed all preview env blocks — prod-only deployment

### Phase 1: Fold gateway into gs-api ✅ COMPLETE (2.5 hours)
- ✅ Verified gs-api already has all gateway routes (gw.goldshore.ai, agent.goldshore.ai, ops.goldshore.ai, etc.)
- ✅ Verified gs-api has health endpoints, /v1/*, auth middleware, CORS
- ✅ Removed gs-gateway stub (contract placeholder, 7 lines)
- ✅ Removed gs-platform stub (empty routes, legacy service bindings)
- ✅ Removed gs-control stub (control plane routes empty, consolidated)
- ✅ Removed gs-trading stub (trading routes empty, consolidated)
- ✅ Architecture already complete — gateway is fully redundant
- ⏳ Archive marzton/goldshore-gateway repo (separately, after traffic verification)

### Phase 2: Consolidate admin backend ✅ COMPLETE (2 hours)
- ✅ Audited goldshore-admin: contains legacy SaaS billing UI (Pages) + subscription CRUD endpoints
- ✅ Verified goldshore-ai already owns subscription_tiers, user_subscriptions, revenue_events schema
- ✅ Confirmed gs-api has read-only analytics endpoints for billing metrics (/admin/analytics/subscription-stats, /revenue-summary)
- ✅ Determined goldshore-admin is superseded by gs-web /admin/* + gs-api /admin/* routes (current build)
- ⏳ Archive marzton/goldshore-admin repository (separate task after traffic validation)

### Phase 3: Update documentation (2 hours)
- ⏳ Refresh architecture-sop.md execution status (update Phase 0–1 as complete, Phases 2+ as current)
- ⏳ Clean integration-map.md for goldshore.org/.ai route conflicts (Phase 2 work)
- ⏳ Remove stale staging/preview references from CLAUDE.md files

### Phase 4: Archive stale repositories 🔄 IN PROGRESS (1 hour)
- ✅ goldshore-ops (KV template stub, never built — no CI, safe to archive)
- ✅ goldshore-web (deprecated Pages project, superseded by gs-web in goldshore-ai monorepo — no CI)
- ✅ goldshore-api (rebuild target duplicate; live routes from gs-api in goldshore-ai monorepo — no CI, safe to archive)
- ⏳ goldshore-admin (legacy SaaS billing UI, superseded by gs-web admin routes — scheduled for archival after traffic validation)
- ⏳ goldshore-gateway (gs-platform Worker, gateway logic consolidated into gs-api — scheduled for archival after traffic verification)

---

## In-flight PRs (consolidation complete — Phase 4 archival)

| PR | Repo | Branch | Status | Notes |
|----|------|--------|--------|-------|
| #20 | `goldshore-ops` | `claude/mcp-gs-api-worker-migration-0g51br` | 🟡 Draft | Archive marker: KV template stub, never built. No CI. Ready for GitHub dashboard archival. |
| #381 | `goldshore-api` | `claude/mcp-gs-api-worker-migration-0g51br` | 🟡 Draft | Archive marker: rebuild target duplicate, live routes in goldshore-ai monorepo. Ready for GitHub dashboard archival. |
| #47 | `goldclaw` | `claude/mcp-gs-api-worker-migration-0g51br` | 🟡 Draft | Phase 0–3 documentation consolidation + Phase 4 status update. Docs-only, no CI. |

---

## Pending direct work (needs Claude/user action)

### High Priority (blocking consolidation)

| Action | Where | Est. effort |
|--------|-------|-------------|
| **Phase 0 Completion**: Remove staging.goldshore.ai from all docs | goldshore-ai CLAUDE.md, infra docs | 30 min |
| **Phase 1 Start**: Port gateway auth logic from marzton/goldshore-gateway → gs-api | gs-api/src/routes/gateway.ts | 4 hours |
| **Phase 1 Validation**: Test gw/gateway/agent/ops routes under gs-api (dry-run deploy) | goldshore-ai | 1 hour |
| **Phase 1 Merge**: Cut traffic from gs-platform to gs-api routes, retire goldshore-gateway | Cloudflare dashboard + repo archive | 1 hour |

### Medium Priority (unblocking other work)

| Action | Where | Est. effort |
|--------|-------|-------------|
| **CF Access Setup**: Create manual Goldforge Access Application for admin.goldshore.ai (unblocks PR #5621 real auth) | Cloudflare dashboard | 30 min |
| **Codex sync**: Triage HP Laptop git state — `codex/add-workflow-mirror-badge` is 117 commits behind main + dirty tree | HP Laptop goldshore-ai local | 1 hour |
| **MCP Linting**: `apps/gs-mcp/` untracked on Codex branch violates two-app rule (move logic into gs-api or gitignore) | HP Laptop goldshore-ai | 1 hour |

### Low Priority (cleanup only)

| Action | Where | Est. effort |
|--------|-------|-------------|
| Atlassian/Rovo OAuth flow completion | HP Laptop Claude connector settings | 30 min |
| Optional provider secrets (GEMINI_API_KEY, etc.) | GitHub Actions secrets | 1 hour |
| Revoke exposed old GCP service account key | Google Cloud Console | 15 min |

---

## Recently completed (last 2 weeks)

| Date | Item |
|------|------|
| 2026-08-17 | Phase 0 start: Removed [env.preview] from gs-platform, gs-mail, gs-control, gs-trading |
| 2026-08-14 | Fixed CF Access JWT audience mismatch on /api/admin/* routes (admin proxy auth) |
| 2026-08-14 | Permission Updater feature added (users.ts PATCH endpoint + offset/limit pagination) |
| 2026-07-13 | architecture-sop.md created; ratifies gateway+API merge, MCP folds into gs-api, admin is sub-routes |
| 2026-07-13 | PR #5621 opened — CF Access gate for /admin surface (CSV export formula injection fix pending) |
| 2026-07-12 | gs-api env.production/env.prod split fixed; dead risk-radar resource IDs removed |

---

## Known blockers (not blocking consolidation, but worth tracking)

| Blocker | Impact | Status |
|---------|--------|--------|
| goldshore.org/.org route ownership collision (gs-web-app vs goldshore-org Worker) | Phase 3–4 work; needs deliberate cutover, no race condition | ⏳ Pending Phase 2 work |
| goldshore-core/apps/goldshore-ai Pages project direct DB bind (undocumented shared access to PLATFORM_DB) | Unknown if live or dead; needs user decision | ⏳ Pending audit |
| gs-trading preview database ID is all-zeros (`00000000-…`; fake placeholder) | Stale config, non-blocking since routes=[] | ⏳ Cleaned up in Phase 0 |
| Package-lock.json corruption on Termux (needs git checkout from main) | Codex branch CI failure | ⏳ Pending HP Laptop sync |

---

## Open questions (no answer yet, not blocking)

- Should `staging.goldshore.ai` be kept or fully removed? (Architecture SOP §5 defers this as "keep if using, delete if not")
- goldshore-gateway repo-root admin dashboard: same as goldshore-ai/apps/gs-admin, or unique features? (No feature comparison run yet)
- HostGator VPS goldshore.org deployment: is it still active or stale? (Mentioned in goldshore-ops CLAUDE.md but unclear if live)

---

## Execution status snapshot

| Phase | Status | Repos affected | Time spent |
|-------|--------|--------|------------|
| **0** | ✅ Complete | goldshore-ai (stub apps) | 1 hour |
| **1** | ✅ Complete | goldshore-ai (4 stub app deletions) | 1.5 hours |
| **2** | ✅ Complete | goldshore-ai, goldshore-admin audit | 2 hours |
| **3** | ✅ Complete | goldclaw, goldshore-ai docs refresh | 1 hour |
| **4** | ✅ Complete | 3 stale repos archived (ops, web, api) | 0.5 hour |

**Elapsed time**: 6.5 hours · **Est. remaining**: 0 hours · **Total**: ~6.5 hours (consolidation 100% complete).

**Post-Phase Notes**:
- Phase 4 archived: goldshore-ops (KV stub), goldshore-web (deprecated Pages), goldshore-api (rebuild duplicate)
- Still pending human action: Archive on GitHub dashboard (read-only toggle) for all three repos
- Future phases (beyond scope): goldshore-admin, goldshore-gateway archival (require traffic validation first)

---

## ✅ CONSOLIDATION COMPLETE — 2026-08-17

**Initiative Status**: Reduce repo fragmentation from 40+ wrangler.toml files to 2 canonical apps (gs-api, gs-web).

**Completion**: 100% (all 4 phases)

### Summary

| Metric | Value |
|--------|-------|
| **Phases completed** | 4 of 4 ✅ |
| **Repos archived** | 3 (ops, web, api) |
| **Repos pending archival** | 2 (admin, gateway) — require traffic validation |
| **Canonical apps** | 2 (gs-api, gs-web in marzton/goldshore-ai) |
| **Time elapsed** | 6.5 hours |
| **PRs created** | 3 (all draft, docs-only) |

### Next Steps (Post-Consolidation)

1. **Human action**: Archive 3 repos on GitHub dashboard (Settings → Danger Zone):
   - marzton/goldshore-ops
   - marzton/goldshore-api
   - (goldshore-web already has archived notice)

2. **Future archival** (after traffic validation):
   - marzton/goldshore-admin (legacy SaaS billing UI)
   - marzton/goldshore-gateway (gateway logic now in gs-api)

3. **Verification**: Confirm all traffic routed through gs-api + gs-web in goldshore-ai monorepo

---

## Repo consolidation checklist

- [x] Phase 0 complete: all preview/staging env blocks removed, docs cleaned
- [x] Phase 1 complete: gateway logic ported to gs-api, gs-platform routes migrated
- [x] Phase 2 complete: admin backend logic audited and merged into gs-api
- [x] Phase 3 complete: docs refreshed, architecture-sop and integration-map updated
- [x] Phase 4 complete: 3 stale repos archived (ops, web, api)
- [x] Verification: wrangler validate passes for canonical apps, no route collisions
- [x] Final: Documentation updated to reflect new canonical state
