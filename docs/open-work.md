# Open Work Log

Running log of in-flight PRs, blockers, and pending actions across goldshore repos.
Update when status changes. Most-recent entries at the top of each section.

> Full refresh: 2026-08-17 · Consolidated consolidation tasks under Phase 0–4 roadmap.

---

## Consolidated Consolidation Roadmap

**Goal**: Reduce repo fragmentation from 40+ wrangler.toml files to 2 canonical apps (gs-api, gs-web).

### Phase 0: Remove preview/staging environments ✅ IN PROGRESS
- ✅ Strip `[env.preview]` from gs-platform, gs-mail, gs-control, gs-trading
- ✅ Remove preview KV/D1 binding IDs
- ⏳ Remove all staging.goldshore.ai references from docs
- ⏳ Clean up preview route stubs (gw.goldshore.ai-preview, etc. if any exist in CF dashboard)

### Phase 1: Fold gateway into gs-api (4 hours)
- ⏳ Port goldshore-gateway/goldshore-gateway/src/ auth/proxy logic → gs-api/src/routes/gateway.ts
- ⏳ Migrate gateway routes (gw.goldshore.ai, gateway.goldshore.ai, agent.goldshore.ai, ops.goldshore.ai) into gs-api's route handler
- ⏳ Remove gs-gateway, gs-platform stubs from goldshore-ai monorepo (or keep as empty templates)
- ⏳ Archive marzton/goldshore-gateway repository

### Phase 2: Consolidate admin backend (3 hours)
- ⏳ Audit goldshore-admin unique routes (if any beyond what goldshore-ai has)
- ⏳ Merge goldshore-admin routes into gs-api /admin/* + gs-web /admin/* routes
- ⏳ Archive marzton/goldshore-admin repository

### Phase 3: Update documentation (2 hours)
- ⏳ Refresh architecture-sop.md execution status (update Phase 0–1 as complete, Phases 2+ as current)
- ⏳ Clean integration-map.md for goldshore.org/.ai route conflicts (Phase 2 work)
- ⏳ Remove stale staging/preview references from CLAUDE.md files

### Phase 4: Archive stale repositories (1 hour)
- ⏳ goldshore-ops (KV template stub, never built)
- ⏳ goldshore-web (deprecated Pages project)
- ⏳ goldshore-api (verify parity with goldshore/apps/goldshore-api, then archive)

---

## In-flight PRs (active development)

| PR | Repo | Branch | Status | Notes |
|----|------|--------|--------|-------|
| #6596 | `goldshore-ai` | `claude/mcp-gs-api-worker-migration-0g51br` | 🟢 CI passing, waiting review | Auth middleware fix for admin proxy + Permission Updater feature; all 145 tests pass |
| #6 | `goldclaw` | `claude/goldshore-infrastructure-integration-ywmxlt` | 🟡 Draft | architecture-sop.md ratifying target architecture; docs-only, no CI. Ready to merge once Phase 0 complete. |

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

| Phase | Status | Repos affected |
|-------|--------|--------|
| **0** | 🟢 In progress | goldshore-ai (stub apps) |
| **1** | ⏳ Queued (4h) | goldshore-ai, goldshore-gateway |
| **2** | ⏳ Queued (3h) | goldshore-ai, goldshore-admin |
| **3** | ⏳ Queued (2h) | goldclaw, goldshore-ai docs |
| **4** | ⏳ Queued (1h) | 4 stale repos (ops, web, api, admin) |

**Total time to consolidation**: ~11 hours elapsed time (can overlap most phases).

---

## Repo consolidation checklist

- [ ] Phase 0 complete: all preview/staging env blocks removed, docs cleaned
- [ ] Phase 1 complete: gateway logic ported to gs-api, gs-platform routes migrated
- [ ] Phase 2 complete: admin backend logic audited and merged into gs-api
- [ ] Phase 3 complete: docs refreshed, architecture-sop and integration-map updated
- [ ] Phase 4 complete: 4 stale repos archived (ops, web, api, admin)
- [ ] Verification: wrangler validate passes for all canonical apps, no route collisions
- [ ] Final: Update this file and goldclaw/CLAUDE.md to reflect new canonical state
